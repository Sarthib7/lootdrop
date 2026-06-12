# LootDrop STATUS.md

**Document status:** Active task tracker  
**Last updated:** 2026-06-11  
**Project:** LootDrop / BountyGuard  

---

## 0. Status legend

| Status | Meaning |
|---|---|
| `TODO` | Not started. |
| `READY` | Well-defined and ready for an agent/dev to pick up. |
| `IN_PROGRESS` | Currently being implemented. |
| `BLOCKED` | Needs external dependency, decision, or credential. |
| `DONE` | Completed and accepted. |
| `CUT` | Removed from MVP. |

Priority:

| Priority | Meaning |
|---|---|
| `P0` | Required for hackathon demo. |
| `P1` | Strong prototype / likely next. |
| `P2` | Post-hackathon. |

---

## 1. Current product decision

Build **LootDrop** as a Discord-first, agent-native reward-claim system.

Architecture:

```txt
Discord bot + MCP server + BountyGuard policy engine + Bitrefill test-product fulfillment + audit logs
```

MVP excludes:

```txt
web dashboard
cash-out/wallet
regional arbitrage
browser extension
real-money autonomous purchases
```

---

## 2. Milestone board

### M0 — project scaffolding

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M0-01 | P0 | READY | Create repo structure | `apps/discord-bot`, `apps/mcp-server`, `packages/core`, `packages/db`, `packages/bitrefill` exist. | None |
| M0-02 | P0 | READY | Add TypeScript tooling | `pnpm install`, `pnpm lint`, `pnpm test` run. | M0-01 |
| M0-03 | P0 | READY | Configure env template | `.env.example` includes Discord, Bitrefill, DB, encryption keys. | M0-01 |
| M0-04 | P0 | READY | Add local SQLite/Prisma setup | DB migrates locally. | M0-02 |
| M0-05 | P0 | READY | Add README quickstart | New dev can run bot and MCP locally. | M0-01 |
| M0-06 | P0 | READY | Get Bitrefill API key | Bitrefill account created; Personal API key generated (Account > Developers, self-serve/instant); test products listable with `include_test_products=true`. | None |
| M0-07 | P0 | READY | Create Discord application | Bot token issued; bot invited to test server with required scopes/intents (DMs, slash commands, components). | None |
| M0-08 | P0 | READY | Set up demo test server | Test guild with admin role, log channel, and second account (Alice) with DMs open. | M0-07 |

### M1 — data model and policy engine

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M1-01 | P0 | READY | Implement tables | Communities, policies, claims, approvals, redemptions, audit logs. | M0-04 |
| M1-02 | P0 | READY | Implement claim status machine | Valid transitions enforced. | M1-01 |
| M1-03 | P0 | READY | Implement policy config | Default policy seed created for demo guild. | M1-01 |
| M1-04 | P0 | READY | Implement policy checks | Max reward, budget, self-reward, role/requester, category allowlist. | M1-03 |
| M1-05 | P0 | READY | Implement audit logger | Every claim transition writes audit event. | M1-01 |
| M1-06 | P1 | TODO | Add duplicate event detection | Same event_id cannot be rewarded twice. | M1-04 |
| M1-07 | P1 | TODO | Add recipient cooldown | Recipient cannot receive too many claims in cooldown window. | M1-04 |

### M2 — Discord bot MVP

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M2-01 | P0 | READY | Register `/reward` command | Guild command appears and accepts user, amount, reason. | M0-02 |
| M2-02 | P0 | READY | Create claim from `/reward` | Command persists claim and returns status card. | M1-04, M2-01 |
| M2-03 | P0 | READY | Add approval buttons | Admin can approve/deny pending claim. | M2-02 |
| M2-04 | P0 | READY | Enforce admin/role permissions | Non-admin cannot approve. | M2-03 |
| M2-05 | P0 | READY | Recipient DM flow | Approved recipient receives DM with country/category choices. | M2-03 |
| M2-06 | P0 | READY | Product selection UI | Recipient can choose test product. | M2-05, M3-02 |
| M2-07 | P0 | READY | Private redemption delivery | Code/link sent only to recipient DM. | M2-06, M3-03 |
| M2-08 | P0 | READY | Public audit log message | Channel logs success with code redacted. | M1-05, M2-07 |
| M2-09 | P1 | TODO | Add right-click user command | User context menu can start reward. | M2-01 |
| M2-10 | P1 | TODO | Add right-click message command | Message context can start reward from contribution. | M2-01 |

### M3 — Bitrefill integration

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M3-01 | P0 | READY | Build Bitrefill client shell | Has auth, base URL, error handling, mocked mode. | M0-03 |
| M3-02 | P0 | READY | List/search test products | Can find `test-gift-card-code` and `test-gift-card-link`. | M3-01 |
| M3-03 | P0 | READY | Fulfill test gift card | Creates invoice/order in test mode or mocked mode; returns code/link shape. | M3-02 |
| M3-04 | P0 | READY | Handle redemption fields | Supports code, link, pin, instructions. | M3-03 |
| M3-05 | P1 | TODO | Product cache | Cache catalog/search results to reduce quota usage. | M3-02 |
| M3-06 | P1 | TODO | Webhook endpoint | Idempotent `/webhooks/bitrefill` handler. Skip for hackathon demo — polling covers it without a public URL. | M3-03 |
| M3-07 | P0 | READY | Polling fallback | Poll invoice/order status until final state; demo uses polling, not webhooks (no public URL needed). | M3-03 |
| M3-08 | P2 | TODO | Real purchase toggle | Admin-only live mode with explicit confirmation. | M3-06 |

