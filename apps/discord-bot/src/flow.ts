import type {
  ButtonInteraction,
  Client,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js";
import { getDb } from "@lootdrop/db";
import { getBitrefillClient, type Product } from "@lootdrop/bitrefill";
import {
  approveClaim,
  type Claim,
  ClaimError,
  denyClaim,
  loadPolicy,
  openClaimForSelection,
  redeemClaim,
  retryFailedClaim,
} from "@lootdrop/core";
import { env } from "./env.js";
import {
  categoryRow,
  claimCard,
  confirmRow,
  countryRow,
  fmtUsd,
  productRow,
  retryRow,
} from "./ui.js";

const db = getDb();
const bitrefill = getBitrefillClient();

/** Search valid products for a claim: category + price <= claim value (§18.6). */
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

export async function sendClaimDm(client: Client, claim: Claim): Promise<boolean> {
  try {
    const user = await client.users.fetch(claim.recipientDiscordId);
    const pref = await db.recipientPreference.findUnique({
      where: { recipientDiscordId: claim.recipientDiscordId },
    });
    await user.send({
      content: `You received a **${fmtUsd(claim.amountCents)} LootDrop**! Reason: ${claim.reason}\nChoose your country to see your reward options.`,
      components: [countryRow(claim.id, pref?.country)],
    });
    return true;
  } catch {
    // DM disabled — known risk (PRD §25); surface to admin, don't crash.
    return false;
  }
}

export async function postAuditMessage(
  client: Client,
  claim: Claim,
  status: "redeemed" | "failed",
): Promise<void> {
  // Public line: recipient + amount + reason + status ONLY (P0-09).
  const channel = (await client.channels.fetch(env.logChannelId)) as TextChannel;
  const icon = status === "redeemed" ? "✅" : "⚠️";
  await channel.send(
    `🎁 <@${claim.recipientDiscordId}> received a ${fmtUsd(claim.amountCents)} reward — ${claim.reason} ${icon} ${status}`,
  );
}

export async function handleApprovalButton(
  interaction: ButtonInteraction,
  action: "approve" | "deny",
  claimId: string,
): Promise<void> {
  try {
    if (action === "approve") {
      const claim = await approveClaim(db, claimId, interaction.user.id);
      const dmOk = await sendClaimDm(interaction.client, claim);
      await interaction.update({
        embeds: [claimCard(claim)],
        components: [],
      });
      await interaction.followUp({
        content: dmOk
          ? `Approved. <@${claim.recipientDiscordId}> got a DM to choose their reward.`
          : `Approved, but I could not DM <@${claim.recipientDiscordId}> (DMs disabled?). Ask them to enable DMs, then I'll retry on their next interaction.`,
        ephemeral: true,
      });
    } else {
      const claim = await denyClaim(db, claimId, interaction.user.id);
      await interaction.update({ embeds: [claimCard(claim)], components: [] });
    }
  } catch (err) {
    const message =
      err instanceof ClaimError ? err.message : "Something went wrong.";
    await interaction.reply({ content: message, ephemeral: true }).catch(() => {
      void interaction.followUp({ content: message, ephemeral: true });
    });
  }
}

export async function handleCountrySelect(
  interaction: StringSelectMenuInteraction,
  claimId: string,
): Promise<void> {
  const country = interaction.values[0];
  const claim = await openClaimForSelection(db, claimId);
  await db.recipientPreference.upsert({
    where: { recipientDiscordId: claim.recipientDiscordId },
    update: { country },
    create: { recipientDiscordId: claim.recipientDiscordId, country },
  });
  const categories = JSON.parse(claim.allowedCategoriesJson) as string[];
  await interaction.update({
    content: `Country: **${country}**. Now choose a category for your ${fmtUsd(claim.amountCents)} reward.`,
    components: [categoryRow(claim.id, country, categories)],
  });
}

export async function handleCategorySelect(
  interaction: StringSelectMenuInteraction,
  claimId: string,
  country: string,
): Promise<void> {
  const category = interaction.values[0];
  const claim = await mustClaim(claimId);
  const products = await productsForClaim(claim, country, category);
  if (products.length === 0) {
    await interaction.update({
      content: `No **${category}** rewards fit ${fmtUsd(claim.amountCents)} in your country. Pick another category.`,
      components: [
        categoryRow(claim.id, country, JSON.parse(claim.allowedCategoriesJson)),
      ],
    });
    return;
  }
  await interaction.update({
    content: `Pick your reward (${fmtUsd(claim.amountCents)} available):`,
    components: [productRow(claim.id, country, products, claim.amountCents)],
  });
}

export async function handleProductSelect(
  interaction: StringSelectMenuInteraction,
  claimId: string,
  country: string,
): Promise<void> {
  const productId = interaction.values[0];
  const product = await findProduct(productId);
  const claim = await mustClaim(claimId);
  const remainder = claim.amountCents - product.priceCents;
  const remainderNote =
    remainder > 0
      ? `\nThis uses ${fmtUsd(product.priceCents)} of your ${fmtUsd(claim.amountCents)} reward. The remaining ${fmtUsd(remainder)} is not kept.`
      : "";
  await interaction.update({
    content: `You chose **${product.name}**.${remainderNote}\nConfirm to redeem — this cannot be undone.`,
    components: [confirmRow(claimId, country, productId)],
  });
}

export async function handleConfirmButton(
  interaction: ButtonInteraction,
  claimId: string,
  country: string,
  productId: string,
): Promise<void> {
  await interaction.deferUpdate();
  const product = await findProduct(productId);
  const claim = await mustClaim(claimId);
  try {
    const result = await redeemClaim(db, bitrefill, {
      claimId,
      product,
      country,
    });
    if (result.ok && result.redemption) {
      const r = result.redemption;
      const lines = [
        `🎉 Your **${product.name}** is ready!`,
        r.code ? `Code: \`${r.code}\`` : undefined,
        r.link ? `Link: ${r.link}` : undefined,
        r.pin ? `PIN: \`${r.pin}\`` : undefined,
        r.instructions,
        "_Keep this private — it is only visible to you._",
      ].filter(Boolean);
      await interaction.editReply({ content: lines.join("\n"), components: [] });
      await postAuditMessage(interaction.client, claim, "redeemed");
    } else {
      await interaction.editReply({
        content:
          "😞 Sorry — fulfillment failed. Nothing was taken from your reward. You can try again.",
        components: [retryRow(claimId)],
      });
    }
  } catch (err) {
    const message =
      err instanceof ClaimError && err.code === "already_redeeming"
        ? "This claim is already being redeemed."
        : err instanceof ClaimError
          ? err.message
          : "Unexpected error during redemption.";
    await interaction.editReply({ content: message, components: [] });
  }
}

export async function handleRetryButton(
  interaction: ButtonInteraction,
  claimId: string,
): Promise<void> {
  const claim = await retryFailedClaim(db, claimId);
  const pref = await db.recipientPreference.findUnique({
    where: { recipientDiscordId: claim.recipientDiscordId },
  });
  await interaction.update({
    content: `Let's try again. Choose your country for your ${fmtUsd(claim.amountCents)} reward.`,
    components: [countryRow(claim.id, pref?.country)],
  });
}

async function mustClaim(claimId: string): Promise<Claim> {
  const claim = await db.rewardClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ClaimError("not_found", `Claim not found: ${claimId}`);
  return claim;
}

async function findProduct(productId: string): Promise<Product> {
  const all = await bitrefill.searchProducts({ includeTestProducts: true });
  const product = all.find((p) => p.id === productId);
  if (!product) throw new ClaimError("invalid_product", `Unknown product: ${productId}`);
  return product;
}

export { loadPolicy };
