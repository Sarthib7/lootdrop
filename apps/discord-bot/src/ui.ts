import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { Claim } from "@lootdrop/core";
import type { Product } from "@lootdrop/bitrefill";

export const fmtUsd = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export const COUNTRIES: Array<{ label: string; value: string }> = [
  { label: "United States", value: "US" },
  { label: "Germany", value: "DE" },
  { label: "India", value: "IN" },
  { label: "United Kingdom", value: "GB" },
  { label: "Other / Global", value: "GLOBAL" },
];

export function claimCard(claim: Claim): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🎁 Reward claim")
    .setColor(claim.status === "pending_approval" ? 0xf5a623 : 0x2ecc71)
    .addFields(
      { name: "Recipient", value: `<@${claim.recipientId}>`, inline: true },
      { name: "Amount", value: fmtUsd(claim.amountCents), inline: true },
      { name: "Status", value: claim.status, inline: true },
      { name: "Reason", value: claim.reason },
    )
    .setFooter({ text: `claim ${claim.id}` });
}

export function approvalRow(claimId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ld|approve|${claimId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ld|deny|${claimId}`)
      .setLabel("Deny")
      .setStyle(ButtonStyle.Danger),
  );
}

export function countryRow(
  claimId: string,
  preferred?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`ld|country|${claimId}`)
    .setPlaceholder("Choose your country");
  for (const c of COUNTRIES) {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(c.label)
        .setValue(c.value)
        .setDefault(c.value === preferred),
    );
  }
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function categoryRow(
  claimId: string,
  country: string,
  categories: string[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`ld|category|${claimId}|${country}`)
    .setPlaceholder("Choose a category")
    .addOptions(
      categories.map((c) =>
        new StringSelectMenuOptionBuilder().setLabel(c).setValue(c),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function productRow(
  claimId: string,
  country: string,
  products: Product[],
  claimAmountCents: number,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`ld|product|${claimId}|${country}`)
    .setPlaceholder("Choose your reward")
    .addOptions(
      products.slice(0, 5).map((p) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${p.name} — ${fmtUsd(p.priceCents)}`)
          // Remainder forfeiture shown BEFORE confirmation (PRD §18.6).
          .setDescription(
            p.priceCents < claimAmountCents
              ? `Uses ${fmtUsd(p.priceCents)} of ${fmtUsd(claimAmountCents)}; remainder not kept.`
              : `Uses the full ${fmtUsd(claimAmountCents)}.`,
          )
          .setValue(p.id),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function confirmRow(
  claimId: string,
  country: string,
  productId: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ld|confirm|${claimId}|${country}|${productId}`)
      .setLabel("Confirm redemption")
      .setStyle(ButtonStyle.Primary),
  );
}

export function retryRow(claimId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ld|retry|${claimId}`)
      .setLabel("Try again")
      .setStyle(ButtonStyle.Secondary),
  );
}
