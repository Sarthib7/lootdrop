import { getDb } from "./index.js";

/**
 * Demo seed (M6-01): Sarthi Gaming Guild with the PRD §27.1 policy.
 * Community id comes from DISCORD_GUILD_ID if set, else a local placeholder.
 */
const db = getDb();

const communityId = process.env.DISCORD_GUILD_ID || "guild_demo";

const community = await db.community.upsert({
  where: { id: communityId },
  update: {},
  create: { id: communityId, name: "Sarthi Gaming Guild" },
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
    allowedCategoriesJson: JSON.stringify([
      "gaming",
      "food",
      "shopping",
      "mobile_topup",
    ]),
    allowSelfRewards: false,
    recipientCooldownHours: 24,
  },
});

console.log(`Seeded community ${community.id} with demo policy.`);
await db.$disconnect();
