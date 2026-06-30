import type { Context } from "grammy";
import {
  ClaimError,
  getBudgetSnapshot,
  loadPolicy,
  openClaimForSelection,
} from "@lootdrop/core";
import { db } from "./deps.js";
import { isAdmin } from "./admin.js";
import { parseRewardArgs, resolveRecipient } from "./parse.js";
import { findRecipients } from "./roster.js";
import { putPending } from "./pending.js";
import { createAndAnnounceReward } from "./reward.js";
import { setSelection } from "./session.js";
import { confirmRewardKeyboard, countryKeyboard, esc, fmtUsd } from "./ui.js";

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
    await ctx.reply(parsed.error, { parse_mode: "Markdown" });
    return;
  }
  const { amount, reason, recipientHint } = parsed.value;
  const communityId = String(ctx.chat!.id);
  const createdById = String(fromId);

  // 1. Explicit recipient (reply or text_mention) -> create directly.
  const explicit = resolveRecipient(ctx.message ?? {});
  if (explicit) {
    await createAndAnnounceReward(ctx, {
      communityId,
      recipientId: explicit.id,
      amountCents: amount * 100,
      reason,
      createdById,
    });
    return;
  }

  // 2. Recipient typed by name/@username -> resolve from the roster + confirm.
  if (recipientHint) {
    const matches = await findRecipients(communityId, recipientHint);
    if (matches.length === 1) {
      const r = matches[0];
      const token = putPending({
        communityId,
        recipientId: r.id,
        recipientName: r.name ?? r.id,
        amountCents: amount * 100,
        reason,
        createdById,
      });
      await ctx.reply(
        `Reward <b>${esc(r.name ?? r.id)}</b> with <b>${fmtUsd(amount * 100)}</b>?\nReason: ${esc(reason)}`,
        { parse_mode: "HTML", reply_markup: confirmRewardKeyboard(token) },
      );
      return;
    }
    if (matches.length > 1) {
      const names = matches.slice(0, 5).map((m) => `@${m.name ?? m.id}`).join(", ");
      await ctx.reply(
        `Several members match "${esc(recipientHint)}": ${esc(names)}. Reply to the right person's message, or @mention them.`,
        { parse_mode: "HTML" },
      );
      return;
    }
    await ctx.reply(
      `I haven't seen "${esc(recipientHint)}" post in this group yet, so I can't reward them by name. Reply to their message (or @mention them) once and I'll remember them.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  // 3. No recipient given.
  await ctx.reply(
    "👉 Reply to the member you want to reward, or include their name: `/reward <name> <amount> <reason>` — e.g. `/reward @alice 10 great bug report`.",
    { parse_mode: "Markdown" },
  );
}

/** /whoami — show the caller's Telegram user id and the chat id (for config). */
export async function handleWhoami(ctx: Context): Promise<void> {
  await ctx.reply(
    `Your Telegram user id: <code>${ctx.from?.id ?? "?"}</code>\nThis chat id: <code>${ctx.chat?.id ?? "?"}</code>`,
    { parse_mode: "HTML" },
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
