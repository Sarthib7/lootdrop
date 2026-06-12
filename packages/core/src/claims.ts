import type { PrismaClient } from "@lootdrop/db";
import type { BitrefillClient, Product, RedemptionInfo } from "@lootdrop/bitrefill";
import { appendAudit } from "./audit.js";
import {
  getBudgetSnapshot,
  getRecipientRecentApprovedCount,
  getReservedCents,
} from "./budget.js";
import {
  evaluateCreateClaim,
  type PolicyConfig,
  type PolicyDecision,
} from "./policy.js";
import { assertTransition, type ClaimStatus } from "./statuses.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Claim {
  id: string;
  communityId: string;
  recipientDiscordId: string;
  amountCents: number;
  currency: string;
  reason: string;
  allowedCategoriesJson: string;
  status: string;
  createdByType: string;
  createdById: string;
  approvedById: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ClaimError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "policy_denied"
      | "approver_is_recipient"
      | "wrong_status"
      | "already_redeeming"
      | "expired"
      | "invalid_product",
    message: string,
  ) {
    super(message);
  }
}

export async function loadPolicy(
  db: PrismaClient,
  communityId: string,
): Promise<PolicyConfig> {
  const row = await db.communityPolicy.findUnique({ where: { communityId } });
  if (!row) throw new ClaimError("not_found", `No policy for community ${communityId}`);
  return {
    currency: row.currency,
    dailyBudgetCents: row.dailyBudgetCents,
    weeklyBudgetCents: row.weeklyBudgetCents,
    maxSingleRewardCents: row.maxSingleRewardCents,
    autoApproveBelowCents: row.autoApproveBelowCents,
    claimExpiryDays: row.claimExpiryDays,
    allowedCategories: JSON.parse(row.allowedCategoriesJson) as string[],
    allowSelfRewards: row.allowSelfRewards,
    recipientCooldownHours: row.recipientCooldownHours,
  };
}

export interface CreateClaimRequest {
  communityId: string;
  recipientDiscordId: string;
  amountCents: number;
  currency: string;
  reason: string;
  categories?: string[];
  createdByType: "human" | "agent";
  createdById: string;
}

export interface CreateClaimResult {
  decision: PolicyDecision;
  claim?: Claim;
}

/** Create a policy-checked claim. Denied claims are audited, never persisted. */
export async function createClaim(
  db: PrismaClient,
  req: CreateClaimRequest,
): Promise<CreateClaimResult> {
  const policy = await loadPolicy(db, req.communityId);
  const categories = req.categories?.length
    ? req.categories
    : policy.allowedCategories;

  const [reservedDayCents, reservedWeekCents, recipientRecentApprovedCount] =
    await Promise.all([
      getReservedCents(db, req.communityId, DAY_MS),
      getReservedCents(db, req.communityId, 7 * DAY_MS),
      getRecipientRecentApprovedCount(
        db,
        req.communityId,
        req.recipientDiscordId,
        policy.recipientCooldownHours,
      ),
    ]);

  const decision = evaluateCreateClaim(
    {
      recipientId: req.recipientDiscordId,
      amountCents: req.amountCents,
      currency: req.currency,
      categories,
      createdById: req.createdById,
    },
    policy,
    { reservedDayCents, reservedWeekCents, recipientRecentApprovedCount },
  );

  if (decision.outcome === "denied") {
    await appendAudit(db, {
      communityId: req.communityId,
      actorType: req.createdByType,
      actorId: req.createdById,
      action: "claim_denied_by_policy",
      targetType: "reward_claim",
      targetId: "(not created)",
      metadata: { code: decision.code, reason: decision.reason },
    });
    return { decision };
  }

  const status: ClaimStatus =
    decision.outcome === "auto_approved" ? "approved" : "pending_approval";
  assertTransition("created", status);

  const claim = await db.rewardClaim.create({
    data: {
      communityId: req.communityId,
      recipientDiscordId: req.recipientDiscordId,
      amountCents: req.amountCents,
      currency: req.currency,
      reason: req.reason,
      allowedCategoriesJson: JSON.stringify(categories),
      status,
      createdByType: req.createdByType,
      createdById: req.createdById,
      approvedById: decision.outcome === "auto_approved" ? "policy:auto" : null,
      expiresAt: new Date(Date.now() + policy.claimExpiryDays * DAY_MS),
    },
  });

  await appendAudit(db, {
    communityId: req.communityId,
    actorType: req.createdByType,
    actorId: req.createdById,
    action: `claim_${status}`,
    targetType: "reward_claim",
    targetId: claim.id,
    metadata: { amountCents: req.amountCents, reason: req.reason },
  });

  return { decision, claim };
}

