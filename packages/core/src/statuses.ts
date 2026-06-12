/** Claim status machine — PRD §9.3/§9.4. Anything not listed here is invalid. */
export type ClaimStatus =
  | "created"
  | "pending_approval"
  | "approved"
  | "recipient_selecting"
  | "redeeming"
  | "fulfilled"
  | "failed"
  | "expired"
  | "cancelled";

export const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  created: ["approved", "pending_approval", "cancelled"],
  pending_approval: ["approved", "cancelled", "expired"],
  approved: ["recipient_selecting", "expired", "cancelled"],
  recipient_selecting: ["redeeming", "expired"],
  redeeming: ["fulfilled", "failed"],
  failed: ["recipient_selecting", "cancelled"],
  fulfilled: [],
  expired: [],
  cancelled: [],
};

export const TERMINAL_STATUSES: ReadonlySet<ClaimStatus> = new Set([
  "fulfilled",
  "expired",
  "cancelled",
]);

/**
 * Statuses whose amount is reserved against the community budget
 * (PRD §17.3): everything that isn't released. `fulfilled` counts as spend.
 */
export const BUDGET_RESERVING_STATUSES: ClaimStatus[] = [
  "created",
  "pending_approval",
  "approved",
  "recipient_selecting",
  "redeeming",
  "fulfilled",
];

/** Statuses that count toward the recipient cooldown (approved or beyond). */
export const COOLDOWN_COUNTING_STATUSES: ClaimStatus[] = [
  "approved",
  "recipient_selecting",
  "redeeming",
  "fulfilled",
];

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ClaimStatus, to: ClaimStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ClaimStatus,
    public readonly to: ClaimStatus,
  ) {
    super(`Invalid claim transition: ${from} -> ${to}`);
  }
}
