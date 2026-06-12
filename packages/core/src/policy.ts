/**
 * BountyGuard policy evaluation — pure function, no I/O (chunk 06).
 * Requester role/permission is enforced at the surface: the Discord bot
 * checks the admin role, the MCP server is identity-bound at startup.
 */

export interface PolicyConfig {
  currency: string;
  dailyBudgetCents: number;
  weeklyBudgetCents: number;
  maxSingleRewardCents: number;
  /** amount < this -> auto-approve; amount >= this -> requires approval. */
  autoApproveBelowCents: number;
  claimExpiryDays: number;
  allowedCategories: string[];
  allowSelfRewards: boolean;
  recipientCooldownHours: number;
}

export interface CreateClaimInput {
  recipientId: string;
  amountCents: number;
  currency: string;
  categories: string[];
  createdById: string;
}

export interface PolicyUsage {
  /** Cents reserved in the rolling 24h window (BUDGET_RESERVING_STATUSES). */
  reservedDayCents: number;
  /** Cents reserved in the rolling 7d window. */
  reservedWeekCents: number;
  /** Recipient's claims that reached approved+ inside the cooldown window. */
  recipientRecentApprovedCount: number;
}

export type PolicyDecision =
  | { outcome: "auto_approved" }
  | { outcome: "requires_approval" }
  | {
      outcome: "denied";
      code:
        | "denied_policy_violation"
        | "denied_budget_exceeded"
        | "denied_permission";
      reason: string;
    };

export function evaluateCreateClaim(
  input: CreateClaimInput,
  policy: PolicyConfig,
  usage: PolicyUsage,
): PolicyDecision {
  if (input.currency !== policy.currency) {
    return deny("denied_policy_violation", `Only ${policy.currency} claims are allowed.`);
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return deny("denied_policy_violation", "Amount must be a positive whole amount.");
  }
  if (input.amountCents > policy.maxSingleRewardCents) {
    return deny(
      "denied_policy_violation",
      `Amount exceeds max single reward (${fmt(policy.maxSingleRewardCents)}).`,
    );
  }
  const badCategory = input.categories.find(
    (c) => !policy.allowedCategories.includes(c),
  );
  if (badCategory) {
    return deny("denied_policy_violation", `Category not allowed: ${badCategory}.`);
  }
  if (!policy.allowSelfRewards && input.createdById === input.recipientId) {
    return deny("denied_permission", "Self-rewards are not allowed.");
  }
  if (usage.recipientRecentApprovedCount > 0) {
    return deny(
      "denied_policy_violation",
      `Recipient is in the ${policy.recipientCooldownHours}h cooldown window.`,
    );
  }
  if (usage.reservedDayCents + input.amountCents > policy.dailyBudgetCents) {
    return deny(
      "denied_budget_exceeded",
      `Daily budget exceeded (${fmt(usage.reservedDayCents)} reserved of ${fmt(policy.dailyBudgetCents)}).`,
    );
  }
  if (usage.reservedWeekCents + input.amountCents > policy.weeklyBudgetCents) {
    return deny(
      "denied_budget_exceeded",
      `Weekly budget exceeded (${fmt(usage.reservedWeekCents)} reserved of ${fmt(policy.weeklyBudgetCents)}).`,
    );
  }
  // Threshold: strictly below auto-approves; exactly at threshold requires approval.
  if (input.amountCents < policy.autoApproveBelowCents) {
    return { outcome: "auto_approved" };
  }
  return { outcome: "requires_approval" };
}

function deny(
  code: Extract<PolicyDecision, { outcome: "denied" }>["code"],
  reason: string,
): PolicyDecision {
  return { outcome: "denied", code, reason };
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