/**
 * Atomic guarded transition: succeeds only if the claim is still in `from`.
 * This is what makes redemption double-click safe (M5-07).
 */
async function guardedTransition(
  db: PrismaClient,
  claimId: string,
  from: ClaimStatus,
  to: ClaimStatus,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  assertTransition(from, to);
  const result = await db.rewardClaim.updateMany({
    where: { id: claimId, status: from },
    data: { status: to, ...extra },
  });
  return result.count === 1;
}

async function mustGetClaim(db: PrismaClient, claimId: string): Promise<Claim> {
  const claim = await db.rewardClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ClaimError("not_found", `Claim not found: ${claimId}`);
  return claim;
}

export async function approveClaim(
  db: PrismaClient,
  claimId: string,
  approverId: string,
): Promise<Claim> {
  const claim = await mustGetClaim(db, claimId);
  // Approver != recipient is a hard rule; creator MAY approve (chunk 06).
  if (approverId === claim.recipientDiscordId) {
    throw new ClaimError(
      "approver_is_recipient",
      "You cannot approve a reward for yourself.",
    );
  }
  const ok = await guardedTransition(db, claimId, "pending_approval", "approved", {
    approvedById: approverId,
  });
  if (!ok) {
    throw new ClaimError("wrong_status", `Claim is not pending approval.`);
  }
  await db.approval.create({
    data: { claimId, approverId, decision: "approved" },
  });
  await appendAudit(db, {
    communityId: claim.communityId,
    actorType: "human",
    actorId: approverId,
    action: "claim_approved",
    targetType: "reward_claim",
    targetId: claimId,
  });
  return mustGetClaim(db, claimId);
}

export async function denyClaim(
  db: PrismaClient,
  claimId: string,
  approverId: string,
): Promise<Claim> {
  const claim = await mustGetClaim(db, claimId);
  const ok = await guardedTransition(db, claimId, "pending_approval", "cancelled");
  if (!ok) throw new ClaimError("wrong_status", `Claim is not pending approval.`);
  await db.approval.create({
    data: { claimId, approverId, decision: "denied" },
  });
  await appendAudit(db, {
    communityId: claim.communityId,
    actorType: "human",
    actorId: approverId,
    action: "claim_denied",
    targetType: "reward_claim",
    targetId: claimId,
  });
  return mustGetClaim(db, claimId);
}

/** Expire a claim in-place if its expiry passed. Returns the fresh claim. */
export async function expireIfDue(
  db: PrismaClient,
  claimId: string,
): Promise<Claim> {
  const claim = await mustGetClaim(db, claimId);
  const expirable: ClaimStatus[] = [
    "pending_approval",
    "approved",
    "recipient_selecting",
  ];
  if (
    expirable.includes(claim.status as ClaimStatus) &&
    claim.expiresAt.getTime() < Date.now()
  ) {
    const ok = await guardedTransition(
      db,
      claimId,
      claim.status as ClaimStatus,
      "expired",
    );
    if (ok) {
      await appendAudit(db, {
        communityId: claim.communityId,
        actorType: "system",
        actorId: "system:expiry",
        action: "claim_expired",
        targetType: "reward_claim",
        targetId: claimId,
      });
    }
    return mustGetClaim(db, claimId);
  }
  return claim;
}

/** Recipient opened the claim DM: approved -> recipient_selecting. */
export async function openClaimForSelection(
  db: PrismaClient,
  claimId: string,
): Promise<Claim> {
  const claim = await expireIfDue(db, claimId);
  if (claim.status === "recipient_selecting") return claim; // already open
  if (claim.status === "expired") throw new ClaimError("expired", "Claim expired.");
  const ok = await guardedTransition(db, claimId, "approved", "recipient_selecting");
  if (!ok) throw new ClaimError("wrong_status", "Claim is not ready for selection.");
  return mustGetClaim(db, claimId);
}

export interface RedeemRequest {
  claimId: string;
  product: Product;
  country: string;
}

export interface RedeemResult {
  ok: boolean;
  /** Returned for immediate DM delivery; never persisted (ADR 0002). */
  redemption?: RedemptionInfo;
  orderId?: string;
  failureReason?: string;
}

/**
 * Confirm + fulfill in one call (test products complete synchronously; live
 * mode polls before this resolves). Double-spend safe: the
 * recipient_selecting -> redeeming guard admits exactly one caller, and
 * redemptions.claimId is unique as a backstop.
 */
