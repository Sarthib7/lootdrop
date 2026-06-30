import type { Context } from "grammy";
import {
  approveClaim,
  type Claim,
  ClaimError,
  denyClaim,
  openClaimForSelection,
  redeemClaim,
  retryFailedClaim,
} from "@lootdrop/core";
import type { Product } from "@lootdrop/bitrefill";
import { db, bitrefill } from "./deps.js";
import { isAdmin } from "./admin.js";
import { deliverToRecipient, deliveryNote, postAudit } from "./delivery.js";
import { logBotError } from "./log.js";
import { clearSelection, getSelection, setSelection } from "./session.js";
import {
  categoryKeyboard,
  claimCardText,
  confirmKeyboard,
  countryKeyboard,
  esc,
  fmtUsd,
  productKeyboard,
  retryKeyboard,
} from "./ui.js";

async function mustClaim(claimId: string): Promise<Claim> {
  const claim = await db.rewardClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ClaimError("not_found", "Reward not found.");
  return claim;
}

/** Selection is private to the recipient — never let another user drive it. */
function assertRecipient(ctx: Context, claim: Claim): void {
  if (String(ctx.from?.id) !== claim.recipientId) {
    throw new ClaimError("not_found", "This reward is not yours.");
  }
}

/** Valid products for a claim: category + price <= claim value (§18.6). */
async function productsForClaim(
  claim: Claim,
  country: string,
  category: string,
): Promise<Product[]> {
  return bitrefill.searchProducts({
    includeTestProducts: true,
    category,
    country: country === "GLOBAL" ? undefined : country,
    maxPriceCents: claim.amountCents,
  });
}

async function editExpired(ctx: Context): Promise<void> {
  await ctx
    .editMessageText(
      "This reward session expired. Reopen it from your reward link or /myrewards.",
    )
    .catch(() => undefined);
}

// ---- Approval (in the community group) -------------------------------------

export async function handleApproval(
  ctx: Context,
  action: "approve" | "deny",
  claimId: string,
): Promise<void> {
  const approverId = ctx.from?.id;
  if (!approverId) return;
  if (!(await isAdmin(ctx, approverId))) {
    await ctx
      .answerCallbackQuery({ text: "Only admins can approve or deny.", show_alert: true })
      .catch(() => undefined);
    return;
  }

  if (action === "deny") {
    const claim = await denyClaim(db, claimId, String(approverId));
    await ctx.editMessageText(claimCardText(claim), { parse_mode: "HTML" });
    return;
  }

  // approveClaim enforces approver != recipient (creator MAY approve).
  const claim = await approveClaim(db, claimId, String(approverId));
  const botUsername = ctx.me.username;
  let note: string;
  try {
    note = deliveryNote(await deliverToRecipient(ctx.api, botUsername, claim), botUsername);
  } catch (err) {
    // The claim is already approved; a delivery failure must not leave the card
    // stuck on the Approve/Deny buttons. Finalize it and give a recovery link.
    logBotError("approval delivery", err);
    note = `⚠️ Approved, but I couldn't message the recipient right now. They can open it here: https://t.me/${botUsername}?start=claim_${claim.id}`;
  }
  await ctx.editMessageText(`${claimCardText(claim)}\n\n${note}`, {
    parse_mode: "HTML",
  });
}

// ---- Recipient selection (in the recipient's private chat) -----------------

export async function handleCountry(
  ctx: Context,
  claimId: string,
  country: string,
): Promise<void> {
  const existing = await mustClaim(claimId);
  assertRecipient(ctx, existing);
  const claim = await openClaimForSelection(db, claimId);
  await db.recipientPreference.upsert({
    where: {
      platform_recipientId: { platform: "telegram", recipientId: claim.recipientId },
    },
    update: { country },
    create: { platform: "telegram", recipientId: claim.recipientId, country },
  });
  setSelection(claimId, { country });
  const categories = JSON.parse(claim.allowedCategoriesJson) as string[];
  await ctx.editMessageText(
    `Country: <b>${esc(country)}</b>. Now choose a category for your ${fmtUsd(claim.amountCents)} reward.`,
    { parse_mode: "HTML", reply_markup: categoryKeyboard(claimId, categories) },
  );
}

