# LootDrop

Discord-first, agent-native reward-claim system powered by Bitrefill fulfillment. Admins or AI agents allocate value, BountyGuard enforces budgets and approvals, the recipient chooses what they want, Bitrefill fulfills it.

## Quickstart

Prereqs: Node 20+, pnpm 10 (via corepack), a Discord application + bot token (M0-07).

```sh
pnpm install                 # also generates the Prisma client
cp .env.example .env         # fill in the Discord values; leave BITREFILL_MODE=mock
pnpm db:migrate              # creates the SQLite schema
pnpm db:seed                 # seeds the demo community + policy (uses DISCORD_GUILD_ID)
pnpm bot:register            # registers /reward, /rewards, /myrewards in your guild
pnpm bot                     # starts the bot (process 1)
```

Agent side (process 2) — add to your MCP client (e.g. Claude Code `.mcp.json`):

```json
{
  "mcpServers": {
    "lootdrop": {
      "command": "pnpm",
      "args": ["--dir", "<repo>/apps/mcp-server", "start"],
      "env": {
        "LOOTDROP_COMMUNITY_ID": "<your guild id>",
        "LOOTDROP_AGENT_ID": "agent:game-agent"
      }
    }
  }
}
```

Demo flow: `/reward @alice 10 reason: MVP of tonight's match` → Approve button → Alice's DM (country → category → product → confirm) → private code in DM → redacted public audit line in the log channel. Mock mode mirrors Bitrefill's documented test products, so no API key or funds are needed.

Verify: `pnpm lint` (typecheck all), `pnpm test` (26 tests: policy, status machine, budget reservation, double-spend guard, no-code-at-rest).

## Layout

```txt
apps/discord-bot/     chat commands, components, DMs (process 1)
apps/mcp-server/      agent tools over stdio, identity-bound (process 2)
packages/core/        BountyGuard policy, claim state machine, audit
packages/bitrefill/   product search, invoices, orders (mock + live)
packages/db/          Prisma schema, SQLite (WAL), seed
```

---

# PRD pack

The product and implementation planning docs for LootDrop.

## Files

| File | Purpose |
|---|---|
| `PRD.md` | Full product requirements document. |
| `STATUS.md` | Task board and implementation to-dos. |
| `RESOURCES.md` | Source links and implementation references. |
| `AGENT_INDEX.md` | Agent-readable chunk index and task pickup guide. |
| `agents/SKILL.md` | Draft agent behavior/skill guide. |
| `chunks/` | Topic-specific chunks for agents. |
| `llms.txt` | Compact machine-readable index of this doc pack. |

## Recommended reading

1. `PRD.md` for full context.
2. `STATUS.md` for tasks.
3. `AGENT_INDEX.md` before letting agents implement.
4. `chunks/` as modular context for specialized agents.

## MVP summary

```txt
Discord bot
MCP server
BountyGuard policy engine
Bitrefill test-product fulfillment
Recipient-chosen reward claims
Private redemption delivery
Public audit logs
```
