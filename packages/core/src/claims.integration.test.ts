import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@lootdrop/db";
import { MockBitrefillClient } from "@lootdrop/bitrefill";
import {
  approveClaim,
  ClaimError,
  createClaim,
  denyClaim,
  openClaimForSelection,
  redeemClaim,
  refetchRedemption,
  retryFailedClaim,
} from "./claims.js";
import { getBudgetSnapshot } from "./budget.js";

const db = getDb();
const COMMUNITY = "guild_test";

async function resetDb(): Promise<void> {
  await db.auditLog.deleteMany();
  await db.approval.deleteMany();
  await db.redemption.deleteMany();
  await db.rewardClaim.deleteMany();
  await db.communityPolicy.deleteMany();
  await db.recipientPreference.deleteMany();
  await db.community.deleteMany();

  await db.community.create({ data: { id: COMMUNITY, name: "Test Guild" } });
  await db.communityPolicy.create({
    data: {
      communityId: COMMUNITY,
      currency: "USD",
      dailyBudgetCents: 100_00,
      weeklyBudgetCents: 500_00,
      maxSingleRewardCents: 25_00,
      autoApproveBelowCents: 5_00,
      claimExpiryDays: 30,
      allowedCategoriesJson: JSON.stringify([
        "gaming",
        "food",
        "shopping",
        "mobile_topup",
      ]),
      allowSelfRewards: false,
      recipientCooldownHours: 24,
    },
  });
}

function reqFor(recipient: string, amountCents: number) {
  return {
    communityId: COMMUNITY,
    recipientDiscordId: recipient,
    amountCents,
    currency: "USD",
    reason: "test reward",
    createdByType: "human" as const,
    createdById: "admin_1",
  };
}

async function approvedSelectingClaim(recipient = "alice", amountCents = 10_00) {
  const { claim } = await createClaim(db, reqFor(recipient, amountCents));
  await approveClaim(db, claim!.id, "admin_1");
  return openClaimForSelection(db, claim!.id);
}

const product = (id: string, category = "gaming", priceCents = 10_00) => ({
  id,
  name: id,
  category,
  countries: [],
  priceCents,
  isTestProduct: true,
});

beforeEach(resetDb);

describe("createClaim", () => {
  it("persists pending claim and reserves budget at creation (17.3)", async () => {
    const r1 = await createClaim(db, reqFor("alice", 25_00));
    expect(r1.decision.outcome).toBe("requires_approval");
    expect(r1.claim?.status).toBe("pending_approval");

    const snapshot = await getBudgetSnapshot(db, COMMUNITY, {
      dailyBudgetCents: 100_00,
      weeklyBudgetCents: 500_00,
    });
    expect(snapshot.reservedDayCents).toBe(25_00);

    // Fill the daily budget with pending claims; nothing redeemed yet.
    await createClaim(db, reqFor("bob", 25_00));
    await createClaim(db, reqFor("carol", 25_00));
    await createClaim(db, reqFor("dave", 25_00));
    const r5 = await createClaim(db, reqFor("erin", 1_00));
    expect(r5.decision.outcome).toBe("denied");
    expect(r5.claim).toBeUndefined();
  });

  it("releases budget when a claim is denied", async () => {
    const { claim } = await createClaim(db, reqFor("alice", 25_00));
    await denyClaim(db, claim!.id, "admin_2");
    const snapshot = await getBudgetSnapshot(db, COMMUNITY, {
      dailyBudgetCents: 100_00,
      weeklyBudgetCents: 500_00,
    });
    expect(snapshot.reservedDayCents).toBe(0);
  });

  it("cooldown counts approved+ claims, not denied ones", async () => {
    // Denied claim (over max) must NOT lock alice out.
    const denied = await createClaim(db, reqFor("alice", 99_00));
    expect(denied.decision.outcome).toBe("denied");
    const ok = await createClaim(db, reqFor("alice", 4_00));
    expect(ok.decision.outcome).toBe("auto_approved");
    // Now alice has an approved claim -> cooldown blocks the next one.
    const blocked = await createClaim(db, reqFor("alice", 4_00));
    expect(blocked.decision.outcome).toBe("denied");
  });

  it("auto-approved claim skips pending_approval", async () => {
    const { claim } = await createClaim(db, reqFor("alice", 4_00));
    expect(claim?.status).toBe("approved");
    expect(claim?.approvedById).toBe("policy:auto");
  });
});