export async function redeemClaim(
  db: PrismaClient,
  bitrefill: BitrefillClient,
  req: RedeemRequest,
): Promise<RedeemResult> {
  const claim = await expireIfDue(db, req.claimId);
  if (claim.status === "expired") throw new ClaimError("expired", "Claim expired.");

  // Validate product against the claim BEFORE taking the redeeming slot.
  const categories = JSON.parse(claim.allowedCategoriesJson) as string[];
  if (!categories.includes(req.product.category)) {
    throw new ClaimError("invalid_product", "Product category not allowed for this claim.");
  }
  if (req.product.priceCents > claim.amountCents) {
    throw new ClaimError("invalid_product", "Product costs more than the claim value.");
  }
  if (
    req.product.countries.length > 0 &&
    !req.product.countries.includes(req.country)
  ) {
    throw new ClaimError("invalid_product", "Product not available in your country.");
  }

  const won = await guardedTransition(
    db,
    req.claimId,
    "recipient_selecting",
    "redeeming",
  );
  if (!won) {
    throw new ClaimError("already_redeeming", "This claim is already being redeemed.");
  }

  const redemptionRow = await db.redemption.create({
    data: {
      claimId: req.claimId,
      bitrefillProductId: req.product.id,
      country: req.country,
      category: req.product.category,
      status: "pending",
    },
  });

  try {
    const invoice = await bitrefill.createInvoice({
      productId: req.product.id,
      claimId: req.claimId,
    });
    const order = await bitrefill.getOrder(invoice.orderId);
    await db.redemption.update({
      where: { id: redemptionRow.id },
      data: {
        bitrefillInvoiceId: invoice.invoiceId,
        bitrefillOrderId: invoice.orderId,
        status: order.status === "delivered" ? "delivered" : "failed",
        deliveredAt: order.status === "delivered" ? new Date() : null,
      },
    });

    if (order.status === "delivered" && order.redemption) {
      await guardedTransition(db, req.claimId, "redeeming", "fulfilled");
      await appendAudit(db, {
        communityId: claim.communityId,
        actorType: "system",
        actorId: "system:fulfillment",
        action: "claim_fulfilled",
        targetType: "reward_claim",
        targetId: req.claimId,
        // product/category/country stay out of public surfaces; audit keeps
        // the order id for support, never the redemption payload.
        metadata: { orderId: invoice.orderId },
      });
      return { ok: true, redemption: order.redemption, orderId: invoice.orderId };
    }

    await guardedTransition(db, req.claimId, "redeeming", "failed");
    await appendAudit(db, {
      communityId: claim.communityId,
      actorType: "system",
      actorId: "system:fulfillment",
      action: "claim_failed",
      targetType: "reward_claim",
      targetId: req.claimId,
      metadata: { orderId: invoice.orderId },
    });
    return { ok: false, failureReason: "Fulfillment failed.", orderId: invoice.orderId };
  } catch (err) {
    await db.redemption.update({
      where: { id: redemptionRow.id },
      data: { status: "failed" },
    });
    await guardedTransition(db, req.claimId, "redeeming", "failed");
    await appendAudit(db, {
      communityId: claim.communityId,
      actorType: "system",
      actorId: "system:fulfillment",
      action: "claim_failed",
      targetType: "reward_claim",
      targetId: req.claimId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return { ok: false, failureReason: "Fulfillment error." };
  }
}

/** Retry after failure: failed -> recipient_selecting; old attempt row is removed. */
export async function retryFailedClaim(
  db: PrismaClient,
  claimId: string,
): Promise<Claim> {
  const claim = await mustGetClaim(db, claimId);
  const ok = await guardedTransition(db, claimId, "failed", "recipient_selecting");
  if (!ok) throw new ClaimError("wrong_status", "Claim is not in a failed state.");
  await db.redemption.deleteMany({ where: { claimId } });
  await appendAudit(db, {
    communityId: claim.communityId,
    actorType: "system",
    actorId: "system:retry",
    action: "claim_retry",
    targetType: "reward_claim",
    targetId: claimId,
  });
  return mustGetClaim(db, claimId);
}

/** Re-delivery: fetch redemption info on demand from Bitrefill (ADR 0002). */
export async function refetchRedemption(
  db: PrismaClient,
  bitrefill: BitrefillClient,
  claimId: string,
): Promise<RedemptionInfo | undefined> {
  const row = await db.redemption.findUnique({ where: { claimId } });
  if (!row?.bitrefillOrderId) return undefined;
  const order = await bitrefill.getOrder(row.bitrefillOrderId);
  return order.redemption;
}
