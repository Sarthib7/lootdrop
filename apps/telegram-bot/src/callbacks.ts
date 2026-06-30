/**
 * Telegram inline-button callback_data is capped at 64 BYTES (UTF-8), so we
 * keep payloads tiny: a short action code, the claim id (cuid, ~25 chars), and
 * at most one small argument (a 2-letter country, or a numeric index into a
 * list the session already holds). Long values (category names, product ids)
 * are never put in callback_data — they are referenced by index instead.
 */
export const NS = "ld";

export type CallbackAction =
  | "approve"
  | "deny"
  | "country"
  | "category"
  | "product"
  | "confirm"
  | "retry"
  | "reward_confirm"
  | "reward_cancel";

const CODE: Record<CallbackAction, string> = {
  approve: "ap",
  deny: "dn",
  country: "co",
  category: "ca",
  product: "pr",
  confirm: "cf",
  retry: "rt",
  reward_confirm: "rc",
  reward_cancel: "rx",
};

const ACTION: Record<string, CallbackAction> = Object.fromEntries(
  Object.entries(CODE).map(([action, code]) => [code, action as CallbackAction]),
) as Record<string, CallbackAction>;

export const CALLBACK_LIMIT = 64;

/** Build callback_data: `ld|<code>|<claimId>|<arg?>`. Throws if > 64 bytes. */
export function encode(
  action: CallbackAction,
  claimId: string,
  arg?: string | number,
): string {
  const parts = [NS, CODE[action], claimId];
  if (arg !== undefined) parts.push(String(arg));
  const data = parts.join("|");
  if (Buffer.byteLength(data, "utf8") > CALLBACK_LIMIT) {
    throw new Error(`callback_data exceeds ${CALLBACK_LIMIT} bytes: ${data}`);
  }
  return data;
}

export interface DecodedCallback {
  action: CallbackAction;
  claimId: string;
  arg?: string;
}

/** Parse callback_data produced by encode(); returns undefined if not ours. */
export function decode(data: string): DecodedCallback | undefined {
  const [ns, code, claimId, arg] = data.split("|");
  if (ns !== NS) return undefined;
  const action = ACTION[code];
  if (!action || !claimId) return undefined;
  return { action, claimId, arg };
}