describe("approval rules", () => {
  it("rejects approver == recipient even when someone else created", async () => {
    const { claim } = await createClaim(db, reqFor("alice", 10_00));
    await expect(approveClaim(db, claim!.id, "alice")).rejects.toThrowError(
      /yourself/,
    );
  });

  it("allows creator to approve own created claim (solo-admin guilds)", async () => {
    const { claim } = await createClaim(db, reqFor("alice", 10_00));
    const approved = await approveClaim(db, claim!.id, "admin_1");
    expect(approved.status).toBe("approved");
    expect(approved.approvedById).toBe("admin_1");
  });

  it("cannot approve twice", async () => {
    const { claim } = await createClaim(db, reqFor("alice", 10_00));
    await approveClaim(db, claim!.id, "admin_1");
    await expect(approveClaim(db, claim!.id, "admin_2")).rejects.toThrowError(
      ClaimError,
    );
  });
});

describe("redemption", () => {
  it("happy path: fulfills and returns redemption info without persisting it", async () => {
    const claim = await approvedSelectingClaim();
    const bitrefill = new MockBitrefillClient();
    const result = await redeemClaim(db, bitrefill, {
      claimId: claim.id,
      product: product("test-gift-card-code"),
      country: "US",
    });
    expect(result.ok).toBe(true);
    expect(result.redemption?.code).toBeTruthy();

    const fresh = await db.rewardClaim.findUnique({ where: { id: claim.id } });
    expect(fresh?.status).toBe("fulfilled");

    // ADR 0002: nothing redemption-shaped at rest.
    const row = await db.redemption.findUnique({ where: { claimId: claim.id } });
    expect(JSON.stringify(row)).not.toContain(result.redemption!.code);
    const audits = await db.auditLog.findMany();
    expect(JSON.stringify(audits)).not.toContain(result.redemption!.code);
  });

  it("double-spend: concurrent redeems -> exactly one invoice", async () => {
    const claim = await approvedSelectingClaim();
    const bitrefill = new MockBitrefillClient();
    const attempt = () =>
      redeemClaim(db, bitrefill, {
        claimId: claim.id,
        product: product("test-gift-card-code"),
        country: "US",
      });
    const results = await Promise.allSettled([attempt(), attempt()]);
    const ok = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const blocked = results.filter(
      (r) =>
        r.status === "rejected" &&
        r.reason instanceof ClaimError &&
        r.reason.code === "already_redeeming",
    ).length;
    expect(ok).toBe(1);
    expect(blocked).toBe(1);
    expect(await db.redemption.count({ where: { claimId: claim.id } })).toBe(1);
  });

  it("rejects product over claim value / wrong category", async () => {
    const claim = await approvedSelectingClaim("alice", 5_00);
    const bitrefill = new MockBitrefillClient();
    await expect(
      redeemClaim(db, bitrefill, {
        claimId: claim.id,
        product: product("test-gift-card-code", "gaming", 10_00),
        country: "US",
      }),
    ).rejects.toThrowError(/costs more/);
    await expect(
      redeemClaim(db, bitrefill, {
        claimId: claim.id,
        product: product("x", "gambling", 1_00),
        country: "US",
      }),
    ).rejects.toThrowError(/category/);
  });

  it("fail product -> failed claim -> retry -> success", async () => {
    const claim = await approvedSelectingClaim();
    const bitrefill = new MockBitrefillClient();
    const failed = await redeemClaim(db, bitrefill, {
      claimId: claim.id,
      product: product("test-gift-card-code-fail"),
      country: "US",
    });
    expect(failed.ok).toBe(false);
    let fresh = await db.rewardClaim.findUnique({ where: { id: claim.id } });
    expect(fresh?.status).toBe("failed");

    await retryFailedClaim(db, claim.id);
    const retried = await redeemClaim(db, bitrefill, {
      claimId: claim.id,
      product: product("test-gift-card-code"),
      country: "US",
    });
    expect(retried.ok).toBe(true);
    fresh = await db.rewardClaim.findUnique({ where: { id: claim.id } });
    expect(fresh?.status).toBe("fulfilled");
  });

  it("re-delivery refetches the same code on demand (ADR 0002)", async () => {
    const claim = await approvedSelectingClaim();
    const bitrefill = new MockBitrefillClient();
    const first = await redeemClaim(db, bitrefill, {
      claimId: claim.id,
      product: product("test-gift-card-code"),
      country: "US",
    });
    const refetched = await refetchRedemption(db, bitrefill, claim.id);
    expect(refetched?.code).toBe(first.redemption?.code);
  });
});
