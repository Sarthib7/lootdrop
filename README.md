# LootDrop

Agent-native reward-claim system powered by Bitrefill fulfillment. Admins or AI
agents allocate value, BountyGuard enforces budgets and approvals, the recipient
chooses what they want, Bitrefill fulfills it. Runs on **Telegram** and
**Discord** off one shared core, backed by PostgreSQL.

```txt
apps/telegram-bot/    Telegram bot — commands, inline keyboards, private DMs (grammY)
apps/discord-bot/     Discord bot — slash commands, components, DMs (discord.js)
apps/mcp-server/      agent tools over stdio, identity-bound
packages/core/        BountyGuard policy, claim state machine, audit/redaction
packages/bitrefill/   product search, invoices, orders (mock + live)
packages/db/          Prisma schema, PostgreSQL, migrations, seed
```

## Telegram quickstart

Prereqs: Node 20+, pnpm 10 (via corepack), a Postgres database, and a Telegram
bot token from [@BotFather](https://t.me/BotFather).

```sh
pnpm install                       # also generates the Prisma client
cp .env.example .env               # set TELEGRAM_BOT_TOKEN + DATABASE_URL; leave BITREFILL_MODE=mock
pnpm db:migrate:deploy             # applies the committed migration to your Postgres
pnpm telegram                      # starts the bot (long polling)
```

Then in Telegram:

1. Add the bot to your community group and make it an **admin** (so it can read
   messages and post the public audit line).
2. An admin **replies** to a member's message with `/reward 10 great bug report`
   (or picks the member from the mention menu). On first use the bot initializes
   the group with default budgets.
3. If the reward is at/above the auto-approve threshold, an admin taps **Approve**.
4. The recipient gets a private message to pick country → category → product →
   confirm. (If they've never started the bot, they tap a one-time deep link
   first — Telegram forbids bots from messaging strangers.)
5. The redemption code/link is delivered **privately**; a redacted success line
   is posted publicly in the group.

Commands: `/reward`, `/rewards_pending`, `/rewards_budget`, `/myrewards`, `/start`.

## Discord quickstart

```sh
cp .env.example .env               # fill the DISCORD_* values + DATABASE_URL
pnpm db:migrate:deploy
LOOTDROP_PLATFORM=discord pnpm db:seed   # seeds the demo community + policy for DISCORD_GUILD_ID
pnpm bot:register                  # registers /reward, /rewards, /myrewards in your guild
pnpm bot                           # starts the Discord bot
```

## Agent side (MCP)

Add to your MCP client (e.g. Claude Code `.mcp.json`). Identity is bound at
startup — callers can never choose their own community or requester id.

```json
{
  "mcpServers": {
    "lootdrop": {
      "command": "pnpm",
      "args": ["--dir", "<repo>/apps/mcp-server", "start"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "LOOTDROP_COMMUNITY_ID": "<telegram chat id or discord guild id>",
        "LOOTDROP_AGENT_ID": "agent:game-agent"
      }
    }
  }
}
```

## Deploy to Railway

The repo ships a multi-stage `Dockerfile` (builds the whole workspace in
dependency order — the fix for the original single-package build failure) and a
`railway.json`.

1. Create a project and add a **PostgreSQL** database service.
2. Add a service from this repo. It builds with the `Dockerfile`; set the
   service variables:
   - `TELEGRAM_BOT_TOKEN` = your BotFather token
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (internal reference)
3. On deploy, `prisma migrate deploy` runs first, then the bot starts (long
   polling, `numReplicas: 1`). A `/health` server is exposed on `$PORT`.

The Discord bot can run as a second service from the same image — override its
start command to `node apps/discord-bot/dist/index.js` and set the `DISCORD_*`
variables.

## Verify

```sh
pnpm build     # type-checks/builds every package in dependency order
pnpm lint      # tsc --noEmit per package
pnpm test      # 42 tests: policy, status machine, budget, double-spend guard,
               #            no-code-at-rest, Telegram parse/callback/session helpers
```

Tests run against an in-process Postgres (PGlite/WASM) — the same engine and
generated Prisma client as production, with no Docker required.

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
