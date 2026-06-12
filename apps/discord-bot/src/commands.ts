import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { getDb } from "@lootdrop/db";
import { createClaim, getBudgetSnapshot, loadPolicy } from "@lootdrop/core";
import { env } from "./env.js";
import { approvalRow, claimCard, fmtUsd } from "./ui.js";
import { sendClaimDm } from "./flow.js";

const db = getDb();

function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.has(env.adminRoleId);
}

export async function handleReward(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "Only admins can create rewards.",
      ephemeral: true,
    });
    return;
  }
  const user = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason", true);

  await interaction.deferReply();
  const { decision, claim } = await createClaim(db, {
    communityId: interaction.guildId ?? env.guildId,
    recipientDiscordId: user.id,
    amountCents: amount * 100,
    currency: "USD",
    reason,
    createdByType: "human",
    createdById: interaction.user.id,
  });

  if (decision.outcome === "denied") {
    await interaction.editReply(
      `❌ BountyGuard denied this reward: ${decision.reason}`,
    );
    return;
  }

  if (decision.outcome === "auto_approved" && claim) {
    const dmOk = await sendClaimDm(interaction.client, claim);
    await interaction.editReply({
      content: dmOk
        ? `✅ Auto-approved (below threshold). <@${user.id}> got a DM to choose their reward.`
        : `✅ Auto-approved, but I could not DM <@${user.id}> — ask them to enable DMs.`,
      embeds: [claimCard(claim)],
    });
    return;
  }

  await interaction.editReply({
    content: `Reward needs approval (at/above the auto-approve threshold).`,
    embeds: [claimCard(claim!)],
    components: [approvalRow(claim!.id)],
  });
}

export async function handleRewardsPending(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: "Admins only.", ephemeral: true });
    return;
  }
  const pending = await db.rewardClaim.findMany({
    where: {
      communityId: interaction.guildId ?? env.guildId,
      status: "pending_approval",
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  if (pending.length === 0) {
    await interaction.reply({ content: "No claims pending approval.", ephemeral: true });
    return;
  }
  const lines = pending.map(
    (c) =>
      `• \`${c.id}\` — <@${c.recipientDiscordId}> ${fmtUsd(c.amountCents)} — ${c.reason}`,
  );
  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}

export async function handleRewardsBudget(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const communityId = interaction.guildId ?? env.guildId;
  const policy = await loadPolicy(db, communityId);
  const snapshot = await getBudgetSnapshot(db, communityId, policy);
  await interaction.reply({
    content: [
      `**Reward budget** (reserved at claim creation)`,
      `Today: ${fmtUsd(snapshot.reservedDayCents)} reserved of ${fmtUsd(snapshot.dailyBudgetCents)} → ${fmtUsd(snapshot.remainingDayCents)} left`,
      `This week: ${fmtUsd(snapshot.reservedWeekCents)} reserved of ${fmtUsd(snapshot.weeklyBudgetCents)} → ${fmtUsd(snapshot.remainingWeekCents)} left`,
    ].join("\n"),
    ephemeral: true,
  });
}

export async function handleMyRewards(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const claims = await db.rewardClaim.findMany({
    where: {
      communityId: interaction.guildId ?? env.guildId,
      recipientDiscordId: interaction.user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (claims.length === 0) {
    await interaction.reply({ content: "You have no rewards yet.", ephemeral: true });
    return;
  }
  const lines = claims.map(
    (c) => `• ${fmtUsd(c.amountCents)} — ${c.reason} — **${c.status}**`,
  );
  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
