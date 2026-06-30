import { db } from "./deps.js";
import type { RecipientInfo } from "./parse.js";

interface SeenUser {
  id: number;
  username?: string;
  first_name?: string;
  is_bot?: boolean;
}

/** Remember a member seen posting in a community, so they can be rewarded by name. */
export async function recordUser(communityId: string, user: SeenUser): Promise<void> {
  if (user.is_bot) return;
  const userId = String(user.id);
  await db.knownUser.upsert({
    where: { communityId_userId: { communityId, userId } },
    update: { username: user.username ?? null, firstName: user.first_name ?? null },
    create: {
      communityId,
      userId,
      username: user.username ?? null,
      firstName: user.first_name ?? null,
    },
  });
}

/**
 * Resolve a typed name / @username to members the bot has observed in this
 * community. Exact username/first-name matches win; otherwise falls back to a
 * substring match. (Telegram bots cannot look members up by username via the
 * API, so this is limited to people who have posted or started the bot.)
 */
export async function findRecipients(
  communityId: string,
  query: string,
): Promise<RecipientInfo[]> {
  const q = query.replace(/^@/, "").trim().toLowerCase();
  if (!q) return [];
  const rows = await db.knownUser.findMany({ where: { communityId }, take: 500 });
  const exact = rows.filter(
    (r) => r.username?.toLowerCase() === q || r.firstName?.toLowerCase() === q,
  );
  const matches = exact.length
    ? exact
    : rows.filter(
        (r) =>
          r.username?.toLowerCase().includes(q) ||
          r.firstName?.toLowerCase().includes(q),
      );
  return matches.map((r) => ({ id: r.userId, name: r.username ?? r.firstName ?? r.userId }));
}
