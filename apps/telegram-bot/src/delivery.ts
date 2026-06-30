import { GrammyError, type Api } from "grammy";
import type { Claim } from "@lootdrop/core";
import { db } from "./deps.js";
import { env } from "./env.js";
import { countryKeyboard, esc, fmtUsd } from "./ui.js";

export interface DeliveryResult {
  delivered: boolean;
  /** Set when the recipient has never started the bot (Telegram 403). */
  deepLink?: string;
  /** Why delivery failed, when it did. */
  reason?: "not_started" | "blocked";
}

/** Admin-facing one-liner describing the outcome of delivering a claim DM. */
export function deliveryNote(result: DeliveryResult, botUsername: string): string {
  if (result.delivered) {
    return "✅ Recipient was notified privately to choose their reward.";
  }
  if (result.deepLink) {
    return `⚠️ Recipient hasn't started the bot yet. Ask them to tap to claim: ${result.deepLink}`;
  }
  // blocked / deactivated, or an unexpected delivery failure.
  return `⚠️ Couldn't message the recipient (they may have blocked the bot). Ask them to unblock @${botUsername} and run /start.`;
}

/**
 * Send the recipient the private country picker. Telegram forbids a bot from
 * initiating a chat with a user who never pressed Start, surfacing as a 403
 * "can't initiate conversation". In that case we return a deep link the
 * recipient must tap to start the bot, then the flow resumes (see /start).
 */
export async function deliverToRecipient(
  api: Api,
  botUsername: string,
  claim: Claim,
): Promise<DeliveryResult> {
  const pref = await db.recipientPreference.findUnique({
    where: {
      platform_recipientId: { platform: "telegram", recipientId: claim.recipientId },
    },
  });
  try {
    await api.sendMessage(
      Number(claim.recipientId),
      `🎉 You received a <b>${fmtUsd(claim.amountCents)} LootDrop</b>!\nReason: ${esc(claim.reason)}\n\nChoose your country to see your reward options.`,
      { parse_mode: "HTML", reply_markup: countryKeyboard(claim.id, pref?.country) },
    );
    return { delivered: true };
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 403) {
      // 403 covers "can't initiate conversation" (never started) AND "blocked"/
      // "deactivated" — only the first is recoverable with a deep link.
      const blocked = /blocked|deactivated/i.test(err.description);
      return blocked
        ? { delivered: false, reason: "blocked" }
        : {
            delivered: false,
            reason: "not_started",
            deepLink: `https://t.me/${botUsername}?start=claim_${claim.id}`,
          };
    }
    throw err;
  }
}

/**
 * Public, redacted audit line: recipient + amount + reason + status only — the
 * chosen product / category / country / code are never made public (P0-09).
 */
export async function postAudit(
  api: Api,
  claim: Claim,
  status: "redeemed" | "failed",
): Promise<void> {
  const chatId = env.logChatId ?? claim.communityId;
  const icon = status === "redeemed" ? "✅" : "⚠️";
  await api.sendMessage(
    chatId,
    `🎁 <a href="tg://user?id=${claim.recipientId}">Recipient</a> received a ${fmtUsd(claim.amountCents)} reward — ${esc(claim.reason)} ${icon} ${esc(status)}`,
    { parse_mode: "HTML" },
  );
}
