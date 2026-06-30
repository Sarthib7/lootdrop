import type { Context } from "grammy";
import { createClaim } from "@lootdrop/core";
import { db } from "./deps.js";
import { ensureCommunity } from "./admin.js";
import { deliverToRecipient, deliveryNote } from "./delivery.js";
import { logBotError } from "./log.js";
import { approvalKeyboard, claimCardText } from "./ui.js";

export interface RewardInput {
  communityId: string;
  recipientId: string;
  amountCents: number;
  reason: string;
  createdById: string;
}

/**
 * Create a policy-checked claim and announce the outcome in the chat. Shared by
 * the direct (reply/mention) path and the name-resolved confirmation path.
 */
export async function createAndAnnounceReward(
  ctx: Context,
  input: RewardInput,
): Promise<void> {
  const created = await ensureCommunity(
    input.communityId,
    ctx.chat?.title ?? "Community",
  );
  if (created) {
    await ctx.reply(
      "🛠️ Initialized LootDrop for this group with default budgets (daily $100 / weekly $500, auto-approve under $5).",
    );
  }

  const { decision, claim } = await createClaim(db, {
    communityId: input.communityId,
    recipientId: input.recipientId,
    amountCents: input.amountCents,
    currency: "USD",
    reason: input.reason,
    createdByType: "human",
    createdById: input.createdById,
  });

  if (decision.outcome === "denied") {
    await ctx.reply(`❌ BountyGuard denied this reward: ${decision.reason}`);
    return;
  }

  if (decision.outcome === "auto_approved" && claim) {
    const botUsername = ctx.me.username;
    let note: string;
    try {
      note = deliveryNote(await deliverToRecipient(ctx.api, botUsername, claim), botUsername);
    } catch (err) {
      logBotError("auto-approve delivery", err);
      note = `⚠️ Couldn't message the recipient right now. They can open it here: https://t.me/${botUsername}?start=claim_${claim.id}`;
    }
    await ctx.reply(
      `${claimCardText(claim)}\n\n✅ Auto-approved (below threshold). ${note}`,
      { parse_mode: "HTML" },
    );
    return;
  }

  await ctx.reply(
    `${claimCardText(claim!)}\n\nNeeds admin approval (at/above the auto-approve threshold).`,
    { parse_mode: "HTML", reply_markup: approvalKeyboard(claim!.id) },
  );
}
