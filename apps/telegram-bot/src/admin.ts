import type { Context } from "grammy";
import { env } from "./env.js";
import { db } from "./deps.js";

/** Reward creation/approval is admin-only (M2-04). */
export async function isAdmin(ctx: Context, userId: number): Promise<boolean> {
  if (env.adminIds.has(String(userId))) return true;
  const chat = ctx.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) return false;
  try {
    const member = await ctx.api.getChatMember(chat.id, userId);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}

// PRD §27.1 demo defaults — used to onboard a new group on its first /reward.
const DEFAULT_POLICY = {
  currency: "USD",
  dailyBudgetCents: 100_00,
  weeklyBudgetCents: 500_00,
  maxSingleRewardCents: 25_00,
  autoApproveBelowCents: 5_00,
  claimExpiryDays: 30,
  allowedCategoriesJson: JSON.stringify([
    "gaming",
    "food",
    "shopping",
    "mobile_topup",
  ]),
  allowSelfRewards: false,
  recipientCooldownHours: 24,
};

/**
 * Make sure a community + policy exist for this Telegram chat. Returns true when
 * it had to bootstrap one (so the caller can announce default budgets). Lets an
 * admin add the bot to a group and run /reward with zero manual DB setup.
 */
export async function ensureCommunity(
  chatId: string,
  name: string,
): Promise<boolean> {
  const existing = await db.community.findUnique({
    where: { id: chatId },
    include: { policy: true },
  });
  if (existing?.policy) return false;

  await db.community.upsert({
    where: { id: chatId },
    update: { platform: "telegram", name },
    create: { id: chatId, platform: "telegram", name },
  });
  await db.communityPolicy.upsert({
    where: { communityId: chatId },
    update: {},
    create: { communityId: chatId, ...DEFAULT_POLICY },
  });
  return true;
}
