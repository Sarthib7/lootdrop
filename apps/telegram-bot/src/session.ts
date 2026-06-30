import type { Product } from "@lootdrop/bitrefill";

/**
 * Per-claim selection breadcrumb held in memory while a recipient is choosing a
 * reward. It lets callback_data stay tiny (indices instead of long category
 * names / product ids). The durable source of truth is always the claim row in
 * Postgres; this is just a short-lived UI cache. If it is lost (bot restart /
 * TTL), the recipient simply re-opens the flow via the deep link or /myrewards.
 */
export interface Selection {
  country?: string;
  category?: string;
  products: Product[];
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, Selection>();

function sweep(now: number): void {
  for (const [id, sel] of store) {
    if (sel.expiresAt <= now) store.delete(id);
  }
}

export function getSelection(claimId: string): Selection | undefined {
  const sel = store.get(claimId);
  if (!sel) return undefined;
  if (sel.expiresAt <= Date.now()) {
    store.delete(claimId);
    return undefined;
  }
  return sel;
}

export function setSelection(claimId: string, patch: Partial<Selection>): Selection {
  const now = Date.now();
  sweep(now);
  const current = getSelection(claimId) ?? { products: [], expiresAt: 0 };
  const next: Selection = { ...current, ...patch, expiresAt: now + TTL_MS };
  store.set(claimId, next);
  return next;
}

export function clearSelection(claimId: string): void {
  store.delete(claimId);
}
