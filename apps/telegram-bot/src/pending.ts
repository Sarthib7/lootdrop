/**
 * Short-lived store for a reward awaiting admin confirmation (used when the
 * recipient was resolved by name rather than an explicit reply). The reason is
 * free text and can't fit in callback_data, so the confirm button carries only
 * a short token that maps here.
 */
export interface PendingReward {
  communityId: string;
  recipientId: string;
  recipientName: string;
  amountCents: number;
  reason: string;
  createdById: string;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, PendingReward>();
let seq = 0;

export function putPending(p: Omit<PendingReward, "expiresAt">): string {
  const token = `${Date.now().toString(36)}${(seq++).toString(36)}`.slice(-12);
  store.set(token, { ...p, expiresAt: Date.now() + TTL_MS });
  return token;
}

/** Atomically consume a pending reward (one confirmation, never two). */
export function takePending(token: string): PendingReward | undefined {
  const p = store.get(token);
  if (!p) return undefined;
  store.delete(token);
  return p.expiresAt > Date.now() ? p : undefined;
}
