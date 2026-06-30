import { getDb } from "./index.js";

/**
 * Demo seed (M6-01): Sarthi Gaming community with the PRD §27.1 policy.
 * Community id + platform are taken from env:
 *   LOOTDROP_PLATFORM   "discord" | "telegram" (default "telegram")
 *   LOOTDROP_COMMUNITY_ID / TELEGRAM_COMMUNITY_ID / DISCORD_GUILD_ID
 */
const db = getDb();

const platform = process.env.LOOTDROP_PLATFORM || "telegram";
const communityId =
  process.env.LOOTDROP_COMMUNITY_ID ||
  process.env.TELEGRAM_COMMUNITY_ID ||
  process.env.DISCORD_GUILD_ID ||
  "community_demo";

const community = await db.community.upsert({
  where: { id: communityId },
  update: { platform },
  create: { id: communityId, platform, name: "Sarthi Gaming Community" },
});

await db.communityPolicy.upsert({
  where: { communityId: community.id },
  update: {},
  create: {
    communityId: community.id,
    currency: "USD",
    dailyBudgetCents: 100_00,
    weeklyBudgetCents: 500_00,
    maxSingleRewardCents: 25_00,
    autoApproveBelowCents: 5_00,
    claimExpiryDays: 30,
    // Bitrefill's real test-product categories (gift cards = "gifts",
    // phone refills = "phone").
    allowedCategoriesJson: JSON.stringify(["gifts", "phone"]),
    allowSelfRewards: false,
    recipientCooldownHours: 24,
  },
});

console.log(`Seeded community ${community.id} with demo policy.`);
await db.$disconnect();