export async function handleCategory(
  ctx: Context,
  claimId: string,
  categoryIndex: number,
): Promise<void> {
  const claim = await mustClaim(claimId);
  assertRecipient(ctx, claim);
  const categories = JSON.parse(claim.allowedCategoriesJson) as string[];
  const category = categories[categoryIndex];
  if (!category) {
    throw new ClaimError("invalid_product", "That category is no longer available.");
  }
  const country = getSelection(claimId)?.country;
  if (!country) return editExpired(ctx);

  const products = await productsForClaim(claim, country, category);
  if (products.length === 0) {
    await ctx.editMessageText(
      `No <b>${esc(category)}</b> rewards fit ${fmtUsd(claim.amountCents)} in your country. Pick another category.`,
      { parse_mode: "HTML", reply_markup: categoryKeyboard(claimId, categories) },
    );
    return;
  }
  setSelection(claimId, { category, products });
  await ctx.editMessageText(`Pick your reward (${fmtUsd(claim.amountCents)} available):`, {
    reply_markup: productKeyboard(claimId, products, claim.amountCents),
  });
}

export async function handleProduct(
  ctx: Context,
  claimId: string,
  productIndex: number,
): Promise<void> {
  const claim = await mustClaim(claimId);
  assertRecipient(ctx, claim);
  const product = getSelection(claimId)?.products[productIndex];
  if (!product) return editExpired(ctx);

  const remainder = claim.amountCents - product.priceCents;
  const remainderNote =
    remainder > 0
      ? `\nThis uses ${fmtUsd(product.priceCents)} of your ${fmtUsd(claim.amountCents)} reward. The remaining ${fmtUsd(remainder)} is not kept.`
      : "";
  await ctx.editMessageText(
    `You chose <b>${esc(product.name)}</b>.${remainderNote}\nConfirm to redeem — this cannot be undone.`,
    { parse_mode: "HTML", reply_markup: confirmKeyboard(claimId, productIndex) },
  );
}

export async function handleConfirm(
  ctx: Context,
  claimId: string,
  productIndex: number,
): Promise<void> {
  const claim = await mustClaim(claimId);
  assertRecipient(ctx, claim);
  const sel = getSelection(claimId);
  const product = sel?.products[productIndex];
  const country = sel?.country;
  if (!product || !country) return editExpired(ctx);

  // "GLOBAL" means "no country preference" — pass empty so the product's region
  // lock is not enforced against the sentinel (core skips an empty country).
  const redeemCountry = country === "GLOBAL" ? "" : country;

  // redeemClaim is the single source of double-spend safety (atomic
  // recipient_selecting -> redeeming guard + unique redemptions.claimId).
  const result = await redeemClaim(db, bitrefill, {
    claimId,
    product,
    country: redeemCountry,
  });
  if (result.ok && result.redemption) {
    const r = result.redemption;
    const lines = [
      `🎉 Your <b>${esc(product.name)}</b> is ready!`,
      r.code ? `Code: <code>${esc(r.code)}</code>` : undefined,
      r.link ? `Link: ${esc(r.link)}` : undefined,
      r.pin ? `PIN: <code>${esc(r.pin)}</code>` : undefined,
      r.instructions ? esc(r.instructions) : undefined,
      "<i>Keep this private — it is only visible to you.</i>",
    ].filter(Boolean) as string[];
    const text = lines.join("\n");
    clearSelection(claimId);
    // The secret is already issued. If the edit fails (message deleted / too old
    // / blocked), re-send as a fresh message and NEVER let the edit's error —
    // whose payload carries the secret text — reach a logger.
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML" });
    } catch {
      await ctx.api
        .sendMessage(Number(claim.recipientId), text, { parse_mode: "HTML" })
        .catch(() => undefined);
    }
    await postAudit(ctx.api, claim, "redeemed");
  } else {
    await postAudit(ctx.api, claim, "failed");
    await ctx.editMessageText(
      "😞 Sorry — fulfillment failed. Nothing was taken from your reward. You can try again.",
      { reply_markup: retryKeyboard(claimId) },
    );
  }
}

export async function handleRetry(ctx: Context, claimId: string): Promise<void> {
  const existing = await mustClaim(claimId);
  assertRecipient(ctx, existing);
  const claim = await retryFailedClaim(db, claimId);
  const pref = await db.recipientPreference.findUnique({
    where: {
      platform_recipientId: { platform: "telegram", recipientId: claim.recipientId },
    },
  });
  setSelection(claimId, { country: pref?.country, category: undefined, products: [] });
  await ctx.editMessageText(
    `Let's try again. Choose your country for your ${fmtUsd(claim.amountCents)} reward.`,
    { reply_markup: countryKeyboard(claimId, pref?.country) },
  );
}
