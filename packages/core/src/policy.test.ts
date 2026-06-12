import { describe, expect, it } from "vitest";
import {
  evaluateCreateClaim,
  type CreateClaimInput,
  type PolicyConfig,
  type PolicyUsage,
} from "./policy.js";
import { canTransition, VALID_TRANSITIONS } from "./statuses.js";

const policy: PolicyConfig = {
  currency: "USD",
  dailyBudgetCents: 100_00,
  weeklyBudgetCents: 500_00,
  maxSingleRewardCents: 25_00,
  autoApproveBelowCents: 5_00,
  claimExpiryDays: 30,
  allowedCategories: ["gaming", "food", "shopping", "mobile_topup"],
  allowSelfRewards: false,
  recipientCooldownHours: 24,
};

const noUsage: PolicyUsage = {
  reservedDayCents: 0,
  reservedWeekCents: 0,
  recipientRecentApprovedCount: 0,
};

function input(overrides: Partial<CreateClaimInput> = {}): CreateClaimInput {
  return {
    recipientId: "alice",
    amountCents: 10_00,
    currency: "USD",
    categories: ["gaming"],
    createdById: "admin",
    ...overrides,
  };
}

describe("evaluateCreateClaim", () => {
  it("auto-approves strictly below threshold", () => {
    expect(
      evaluateCreateClaim(input({ amountCents: 4_99 }), policy, noUsage).outcome,
    ).toBe("auto_approved");
  });

  it("requires approval at exactly the threshold (boundary)", () => {
    expect(
      evaluateCreateClaim(input({ amountCents: 5_00 }), policy, noUsage).outcome,
    ).toBe("requires_approval");
  });

  it("denies over max single reward", () => {
    const d = evaluateCreateClaim(input({ amountCents: 25_01 }), policy, noUsage);
    expect(d.outcome).toBe("denied");
  });

  it("denies non-USD (USD-only MVP)", () => {
    const d = evaluateCreateClaim(input({ currency: "EUR" }), policy, noUsage);
    expect(d.outcome).toBe("denied");
  });

  it("denies disallowed category", () => {
    const d = evaluateCreateClaim(input({ categories: ["gambling"] }), policy, noUsage);
    expect(d.outcome).toBe("denied");
  });

  it("denies self-reward", () => {
    const d = evaluateCreateClaim(
      input({ createdById: "alice", recipientId: "alice" }),
      policy,
      noUsage,
    );
    expect(d.outcome).toBe("denied");
    expect(d.outcome === "denied" && d.code).toBe("denied_permission");
  });

  it("denies when recipient is in cooldown", () => {
    const d = evaluateCreateClaim(input(), policy, {
      ...noUsage,
      recipientRecentApprovedCount: 1,
    });
    expect(d.outcome).toBe("denied");
  });

  it("denies when daily budget would be exceeded (reserve-at-creation)", () => {
    const d = evaluateCreateClaim(input({ amountCents: 10_00 }), policy, {
      ...noUsage,
      reservedDayCents: 95_00,
    });
    expect(d.outcome).toBe("denied");
    expect(d.outcome === "denied" && d.code).toBe("denied_budget_exceeded");
  });

  it("denies when weekly budget would be exceeded", () => {
    const d = evaluateCreateClaim(input({ amountCents: 10_00 }), policy, {
      ...noUsage,
      reservedWeekCents: 495_00,
    });
    expect(d.outcome).toBe("denied");
  });
});

describe("status machine", () => {
  it("matches PRD §9.4 exactly", () => {
    expect(VALID_TRANSITIONS.fulfilled).toEqual([]);
    expect(VALID_TRANSITIONS.expired).toEqual([]);
    expect(VALID_TRANSITIONS.cancelled).toEqual([]);
    expect(canTransition("created", "approved")).toBe(true);
    expect(canTransition("recipient_selecting", "redeeming")).toBe(true);
    expect(canTransition("failed", "recipient_selecting")).toBe(true);
    // No skipping straight to fulfilled, no resurrecting terminal claims.
    expect(canTransition("approved", "fulfilled")).toBe(false);
    expect(canTransition("created", "fulfilled")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
    expect(canTransition("fulfilled", "recipient_selecting")).toBe(false);
  });
});
