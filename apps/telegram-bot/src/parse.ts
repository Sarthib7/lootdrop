/**
 * Pure parsing helpers for the `/reward` command. Kept free of grammY types so
 * they are unit-testable. The recipient is identified structurally (a reply or
 * a text_mention), never from a plain @username — Telegram @username mentions
 * carry no user id (see research notes).
 */

export interface ParsedReward {
  amount: number; // whole USD
  reason: string;
}

export type ParseResult =
  | { ok: true; value: ParsedReward }
  | { ok: false; error: string };

const USAGE =
  "Usage: reply to a member (or pick them from the mention menu) with `/reward <amount> <reason>` — e.g. `/reward 10 great bug report`.";

export function parseRewardArgs(raw: string): ParseResult {
  const tokens = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  // A leading @username is decorative here (recipient comes from the reply /
  // text_mention), so drop it before reading the amount.
  if (tokens[0]?.startsWith("@")) tokens.shift();

  const amountTok = tokens.shift();
  if (!amountTok) return { ok: false, error: USAGE };
  if (!/^\d+$/.test(amountTok)) {
    return {
      ok: false,
      error: `Amount must be a whole number of USD (e.g. 10). Got "${amountTok}".`,
    };
  }
  const amount = Number(amountTok);
  if (amount < 1) return { ok: false, error: "Amount must be at least 1 USD." };

  const reason = tokens.join(" ").trim();
  if (reason.length < 3) {
    return {
      ok: false,
      error: "Add a short reason, e.g. `/reward 10 great bug report`.",
    };
  }
  return { ok: true, value: { amount, reason } };
}

export interface RecipientInfo {
  id: string;
  name?: string;
}

interface MessageLike {
  reply_to_message?: {
    from?: { id: number; is_bot?: boolean; first_name?: string; username?: string };
  };
  entities?: Array<{
    type: string;
    user?: { id: number; first_name?: string; username?: string };
  }>;
}

/** Resolve a reliable recipient user id from a reply or a text_mention entity. */
export function resolveRecipient(msg: MessageLike): RecipientInfo | undefined {
  const reply = msg.reply_to_message?.from;
  if (reply && !reply.is_bot) {
    return { id: String(reply.id), name: reply.username ?? reply.first_name };
  }
  const mention = msg.entities?.find((e) => e.type === "text_mention" && e.user);
  if (mention?.user) {
    return {
      id: String(mention.user.id),
      name: mention.user.username ?? mention.user.first_name,
    };
  }
  return undefined;
}
