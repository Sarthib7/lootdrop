/**
 * LootDrop MCP server (M4). Identity is bound at startup from env — callers
 * can NEVER choose their own identity or community (PRD §14.2):
 *   LOOTDROP_COMMUNITY_ID  the one guild this instance serves
 *   LOOTDROP_AGENT_ID      e.g. "agent:game-agent"
 * Exposes safe reward operations only; no raw Bitrefill access, no API keys.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDb } from "@lootdrop/db";
import {
  createClaim,
  getBudgetSnapshot,
  loadPolicy,
} from "@lootdrop/core";

const communityId = process.env.LOOTDROP_COMMUNITY_ID;
const agentId = process.env.LOOTDROP_AGENT_ID;
if (!communityId || !agentId) {
  console.error(
    "Missing LOOTDROP_COMMUNITY_ID or LOOTDROP_AGENT_ID — the MCP server is identity-bound at startup (see .env.example).",
  );
  process.exit(1);
}

const db = getDb();
const fmtUsd = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

const server = new McpServer({ name: "lootdrop", version: "0.1.0" });

server.tool(
  "create_reward_claim",
  "Create a policy-checked reward claim for a community member. BountyGuard decides auto-approval, human approval, or denial. No community_id/requester_id inputs — identity is fixed by server configuration.",
  {
    recipient: z
      .string()
      .describe(
        "Platform user id of the recipient (digits only) — a Discord user id or Telegram user id, depending on the community this server is bound to",
      ),
    amount: z
      .number()
      .int()
      .positive()
      .describe("Whole USD units, e.g. 10 = $10. USD-only MVP."),
    currency: z.enum(["USD"]).default("USD"),
    reason: z.string().min(3).describe("Why they earned it"),
    allowed_categories: z
      .array(z.string())
      .optional()
      .describe("Subset of the community's allowed categories"),
  },
  async (args) => {
    const { decision, claim } = await createClaim(db, {
      communityId,
      recipientId: args.recipient.replace(/^(discord|telegram):/, ""),
      amountCents: args.amount * 100,
      currency: args.currency,
      reason: args.reason,
      categories: args.allowed_categories,
      createdByType: "agent",
      createdById: agentId,
    });
    const payload =
      decision.outcome === "denied"
        ? {
            status: "denied",
            code: decision.code,
            reason: decision.reason,
          }
        : {
            claim_id: claim!.id,
            status:
              decision.outcome === "auto_approved"
                ? "approved"
                : "requires_approval",
            message:
              decision.outcome === "auto_approved"
                ? "Claim auto-approved below threshold. The recipient will be messaged privately by the bot."
                : "Claim created and waiting for admin approval in the community chat.",
          };
    return { content: [{ type: "text", text: JSON.stringify(payload) }] };
  },
);

server.tool(
  "list_reward_budget",
  "Show the community's remaining reward budget (reserved-at-creation model). Contains no secrets.",
  {},
  async () => {
    const policy = await loadPolicy(db, communityId);
    const s = await getBudgetSnapshot(db, communityId, policy);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            daily: {
              budget: fmtUsd(s.dailyBudgetCents),
              reserved: fmtUsd(s.reservedDayCents),
              remaining: fmtUsd(s.remainingDayCents),
            },
            weekly: {
              budget: fmtUsd(s.weeklyBudgetCents),
              reserved: fmtUsd(s.reservedWeekCents),
              remaining: fmtUsd(s.remainingWeekCents),
            },
            max_single_reward: fmtUsd(policy.maxSingleRewardCents),
            auto_approve_below: fmtUsd(policy.autoApproveBelowCents),
            allowed_categories: policy.allowedCategories,
          }),
        },
      ],
    };
  },
);

server.tool(
  "list_pending_claims",
  "List reward claims awaiting human approval. Redemption data is never included.",
  {},
  async () => {
    const pending = await db.rewardClaim.findMany({
      where: { communityId, status: "pending_approval" },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            pending.map((c) => ({
              claim_id: c.id,
              recipient: c.recipientId,
              amount: fmtUsd(c.amountCents),
              reason: c.reason,
              created_by: c.createdById,
              created_at: c.createdAt.toISOString(),
            })),
          ),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `LootDrop MCP server up — community ${communityId}, identity ${agentId}`,
);
