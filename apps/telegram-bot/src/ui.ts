import { InlineKeyboard } from "grammy";
import type { Claim } from "@lootdrop/core";
import type { Product } from "@lootdrop/bitrefill";
import { encode } from "./callbacks.js";

export const fmtUsd = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/**
 * Escape user-supplied text before putting it in an HTML-parse_mode message.
 * `reason`, product names, etc. are untrusted free text and must never be able
 * to inject or break Telegram markup.
 */
export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const COUNTRIES: Array<{ label: string; value: string }> = [
  { label: "🇺🇸 United States", value: "US" },
  { label: "🇩🇪 Germany", value: "DE" },
  { label: "🇮🇳 India", value: "IN" },
  { label: "🇬🇧 United Kingdom", value: "GB" },
  { label: "🌍 Other / Global", value: "GLOBAL" },
];

/** HTML-formatted claim card (send with parse_mode: "HTML"). */
export function claimCardText(claim: Claim): string {
  return [
    "🎁 <b>Reward claim</b>",
    `Amount: <b>${fmtUsd(claim.amountCents)}</b>`,
    `Status: <b>${esc(claim.status)}</b>`,
    `Reason: ${esc(claim.reason)}`,
    `<code>claim ${claim.id}</code>`,
  ].join("\n");
}

export function approvalKeyboard(claimId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Approve", encode("approve", claimId))
    .text("✖️ Deny", encode("deny", claimId));
}

export function countryKeyboard(claimId: string, preferred?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of COUNTRIES) {
    const label = c.value === preferred ? `• ${c.label}` : c.label;
    kb.text(label, encode("country", claimId, c.value)).row();
  }
  return kb;
}

export function categoryKeyboard(
  claimId: string,
  categories: string[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  // Reference categories by index so callback_data stays tiny.
  categories.forEach((c, i) => kb.text(c, encode("category", claimId, i)).row());
  return kb;
}

export function productKeyboard(
  claimId: string,
  products: Product[],
  claimAmountCents: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  // Telegram has no select menus; one button per product (cap at 5 like Discord).
  products.slice(0, 5).forEach((p, i) => {
    kb.text(`${p.name} — ${fmtUsd(p.priceCents)}`, encode("product", claimId, i)).row();
  });
  return kb;
}

export function confirmKeyboard(claimId: string, productIndex: number): InlineKeyboard {
  return new InlineKeyboard().text(
    "✅ Confirm redemption",
    encode("confirm", claimId, productIndex),
  );
}

export function retryKeyboard(claimId: string): InlineKeyboard {
  return new InlineKeyboard().text("🔁 Try again", encode("retry", claimId));
}

/** Confirm/cancel a reward whose recipient was resolved by name (`token`). */
export function confirmRewardKeyboard(token: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", encode("reward_confirm", token))
    .text("✖️ Cancel", encode("reward_cancel", token));
}
