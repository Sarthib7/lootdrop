import type { PrismaClient } from "@lootdrop/db";
import {
  BUDGET_RESERVING_STATUSES,
  COOLDOWN_COUNTING_STATUSES,
} from "./statuses.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rolling-window reservation totals (PRD §17.3): reserve at creation. */
export async function getReservedCents(
  db: PrismaClient,
  communityId: string,
  windowMs: number,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - windowMs);
  const agg = await db.rewardClaim.aggregate({
    where: {
      communityId,
      status: { in: BUDGET_RESERVING_STATUSES },
      createdAt: { gte: since },
    },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

export interface BudgetSnapshot {
  dailyBudgetCents: number;
  weeklyBudgetCents: number;
  reservedDayCents: number;
  reservedWeekCents: number;
  remainingDayCents: number;
  remainingWeekCents: number;
}

export async function getBudgetSnapshot(
  db: PrismaClient,
  communityId: string,
  policy: { dailyBudgetCents: number; weeklyBudgetCents: number },
  now: Date = new Date(),
): Promise<BudgetSnapshot> {
  const [reservedDayCents, reservedWeekCents] = await Promise.all([
    getReservedCents(db, communityId, DAY_MS, now),
    getReservedCents(db, communityId, 7 * DAY_MS, now),
  ]);
  return {
    dailyBudgetCents: policy.dailyBudgetCents,
    weeklyBudgetCents: policy.weeklyBudgetCents,
    reservedDayCents,
    reservedWeekCents,
    remainingDayCents: Math.max(0, policy.dailyBudgetCents - reservedDayCents),
    remainingWeekCents: Math.max(0, policy.weeklyBudgetCents - reservedWeekCents),
  };
}

/** Recipient claims that reached approved+ inside the cooldown window. */
export async function getRecipientRecentApprovedCount(
  db: PrismaClient,
  communityId: string,
  recipientDiscordId: string,
  cooldownHours: number,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);
  return db.rewardClaim.count({
    where: {
      communityId,
      recipientDiscordId,
      status: { in: COOLDOWN_COUNTING_STATUSES },
      createdAt: { gte: since },
    },
  });
}