### M4 — MCP / agent plugin

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M4-01 | P0 | READY | Create MCP server scaffold | Agent client can connect locally. | M0-02 |
| M4-02 | P0 | READY | Tool: `create_reward_claim` | Agent can create claim; policy decides approval status. | M1-04, M4-01 |
| M4-03 | P0 | READY | Tool: `list_reward_budget` | Agent can read remaining budget without secrets. | M1-03, M4-01 |
| M4-04 | P0 | READY | Tool: `list_pending_claims` | Admin-scoped listing works. | M1-01, M4-01 |
| M4-05 | P1 | TODO | Tool: `suggest_reward_amount` | Agent gets recommended amount from contribution category. | M4-01 |
| M4-06 | P1 | TODO | Tool: `search_claim_options` | Agent can help recipient/admin browse options. | M3-02, M4-01 |
| M4-07 | P1 | TODO | Tool: `get_reward_audit_log` | Returns redacted audit events. | M1-05, M4-01 |
| M4-08 | P1 | TODO | Agent skill docs | `agents/SKILL.md` tested against tools. | M4-02 |

### M5 — security, privacy, and safety

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M5-01 | P0 | READY | Secret handling | Bitrefill API key only server-side. | M0-03 |
| M5-02 | P0 | READY | No code at rest | Redemption info never persisted; DB stores order/invoice IDs only; delivery fetches from Bitrefill on demand. Day-1 check: order retrieval returns redemption info repeatedly. | M3-04 |
| M5-03 | P0 | READY | Redaction utilities | No redemption info in public logs or MCP audit responses. | M1-05 |
| M5-04 | P0 | READY | Approval threshold tests | Over-threshold rewards require approval. | M1-04 |
| M5-05 | P1 | TODO | Idempotency keys | Duplicate command/MCP call cannot double-create claims. | M1-02 |
| M5-06 | P1 | TODO | Abuse rules | Join age, cooldown, duplicate event id, rate limits. | M1-04 |
| M5-07 | P0 | READY | Redemption double-spend guard | Unique constraint on `redemptions.claim_id` + atomic `recipient_selecting → redeeming` transition; double-click Confirm is a no-op, never two invoices. | M1-02, M3-03 |

### M6 — demo polish

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M6-01 | P0 | READY | Demo seed data | Demo guild/admin/Alice/policy seeded. | M1-01 |
| M6-02 | P0 | READY | Demo script | 3-minute script documented. | M2-08, M4-02 |
| M6-03 | P0 | READY | Screenshots/GIF | Optional proof of flow. | M2-08 |
| M6-04 | P0 | READY | Pitch slide bullets | Problem, solution, demo, Bitrefill value. | PRD |
| M6-05 | P1 | TODO | Failure demo | Show failed test product handling. | M3-03 |

### M7 — post-hackathon roadmap

| ID | Priority | Status | Task | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| M7-01 | P2 | TODO | GitHub reward integration | Reward PR/issue contributors. | M4-02 |
| M7-02 | P2 | TODO | Tournament campaign template | Top 3 + MVP reward rules. | M1-04 |
| M7-03 | P2 | TODO | Sponsor pool | Sponsored reward budget with branding. | M1-03 |
| M7-04 | P2 | TODO | Web dashboard | Multi-guild policy + analytics. | M1-01 |
| M7-05 | P2 | TODO | Affiliate/partner tracking | Bitrefill partner/affiliate reporting. | Business decision |

---

## 3. Recommended first implementation order

1. Scaffold TypeScript repo.
2. Build DB schema and claim status machine.
3. Build policy engine with tests.
4. Build Discord `/reward` command.
5. Build approval buttons.
6. Build recipient DM flow with fake/test product.
7. Add Bitrefill test-product client.
8. Add private redemption delivery and audit logs.
9. Add MCP `create_reward_claim`.
10. Polish demo script.

---

## 4. Definition of done for hackathon MVP

The MVP is done when this flow works end-to-end:

```txt
/reward @alice 10 reason: MVP of tonight's match
        ↓
policy check passes
        ↓
admin approves in Discord
        ↓
Alice receives DM
        ↓
Alice chooses country/category/test product
        ↓
Bitrefill test product returns redemption info
        ↓
Alice receives private code/link
        ↓
public audit log is posted with code redacted
        ↓
agent can create same claim through MCP
```

---

## 5. Known blockers / decisions needed

| Decision | Default | Impact |
|---|---|---|
| Bitrefill + Discord credentials | Get day 1 (M0-06/07/08) | Everything downstream blocks on these. Personal API key is self-serve/instant; Discord app setup is minutes. |
| Webhooks vs polling for demo | Polling (M3-07) | No public URL needed; webhooks deferred to P1. |
| Remainder on partial-value redemption | Forfeited, shown upfront | See PRD 18.6. No carryover/multi-product in MVP. |
| Budget accounting | Reserve at claim creation, release on deny/expire/cancel/fail | See PRD 17.3. |
| Discord-only vs Discord+Telegram | Discord-only | Simpler MVP. |
| Live Bitrefill purchases | Test products only | Safer demo. |
| Database | SQLite/Prisma | Fastest local development. |
| Product name | LootDrop | Good gaming/Discord fit. |
| Agent interface | MCP | Strong hackathon/agent angle. |
| Web UI | No | Keep scope small. |

---

## 6. Agent handoff notes

For any agent picking up implementation:

1. Read `AGENT_INDEX.md` first.
2. Read chunks `00` through `04` for product context.
3. Read chunks `05` through `09` for implementation.
4. Use `STATUS.md` task IDs when making commits.
5. Do not implement out-of-scope items unless explicitly requested.
6. Keep redemption data private and redacted by default.
7. Do not expose raw Bitrefill API credentials to MCP clients or Discord.
