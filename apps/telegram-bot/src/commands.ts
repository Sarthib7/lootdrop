import type { Context } from "grammy";
import {
  ClaimError,
  createClaim,
  getBudgetSnapshot,
  loadPolicy,
  openClaimForSelection,
} from "@lootdrop/core";
import { db } from "./deps.js";
import { ensureCommunity, isAdmin } from "./admin.js";
import { parseRewardArgs, resolveRecipient } from "./parse.js";
import { deliverToRecipient, deliveryNote } from "./delivery.js";
import { logBotError } from "./log.js";
import { setSelection } from "./session.js";
import {
  approvalKeyboard,
  claimCardText,
  countryKeyboard,
  esc,
  fmtUsd,
} from "./ui.js";

function isGroup(ctx: Context): boolean {
  const t = ctx.chat?.type;
  return t === "group" || t === "supergroup";
}

export async function handleReward(ctx: Context): Promise<void> {
  if (!isGroup(ctx)) {
    await ctx.reply(
      "Run /reward inside your community group, replying to the member you want to reward.",
    );
    return;
  }
  const fromId = ctx.from?.id;
  if (!fromId || !(await isAdmin(ctx, fromId))) {
    await ctx.reply("Only admins can create rewards.");
    return;
  }

  const parsed = parseRewardArgs(typeof ctx.match === "string" ? ctx.match : "");
  if (!parsed.ok) {
    await ctx.reply(parsed.error);
    return;
  }
  const recipient = resolveRecipient(ctx.message ?? {});
  if (!recipient) {
    await ctx.reply(
      "Reply to the member's message (or pick them from the mention menu) so I know who to reward.",
    );
    return;
  }

  const communityId = String(ctx.chat!.id);
  const created = await ensureCommunity(communityId, ctx.chat!.title ?? "Community");
  if (created) {
    await ctx.reply(
      "🛠️ Initialized LootDrop for this group with default budgets (daily $100 / weekly $500, auto-approve under $5).",
    );
  }

  const { decision, claim } = await createClaim(db, {
    communityId,
    recipientId: recipient.id,
    amountCents: parsed.value.amount * 100,
    currency: "USD",
    reason: parsed.value.reason,
    createdByType: "human",
    createdById: String(fromId),
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

export async function handleRewardsPending(ctx: Context): Promise<void> {
  if (!isGroup(ctx)) return;
  const fromId = ctx.from?.id;
  if (!fromId || !(await isAdmin(ctx, fromId))) {
    await ctx.reply("Admins only.");
    return;
  }
  const pending = await db.rewardClaim.findMany({
    where: { communityId: String(ctx.chat!.id), status: "pending_approval" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  if (pending.length === 0) {
    await ctx.reply("No claims pending approval.");
    return;
  }
  const lines = pending.map(
    (c) => `• <code>${c.id}</code> — ${fmtUsd(c.amountCents)} — ${esc(c.reason)}`,
  );
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

export async function handleRewardsBudget(ctx: Context): Promise<void> {
  if (!isGroup(ctx)) return;
  const communityId = String(ctx.chat!.id);
  let policy;
  try {
    policy = await loadPolicy(db, communityId);
  } catch {
    await ctx.reply(
      "LootDrop isn't set up here yet. An admin can run /reward to initialize it.",
    );
    return;
  }
  const s = await getBudgetSnapshot(db, communityId, policy);
  await ctx.reply(
    [
      "<b>Reward budget</b> (reserved at claim creation)",
      `Today: ${fmtUsd(s.reservedDayCents)} of ${fmtUsd(s.dailyBudgetCents)} → ${fmtUsd(s.remainingDayCents)} left`,
      `This week: ${fmtUsd(s.reservedWeekCents)} of ${fmtUsd(s.weeklyBudgetCents)} → ${fmtUsd(s.remainingWeekCents)} left`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}

export async function handleMyRewards(ctx: Context): Promise<void> {
  const fromId = ctx.from?.id;
  if (!fromId) return;
  const where = isGroup(ctx)
    ? { communityId: String(ctx.chat!.id), recipientId: String(fromId) }
    : { recipientId: String(fromId) };
  const claims = await db.rewardClaim.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (claims.length === 0) {
    await ctx.reply("You have no rewards yet.");
    return;
  }
  const lines = claims.map(
    (c) => `• ${fmtUsd(c.amountCents)} — ${esc(c.reason)} — <b>${esc(c.status)}</b>`,
  );
  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/** /start — welcome, or resume a claim from a t.me deep link (claim_<id>). */
export async function handleStart(ctx: Context): Promise<void> {
  const payload = typeof ctx.match === "string" ? ctx.match : "";
  const fromId = ctx.from?.id;

  if (payload.startsWith("claim_") && fromId) {
    const claimId = payload.slice("claim_".length);
    const claim = await db.rewardClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      await ctx.reply("That reward link is no longer valid.");
      return;
    }
    if (claim.recipientId !== String(fromId)) {
      await ctx.reply("That reward isn't addressed to you.");
      return;
    }
    try {
      const open = await openClaimForSelection(db, claimId);
      const pref = await db.recipientPreference.findUnique({
        where: {
          platform_recipientId: {
            platform: "telegram",
            recipientId: open.recipientId,
          },
        },
      });
      setSelection(claimId, { country: pref?.country });
      await ctx.reply(
        `🎉 You received a <b>${fmtUsd(open.amountCents)} LootDrop</b>!\nReason: ${esc(open.reason)}\n\nChoose your country to see your reward options.`,
        { parse_mode: "HTML", reply_markup: countryKeyboard(claimId, pref?.country) },
      );
    } catch (e) {
      await ctx.reply(
        e instanceof ClaimError ? e.message : "This reward can't be opened right now.",
      );
    }
    return;
  }

  await ctx.reply(
    [
      "👋 <b>LootDrop</b> — community rewards, fulfilled by Bitrefill.",
      "",
      "Admins: in your group, reply to a member with <code>/reward &lt;amount&gt; &lt;reason&gt;</code>.",
      "Recipients: when you get a reward, I'll message you here to choose it.",
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}
