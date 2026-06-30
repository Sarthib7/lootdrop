/**
 * Pure parsing helpers for the `/reward` command. Kept free of grammY types so
 * they are unit-testable. The recipient is identified structurally (a reply or
 * a text_mention), never from a plain @username — Telegram @username mentions
 * carry no user id (see research notes).
 */

export interface ParsedReward {
  amount: number; // whole USD
  reason: string;
  /** A name/@username typed before the amount, if any (e.g. "alice"). */
  recipientHint?: string;
}

export type ParseResult =
  | { ok: true; value: ParsedReward }
  | { ok: false; error: string };

// Matches a USD amount token: 10, $10, 10$, 1,000 — recipient comes from the
// reply, so anything before the amount (a typed name, "with", "@user") is
// ignored rather than mistaken for the amount.
const AMOUNT_RE = /^\$?\d[\d,]*\$?$/;

export function parseRewardArgs(raw: string): ParseResult {
  const tokens = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  const amountIdx = tokens.findIndex((t) => AMOUNT_RE.test(t));
  if (amountIdx === -1) {
    return {
      ok: false,
      error: "Include an amount in whole USD — e.g. `/reward 10 great bug report`.",
    };
  }
  const amount = Number(tokens[amountIdx].replace(/[$,]/g, ""));
  if (!Number.isInteger(amount) || amount < 1) {
    return {
      ok: false,
      error: "Amount must be a whole number of USD (at least 1) — e.g. `/reward 10 great work`.",
    };
  }
  // Everything after the amount is the reason; tokens before it (a typed name /
  // @username, minus filler words) become the recipient hint.
  const reason = tokens.slice(amountIdx + 1).join(" ").trim();
  if (reason.length < 3) {
    return {
      ok: false,
      error: "Add a short reason after the amount — e.g. `/reward 10 great bug report`.",
    };
  }
  const recipientHint =
    tokens
      .slice(0, amountIdx)
      .filter((t) => !/^(with|to|for)$/i.test(t))
      .join(" ")
      .replace(/^@/, "")
      .trim() || undefined;
  return { ok: true, value: { amount, reason, recipientHint } };
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
