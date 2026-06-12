# LootDrop PRD

**Project:** LootDrop  
**Safety / policy layer:** BountyGuard  
**Category:** Agent-native reward claims for Discord, gaming, hackathons, DAOs, and online communities  
**Primary fulfillment partner:** Bitrefill  
**Document status:** Draft v0.1  
**Date:** 2026-06-11  
**Owner:** Sarthi Borkar  

---

## 0. Executive summary

LootDrop lets Discord communities, game servers, hackathons, DAOs, and open-source groups reward members with **claimable digital reward drops**. Admins or AI agents allocate a value, BountyGuard enforces budgets and approvals, the recipient chooses what they want, and Bitrefill fulfills the selected gift card, phone top-up, or later eSIM-style reward.

The product is intentionally **claim-first**, not gift-card-first.

```txt
Bad:  Admin sends Alice a random $10 Starbucks card.
Good: Admin/agent gives Alice a $10 LootDrop claim.
      Alice chooses country + category + product.
      Bitrefill fulfills the selected reward.
```

This solves three problems at once:

1. **Community reward friction:** communities want to reward contributors, players, moderators, testers, or winners, but direct payouts are painful.
2. **Recipient mismatch:** senders often do not know the recipient's country, preferred merchant, platform, or product.
3. **Agent spending safety:** AI agents can propose or create rewards, but should not have raw unrestricted purchasing power.

The MVP is intentionally lightweight:

```txt
Discord bot
MCP/plugin interface for agents
Policy engine
Approval buttons
Recipient DM claim flow
Bitrefill test-product fulfillment
Private redemption delivery
Public audit log
SQLite/Supabase storage
```

No full web app is required for the hackathon demo.

---

## 1. Product thesis

AI agents should be able to **reward people**, not just answer questions or call APIs. Online communities already have reward-worthy events: winning a match, moderating a server, fixing a bug, shipping a feature, helping newcomers, winning a hackathon prize, or completing a quest. LootDrop turns these moments into claimable real-world digital rewards.

The strongest positioning:

> **LootDrop turns community achievements into claimable real-world rewards.**

The product should not lead with privacy. Privacy is an embedded benefit.

Do not pitch:

```txt
Private payments through gift cards.
```

Pitch:

```txt
Reward people instantly.
Recipients choose what they want.
No bank details needed.
Bitrefill fulfills globally.
```

Privacy is framed as:

```txt
No bank details from recipients.
No card sharing with random platforms.
No international payout headache.
Digital delivery.
Recipient choice.
```

---

## 2. Why Bitrefill is the right fulfillment layer

Bitrefill's API documentation states that developers can programmatically purchase gift cards, mobile top-ups, and eSIMs; browse products across 170+ countries; create invoices; pay with crypto or balance; track orders; and retrieve redemption codes. It supports Personal API, Business API, and Affiliate API variants depending on use case.

For this project:

| Phase | Bitrefill access model | Why |
|---|---|---|
| Hackathon MVP | Personal API + test products | Fastest setup, enough for prototype/demo. |
| Real community pilot | Business API or partner path | Needed for platform-style integration, broader catalog, support, scale. |
| Growth / referral model | Affiliate API | Useful if LootDrop drives purchase volume and wants commission/revenue tracking. |

Official references:

- Bitrefill API Overview: https://docs.bitrefill.com/docs/api-overview
- Bitrefill Product Search: https://docs.bitrefill.com/docs/searching-products
- Bitrefill Gift Cards: https://docs.bitrefill.com/docs/gift-cards
- Bitrefill Test Products: https://docs.bitrefill.com/docs/test-products
- Bitrefill Webhooks: https://docs.bitrefill.com/docs/webhooks

---

## 3. Value to Bitrefill

LootDrop should create value for Bitrefill, not just use Bitrefill as a backend.

### 3.1 New distribution channel

One Discord/community admin can introduce many recipients to Bitrefill.

```txt
1 community admin
        ↓
10-10,000 community members
        ↓
reward claims
        ↓
recipient-chosen Bitrefill purchases
```

### 3.2 New purchase intent

Typical Bitrefill flow:

```txt
I need a specific gift card, so I go buy it.
```

LootDrop flow:

```txt
I earned a reward. What can I claim?
```

That creates a repeatable behavior loop.

### 3.3 Better product discovery

Recipients browse by country/category/value, which introduces them to more Bitrefill products than a direct one-off purchase.

### 3.4 Agent-commerce showcase

Bitrefill already has agent-oriented infrastructure. LootDrop turns that infrastructure into a concrete workflow:

```txt
agent proposes reward
human/policy approves spend
recipient chooses product
Bitrefill fulfills
```

### 3.5 Strong safety story

BountyGuard adds policy controls around agent spending:

```txt
budget limits
role limits
approval thresholds
category restrictions
recipient choice
private code delivery
audit logs
fraud controls
```

This makes Bitrefill-powered agent commerce safer and more acceptable for real communities.

---

## 4. Problem statement

Online communities frequently want to reward people, but existing payout options are awkward:

| Existing option | Problem |
|---|---|
| Bank payout | Slow, country-specific, requires personal details. |
| Crypto transfer | Recipient needs wallet and crypto knowledge. |
| Fixed gift card | Sender guesses the recipient's country/preference. |
| Manual prize fulfillment | Admin-heavy, no audit trail, easy to make mistakes. |
| Enterprise reward platforms | Often built for HR/research/marketing, not Discord/game/community workflows. |

LootDrop offers a better path:

```txt
allocate value → recipient chooses → approved purchase → private delivery → audit trail
```

---

## 5. Goals and non-goals

### 5.1 Goals

1. Let a Discord admin or AI agent create a reward claim for a recipient.
2. Let an admin approve, deny, or edit reward claims inside chat.
3. Let a recipient choose country, category, and final reward option.
4. Fulfill rewards through Bitrefill test products in MVP.
5. Store reward, approval, fulfillment, and audit records.
6. Expose an MCP/plugin interface so agents can create and inspect reward claims safely.
7. Enforce BountyGuard policies: budgets, max reward size, role permissions, approval thresholds, self-reward prevention, and private redemption delivery.
8. Provide a clean hackathon demo that shows manual and agent-assisted reward creation.

### 5.2 Non-goals for MVP

Do not build these in the first version:

```txt
full web dashboard
wallet or stored-value balance for recipients
cash withdrawals
peer-to-peer claim transfers
regional subscription/VPN arbitrage
browser checkout extension
automatic location-based coffee-shop buying
full enterprise tax reporting
custodial crypto wallet
unrestricted Bitrefill purchase tool
public redemption-code posting
```

---

## 6. Product principles

### 6.1 Claim-first

Create a reward claim before buying anything. Buy only after the recipient chooses a valid option.

### 6.2 Recipient choice

The recipient chooses category and product, so the sender does not need to guess.

### 6.3 Human-controlled spend

Agents can propose and create claims, but policies and approvals control money movement.

### 6.4 Chat-native UX

The MVP should feel native to Discord. Avoid sending users to a web app unless absolutely necessary.

### 6.5 Privacy as convenience

Use language like:

```txt
No bank details needed.
No payout headache.
Instant digital reward.
```

Avoid ideological privacy-first messaging.

### 6.6 Compliance-friendly design

Avoid building a wallet, resale marketplace, money-transfer product, or geography-circumvention tool.

---

## 7. Personas

### 7.1 Community admin / guild leader

**Needs:** reward active members, tournament winners, moderators, or contributors without manual payout work.  
**Pain:** cross-border payouts, fixed gift-card mismatch, repetitive admin work.  
**Success:** can issue rewards in one command and keep an audit log.

### 7.2 AI agent / automation

**Needs:** propose or create rewards based on observed events.  
**Pain:** direct purchasing authority is risky.  
**Success:** can operate within policy and trigger approval flows.

### 7.3 Recipient / player / contributor

**Needs:** claim a useful reward quickly.  
**Pain:** random gift cards may not be valid or useful.  
**Success:** chooses a reward available in their country and receives it privately.

### 7.4 Sponsor / partner

**Needs:** fund community rewards with visibility and accountability.  
**Pain:** unclear reward delivery and weak reporting.  
**Success:** sees campaign-level reward logs and outcomes.

### 7.5 Bitrefill / fulfillment partner

**Needs:** more repeatable Bitrefill demand and agent-commerce use cases.  
**Pain:** raw API/MCP usage alone is not a workflow.  
**Success:** communities generate product discovery and completed purchases.

---

## 8. Use-case layers

### 8.1 Layer 1 — hackathon / MVP use cases

| Use case | Example | Why it works |
|---|---|---|
| Gaming community rewards | `/reward @alice 10 MVP of tonight's match` | Familiar, fun, easy demo. |
| Discord moderator rewards | Reward a mod for cleaning spam/raids. | Communities rely on unpaid moderators. |
| Hackathon micro-prizes | Reward a team for best demo or best UI. | Highly relevant to current event. |
| Open-source bounties | Reward a contributor for fixing issue #42. | Clear agent/GitHub extension path. |
| DAO contributor rewards | Reward a proposal writer or contributor. | Crypto-native audience, normal gift-card output. |

### 8.2 Layer 2 — strong post-hackathon use cases

| Use case | Example | Notes |
|---|---|---|
| Creator communities | Streamer rewards helpful fans/top chatters. | Needs anti-abuse controls. |
| Esports tournaments | Top 3 players get claimable rewards. | Good sponsor/campaign fit. |
| Beta testing | Reward testers for useful bug reports. | Works for game studios/startups. |
| Student/coding clubs | Reward challenge winners. | Easy grassroots adoption. |
| Referral campaigns | Reward members for invites. | Requires fraud protection. |

### 8.3 Layer 3 — later enterprise use cases

| Use case | Example | Why later |
|---|---|---|
| Employee recognition | Manager sends employee claim. | HR/tax/compliance complexity. |
| Customer incentives | Survey/research rewards. | Crowded by existing platforms. |
| Support compensation | Small apology reward. | Requires brand integration and support workflow. |
| Influencer campaigns | Reward campaign participants. | Requires anti-fraud and reporting. |

---

## 9. Core object: Reward Claim

A reward claim is an internal authorization to redeem up to a certain value for approved Bitrefill products. It is not a cash wallet.

### 9.1 Claim properties

```json
{
  "claim_id": "claim_123",
  "community_id": "guild_123",
  "recipient_id": "discord:alice",
  "amount": 10,
  "currency": "USD",
  "reason": "MVP of weekly tournament",
  "allowed_categories": ["gaming", "food", "shopping", "mobile_topup"],
  "status": "pending_approval",
  "expires_at": "2026-07-11T00:00:00Z",
  "created_by": "agent:game-agent",
  "approved_by": null,
  "redeemed_product_id": null,
  "redemption_visibility": "private_dm_only"
}
```

### 9.2 Claim rules

A claim should be:

```txt
recipient-bound
non-transferable
non-cash-out
limited by value and category
expired after defined period
purchased only at redemption time
private by default
fully auditable
```

### 9.3 Claim status lifecycle

```txt
created
pending_approval
approved
recipient_selecting
redeeming
fulfilled
failed
expired
cancelled
```

### 9.4 Valid status transitions

Only these transitions are valid. Anything else must be rejected and audited.

| From | To | Trigger |
|---|---|---|
| `created` | `approved` | Policy auto-approves (amount below threshold). |
| `created` | `pending_approval` | Policy requires human approval. |
| `created` | `cancelled` | Creator/admin cancels before approval. |
| `pending_approval` | `approved` | Admin approves. |
| `pending_approval` | `cancelled` | Admin denies or creator withdraws. |
| `pending_approval` | `expired` | Expiry passes before approval. |
| `approved` | `recipient_selecting` | Recipient opens claim DM. |
| `approved` | `expired` | Expiry passes before redemption. |
| `approved` | `cancelled` | Admin cancels. |
| `recipient_selecting` | `redeeming` | Recipient confirms product (atomic guard, see P0-13). |
| `recipient_selecting` | `expired` | Expiry passes during selection. |
| `redeeming` | `fulfilled` | Bitrefill order succeeds and redemption info delivered. |
| `redeeming` | `failed` | Bitrefill invoice/order fails. |
| `failed` | `recipient_selecting` | Admin/recipient retries. |
| `failed` | `cancelled` | Admin cancels after failure. |

Terminal states: `fulfilled`, `expired`, `cancelled`.

---

## 10. MVP user flows

### 10.1 Manual Discord reward flow

```txt
Admin: /reward @alice 10 reason: MVP of tonight's Valorant match
        ↓
LootDrop creates claim
        ↓
BountyGuard validates policy
        ↓
Approval message shown if needed
        ↓
Admin clicks Approve
        ↓
Alice gets DM to choose country/category/product
        ↓
Bitrefill test product fulfilled
        ↓
Alice gets private code/link
        ↓
Public audit log posted
```

### 10.2 Agent-assisted reward flow

```txt
Agent observes or is told about event
        ↓
Agent calls create_reward_claim via MCP
        ↓
BountyGuard checks rules
        ↓
Claim requires approval or auto-approves below threshold
        ↓
Recipient chooses and redeems
```

Example agent instruction:

```txt
Reward Alice $10 because she won the weekly tournament. Use gaming or food categories. Ask an admin before spending.
```

### 10.3 Recipient claim flow

```txt
DM: You received a $10 LootDrop.
        ↓
Choose country (pre-selected from recipient_preferences if known;
one-tap change; selection saved for next time)
        ↓
Choose category
        ↓
Choose product from 3-5 options
        ↓
Confirm
        ↓
Receive redemption code/link privately
```

### 10.4 Failure flow

If Bitrefill fulfillment fails:

```txt
claim status → failed
recipient gets apology + retry option
admin gets error details
no public redemption code/log leak
support log captures invoice/order id
```

---

## 11. Autonomy model

LootDrop should be partially autonomous.

| Level | Name | Description | MVP? |
|---:|---|---|---:|
| 0 | Manual rewards | Human runs `/reward`. | Yes |
| 1 | Agent-assisted rewards | Agent suggests/creates claim; human approves. | Yes |
| 2 | Policy-autonomous rewards | Agent can auto-create small rewards under thresholds. | Stretch |
| 3 | Campaign autopilot | Admin defines campaign rules; agent distributes rewards from verified events. | Later |

### 11.1 What agents can do

```txt
create reward claims
suggest reward amounts
list pending claims
check budget
search recipient options
notify admins
notify recipients
write audit summaries
```

### 11.2 What agents cannot do

```txt
access raw Bitrefill API key
approve rewards where they or their requester is the recipient
change policy/admins
send redemption codes publicly
redeem rewards for themselves
bypass country or product restrictions
perform regional arbitrage
cash out claims
```

---

## 12. Functional requirements

### 12.1 P0 — hackathon MVP

| ID | Requirement | Acceptance criteria |
|---|---|---|
| P0-01 | Discord slash command `/reward` | Admin/mod can create claim with user, amount, reason. |
| P0-02 | Policy validation | Rejects over max reward, over budget, self-reward, blocked role. |
| P0-03 | Approval button | Pending claim can be approved/denied in Discord. |
| P0-04 | Recipient DM | Recipient receives private claim link/message. |
| P0-05 | Country/category selection | Recipient can select country and category from buttons/select menus. |
| P0-06 | Product search | Backend can search/filter Bitrefill products or test products. |
| P0-07 | Test fulfillment | Redeems with `test-gift-card-code` or `test-gift-card-link`. |
| P0-08 | Redemption privacy | Codes/links sent only by private DM. |
| P0-09 | Public audit log | Channel gets success log showing recipient + amount + reason only. Chosen product, category, country, and code never appear publicly. |
| P0-10 | MCP tool: create claim | Agent can create reward claim through MCP. |
| P0-11 | Persistent storage | Claims, approvals, products, and fulfillment logs saved. |
| P0-12 | Demo script | End-to-end demo works in under 3 minutes. |
| P0-13 | Redemption double-spend guard | One claim can never produce two invoices: unique constraint on `redemptions.claim_id` + atomic `recipient_selecting → redeeming` status transition. Double-click on Confirm is a no-op. |

### 12.2 P1 — strong prototype

| ID | Requirement | Acceptance criteria |
|---|---|---|
| P1-01 | Agent reward suggestion | Agent can propose reward from a reason/event summary. |
| P1-02 | Auto-approve small rewards | Below threshold auto-approves if policy allows. |
| P1-03 | Product ranking | Shows top 3-5 valid products by amount/country/category. |
| P1-04 | Basic admin settings | Configure max reward, daily budget, categories. |
| P1-05 | Failure/retry handling | Failed redemptions can be retried or cancelled. |
| P1-06 | Webhook handler | Handles Bitrefill invoice final states idempotently. |
| P1-07 | Role-based permissions | Only configured Discord roles can create/approve. |
| P1-08 | Claim expiration | Expired claims cannot redeem. |

### 12.3 P2 — post-hackathon

| ID | Requirement | Acceptance criteria |
|---|---|---|
| P2-01 | GitHub integration | Reward PR/issue contributors. |
| P2-02 | Game event integration | Reward tournament results or match MVPs. |
| P2-03 | Campaign templates | Weekly tournament, bug bounty, moderator rewards. |
| P2-04 | Sponsor pools | Sponsor funds pool/campaign. |
| P2-05 | Analytics dashboard | Reward volume, redemption rate, category demand. |
| P2-06 | Partner/Affiliate mode | Track Bitrefill referral economics where available. |
| P2-07 | Multi-community SaaS | Multiple guilds, policies, and billing. |

---

## 13. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Never expose raw Bitrefill API key to agent/client/Discord. |
| Privacy | Redemption codes only delivered privately to recipient. |
| Reliability | Idempotent claim creation and webhook processing. |
| Latency | Reward claim creation should respond within Discord interaction timeout; long fulfillment can continue asynchronously. |
| Observability | Log claim transitions, policy decisions, Bitrefill invoice/order IDs, and failures. |
| Compliance posture | No cash-out, no transferable balance, no country bypass, no resale. |
| Maintainability | Clear separation between Discord bot, policy engine, Bitrefill client, and MCP server. |
| Demoability | Must support Bitrefill test products so no real funds are required. |

---

## 14. MCP / plugin design

MCP is useful because it makes LootDrop agent-native. The MCP should expose safe reward operations, not raw Bitrefill buying.

The Model Context Protocol is an open standard for connecting AI applications to external tools, data sources, and workflows.

Reference: https://modelcontextprotocol.io/docs/getting-started/intro

### 14.1 MCP tools

| Tool | Purpose | Safety notes |
|---|---|---|
| `create_reward_claim` | Agent creates a claim for a recipient. | Must run policy check. |
| `suggest_reward_amount` | Agent suggests value based on contribution/event. | Advisory only. |
| `list_reward_budget` | Shows remaining budget. | No secrets. |
| `list_pending_claims` | Lists claims needing approval. | Admin-only. |
| `search_claim_options` | Finds valid reward options for claim. | Must respect country/category/value. |
| `redeem_reward_claim` | Redeems approved claim for chosen product. | Recipient/admin action only. |
| `get_reward_audit_log` | Returns claim/audit history. | Redact codes. |

### 14.2 Example tool schema

```json
{
  "name": "create_reward_claim",
  "description": "Create a policy-checked reward claim for a community member.",
  "input_schema": {
    "type": "object",
    "properties": {
      "recipient": {"type": "string", "description": "Discord user id or handle"},
      "amount": {"type": "integer", "description": "Whole currency units (10 = $10). Converted to minor units (cents) at the API boundary; no floats anywhere internally."},
      "currency": {"type": "string", "enum": ["USD"], "description": "MVP is USD-only: claims, budgets, and ledgers all in USD cents. Recipient country only filters the catalog."},
      "reason": {"type": "string"},
      "allowed_categories": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["recipient", "amount", "currency", "reason"]
  }
}
```

Note there is no `community_id` or `requester_id` input. The MCP server instance is bound at startup (env/config) to exactly one agent identity and one community (e.g. `agent:game-agent` @ `guild_123`). Callers cannot choose their own identity or target community — any client-supplied identity fields are ignored.

```txt
(identity comes from server config, never from tool arguments)
```

### 14.3 Example response

```json
{
  "claim_id": "claim_123",
  "status": "requires_approval",
  "policy_result": "approved_pending_human",
  "approval_message_id": "discord_msg_456",
  "message": "Reward claim created and sent for admin approval."
}
```

### 14.4 Agent instruction rules

See `agents/SKILL.md` for a fuller draft.

---

## 15. Discord bot design

Discord is the primary MVP surface.

Official docs:

- Application commands: https://docs.discord.com/developers/interactions/application-commands
- Components: https://docs.discord.com/developers/components/overview

### 15.1 Slash commands

P0:

```txt
/reward user amount reason
/rewards pending
/rewards budget
/myrewards
```

P1 (approval is buttons-only in P0; slash equivalents come later):

```txt
/rewards approve claim_id
/rewards deny claim_id
```

### 15.2 User command

Right-click user:

```txt
Reward user
```

Creates a reward modal or prefilled command.

### 15.3 Message command

Right-click message:

```txt
Reward this contribution
```

Good for helpful messages, bug reports, and moderation support.

### 15.4 Buttons/select menus

Use buttons for approval:

```txt
[Approve] [Deny] [Edit amount]
```

Use select menus for country/category/product selection:

```txt
Country: US / DE / IN / Other
Category: Gaming / Food / Shopping / Mobile Top-up / Streaming
Product: Steam / Amazon / Test Gift Card / ...
```

### 15.5 Message visibility

| Message | Visibility |
|---|---|
| Reward creation | Public or admin channel |
| Approval request | Admin-only channel or ephemeral response |
| Recipient claim | Private DM |
| Redemption code/link | Private DM only |
| Audit log | Public or configured log channel. Shows recipient + amount + reason + status only — chosen product/category/country and redemption data stay private. |

---

## 16. Optional Telegram approval

Telegram can be a later/optional approval surface if admins want separation from Discord. Telegram Bot API supports bot-driven messaging and interactive reply markup.

Reference: https://core.telegram.org/bots/api

MVP recommendation: **Discord-only** unless Telegram approval is needed for demo differentiation.

---

## 17. Policy engine: BountyGuard

BountyGuard is the safety layer.

### 17.1 Example policy config

```json
{
  "community_id": "guild_123",
  "default_currency": "USD",
  "daily_budget": 100,
  "weekly_budget": 500,
  "max_single_reward": 25,
  "auto_approve_below": 5,
  "claim_expiry_days": 30,
  "allowed_categories": ["gaming", "food", "shopping", "mobile_topup"],
  "blocked_categories": ["adult", "gambling", "high_risk"],
  "trusted_requesters": ["admin", "game_agent", "moderator"],
  "allow_self_rewards": false,
  "recipient_cooldown_hours": 24
}
```

Threshold semantics — single field, no boundary gap:

```txt
amount <  auto_approve_below  → auto-approved
amount >= auto_approve_below  → requires human approval
```

There is no separate `requires_approval_above` field. Exactly $5 requires approval.

### 17.2 Policy checks

| Check | Reason |
|---|---|
| Max single reward | Prevent accidental large spends. |
| Daily/weekly budget | Prevent runaway agent spending. |
| Role/requester permission | Only trusted users/agents can create rewards. |
| No self-rewards | Prevent obvious abuse (creator cannot be recipient). |
| Approver ≠ recipient | Admin cannot approve a claim where they are the recipient, even if someone else (or an agent) created it. |
| Creator MAY approve own created claim | Approval is a deliberate second click + audit record, not separation of duties — solo-admin guilds must work. The gate's real job is agent-created claims and fat-finger amounts. |
| Duplicate event check | Prevent repeated reward for same event. |
| Recipient cooldown | Reduce farming. Checked at creation; only the recipient's claims that reached `approved` or beyond in the window count — denied/cancelled/expired claims don't lock recipients out. |
| Category allowlist | Keep rewards aligned to community use case. |
| Country/product validation | Avoid invalid gift-card purchases. |
| Approval threshold | Human confirms meaningful spend. |
| Private code handling | Prevent theft/leaks. |

### 17.3 Budget accounting

Budget is **reserved at claim creation**, not at redemption:

```txt
claim created          → amount reserved against daily/weekly budget
claim denied/cancelled → reservation released
claim expired          → reservation released
claim failed (final)   → reservation released
claim fulfilled        → reservation becomes spend
```

This prevents an agent from creating 50 pending $10 claims against a $100 daily budget. The 11th creation fails policy immediately, even though nothing has been redeemed yet.

---

## 18. Bitrefill integration details

### 18.1 Product search

Bitrefill supports product search by keyword and product listing filters such as country and product type. Test products are hidden by default and require `include_test_products=true`. Product endpoints have quotas, so production integrations should cache product lists.

Reference: https://docs.bitrefill.com/docs/searching-products

Example API intent:

```txt
GET /products/search?q=steam
GET /products?country=US&type=gift_card
GET /products?country=US&type=gift_card&include_test_products=true
```

### 18.2 Gift-card purchase

Bitrefill gift cards are digital products with redemption codes. Purchases use the invoice endpoint and can use fixed packages or flexible values where supported.

Reference: https://docs.bitrefill.com/docs/gift-cards

Example intent:

```txt
POST /invoices
payment_method=balance
auto_pay=true
products=[{ product_id, package_id OR value, quantity }]
```

### 18.3 Redemption info

Gift-card redemption info may include:

```txt
code
link
pin
instructions
```

Not every product has all fields. The UI and database must handle multiple redemption shapes.

### 18.4 Test products

MVP should use Bitrefill test products:

```txt
test-gift-card-link
test-gift-card-code
test-phone-refill
test-gift-card-link-fail
test-gift-card-code-fail
test-phone-refill-fail
```

These are free, hidden by default, and work with `payment_method=balance`.

Reference: https://docs.bitrefill.com/docs/test-products

### 18.5 Webhooks

Bitrefill webhooks notify the server when an invoice reaches a final state. The integration should respond quickly, process asynchronously, and be idempotent.

Reference: https://docs.bitrefill.com/docs/webhooks

Important statuses:

```txt
complete
denied
payment_error
```

A complete invoice does not guarantee every order succeeded; check individual order status before delivering to recipient.

### 18.6 Value matching (claim amount → product price)

Bitrefill products come as fixed packages in local currencies; a $10 USD claim will rarely match a package price exactly. MVP rule:

```txt
Claims are USD-only in MVP.
Show only products/packages priced <= remaining claim value,
compared in USD using the price Bitrefill's API returns
(their conversion, not ours).
Recipient picks one product. Remainder is forfeited.
Remainder forfeiture is shown BEFORE confirmation:
"This uses $9.50 of your $10.00 reward. The remaining $0.50 is not kept."
```

Explicit non-rules for MVP: no partial-balance carryover, no multi-product redemption, no top-up-to-fit. Flexible-value products (where Bitrefill supports them) should be preferred in ranking since they can consume the claim exactly.

---

## 19. Data model

### 19.1 Tables

```txt
communities
admins
community_policies
agents
reward_claims
approvals
recipient_preferences
bitrefill_products_cache
bitrefill_invoices
bitrefill_orders
redemptions
audit_logs
idempotency_keys
```

### 19.2 `reward_claims`

```sql
CREATE TABLE reward_claims (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  recipient_discord_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT NOT NULL,
  allowed_categories_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  approved_by_id TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 19.3 `redemptions`

```sql
CREATE TABLE redemptions (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  bitrefill_product_id TEXT NOT NULL,
  bitrefill_invoice_id TEXT,
  bitrefill_order_id TEXT,
  status TEXT NOT NULL,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES reward_claims(id)
);
```

Redemption codes/links/PINs are **never persisted**. The DB stores only Bitrefill invoice/order IDs; delivery and re-delivery fetch redemption info from Bitrefill's order-retrieval API on demand. (Verify on day 1 that order retrieval returns redemption info repeatedly — if not, fall back to encrypt-until-first-delivery-then-wipe.)

### 19.4 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```

---

## 20. Recommended technical architecture

### 20.1 Stack

| Layer | MVP choice | Notes |
|---|---|---|
| Runtime | Node.js / TypeScript | Strong ecosystem for Discord + MCP. |
| Discord bot | discord.js | Slash commands, components, DMs. |
| MCP server | TypeScript MCP SDK (stdio) | Separate process spawned by the agent client; imports the same core packages. |
| Backend API | None in MVP | Bot calls core packages directly; no HTTP layer until webhooks (P1) force one. |
| DB | SQLite + Prisma, WAL mode | Two processes share one file — WAL required. Migrate to Supabase/Postgres later. |
| Queue | In-memory or BullMQ | For webhooks/fulfillment; in-memory okay for demo. |
| Secrets | `.env` + local encryption | Never expose Bitrefill key to agent. |
| Deployment | Railway/Fly/Render/Vercel functions | Needs public webhook URL for Bitrefill if using live webhooks. |

### 20.2 Component diagram

```txt
Process 1 (long-running):
Discord User / Admin
        ↓
Discord Bot
        ↓
core packages: BountyGuard policy → Bitrefill client → Bitrefill API

Process 2 (stdio, spawned by agent client):
AI Agent / Claude / Cursor
        ↓
LootDrop MCP Server
        ↓
same core packages, same SQLite file (WAL mode)
```

No HTTP API in MVP — both processes import shared core packages and talk to one SQLite database in WAL mode. An HTTP layer appears only when Bitrefill webhooks (P1) need a public endpoint.

### 20.3 Service boundaries

```txt
apps/discord-bot/     chat commands, components, DMs
apps/mcp-server/      agent tool interface (stdio)
packages/core/        BountyGuard checks, claim state machine, audit
packages/bitrefill/   product search, invoices, order retrieval
packages/db/          Prisma schema and DB access
```

---

## 21. Security and compliance posture

This section is important for judges and for Bitrefill alignment.

### 21.1 Must-have safety rules

```txt
Do not expose Bitrefill API key to the agent.
Do not expose redemption codes publicly.
Do not create a transferable user wallet.
Do not allow cash-out.
Do not allow resale or claim transfer.
Do not bypass geoblocking or product country rules.
Do not market as anonymous payments.
Do not allow agents to change budgets/admins.
Do not allow high-value auto-approval by default.
```

### 21.2 Bitrefill terms considerations

Bitrefill's terms state that products differ by country, some products are geographically limited, and circumventing geoblocking to acquire products not available in the user's country violates Bitrefill's terms. They also state that use is monitored for safety/regulatory compliance and suspicious activity may require KYC.

Reference: https://www.bitrefill.com/terms/

Therefore LootDrop should:

```txt
ask recipient for actual country
show product country/terms warnings
avoid VPN/regional arbitrage
avoid cash-out language
keep claims internal and non-transferable
route real platform pilots through Bitrefill partner/business access
```

### 21.3 Claim wording

Use:

```txt
reward claim
LootDrop
claimable reward
digital reward drop
```

Avoid:

```txt
wallet balance
stored cash
withdraw
transfer money
anonymous payment
bypass
```

---

## 22. Competitive landscape

There is existing validation for reward-choice platforms:

| Platform | What they do | LootDrop differentiation |
|---|---|---|
| Tremendous | Business reward/payout platform with gift cards, prepaid cards, money options, API, global catalog. | LootDrop is Discord/community-first, agent-native, Bitrefill/crypto-native. |
| Tango Reward Link | Recipient clicks a reward link and chooses a gift card/prepaid/donation. | LootDrop starts inside Discord/game/community workflows, with agent + policy layer. |
| Giftbit | Web app/API for digital rewards, bulk sending, tracking, global catalog. | LootDrop focuses on chat-native reward claims and autonomous/community workflows. |

References:

- Tremendous: https://www.tremendous.com/
- Tango Reward Link: https://www.tangocard.com/reward-link/
- Giftbit: https://www.giftbit.com/

**Open item:** Discord-native economy/reward bots (points, levels, shop bots) are not yet surveyed here. Most stop at virtual currency; verify none do real-world fulfillment before claiming "nobody does this in Discord" to judges.

The market exists. LootDrop wins by choosing a narrower wedge:

```txt
Discord + gaming + agents + Bitrefill fulfillment + recipient choice + policy controls
```

---

## 23. Business model

### 23.1 Hackathon value model

```txt
Drive Bitrefill usage through communities.
Demonstrate Bitrefill agent commerce with a real workflow.
Show how safe agent spending can create new Bitrefill demand.
```

### 23.2 Post-hackathon business models

| Model | Description | Notes |
|---|---|---|
| Bitrefill affiliate/partner revenue | Earn referral/affiliate economics where available. | Best aligned with Bitrefill. |
| Community SaaS | Free tier + paid automation/policies/campaigns. | Avoid fees on small rewards initially. |
| Fulfillment fee | Small fee per fulfilled reward. | Price-sensitive; use carefully. |
| White-label campaigns | Custom reward bots for game studios/esports/hackathons. | Good B2B path. |

### 23.3 Pricing hypothesis

```txt
Free: 10 fulfilled rewards/month, manual approval, basic audit log.
Pro: $19-49/month per community, more rewards, campaigns, role policies.
Partner: custom pricing for game studios, hackathons, DAOs.
```

---

## 24. Success metrics

### 24.1 MVP demo metrics

```txt
End-to-end reward flow completes under 3 minutes.
No redemption code appears in public channel.
Agent-created claim goes through policy/approval.
Recipient can choose category/product.
Test fulfillment works.
Audit log is created.
```

### 24.2 Product metrics

```txt
number of communities installed
claims created per community
approval rate
redemption rate
time from claim to redemption
category/product selection distribution
repeat recipients
repeat reward creators
Bitrefill purchase volume driven
failed redemption rate
fraud/abuse flags
```

### 24.3 Bitrefill value metrics

```txt
new users exposed to Bitrefill catalog
redemption product mix
purchase volume from communities
percentage of recipients who later buy directly
affiliate/partner tracked invoices
```

---

## 25. Risk register

| Risk | Severity | Mitigation |
|---|---:|---|
| API key leak | High | Store server-side only; never expose to agent/client; rotate keys. |
| Public redemption-code leak | High | DM-only delivery; redact logs; encrypt stored info. |
| Agent overspending | High | Budgets, approvals, idempotency, auto-approve caps. |
| Country/product mismatch | Medium | Ask recipient country; filter by country; show terms warning. |
| Abuse/farming | Medium | Role checks, cooldowns, duplicate event IDs, join-age limits. |
| Discord DM disabled | Medium | Ephemeral interaction fallback in-guild (no web claim link — out of MVP scope). For demo: pre-verify recipient DMs are open. |
| Bitrefill order failure | Medium | Use webhooks/polling; retry; handle failed order states. |
| Compliance ambiguity | Medium | No wallet/cash-out/transfer; use claims; partner with Bitrefill for scale. |
| Weak differentiation | Medium | Emphasize agent/community workflow + policy layer, not generic gift-card API. |
| Too much scope | High | No web UI, no browser extension, no real-money mode until test flow works. |

---

## 26. Roadmap

### 26.1 Hackathon MVP

```txt
Discord bot
MCP server
Policy engine
SQLite storage
Bitrefill test product fulfillment
Audit log
End-to-end demo
```

### 26.2 Layer 1 production pilot

```txt
real Bitrefill fulfillment behind admin approval
guild policies
role permissions
recipient product chooser
failure/retry handling
basic analytics
```

### 26.3 Layer 2 growth

```txt
GitHub rewards
esports/game event integrations
campaign templates
creator/community reward pools
sponsor-branded drops
```

### 26.4 Layer 3 platform

```txt
multi-community SaaS dashboard
partner/affiliate tracking
advanced fraud controls
white-label programs
team/admin roles
tax/export/reporting where required
```

---

## 27. Demo script

### 27.1 Setup

```txt
Discord server: Sarthi Gaming Guild
Admin: Sarthi
Recipient: Alice
Agent: GameAgent
Reward budget: $100/day
Max reward: $25
Auto-approve below: $5 (at or above $5 requires approval)
Allowed categories: Gaming, Food, Shopping, Mobile Top-up
Bitrefill mode: test products
Pre-check: Alice's DMs verified open before demo starts
```

### 27.2 Demo steps

1. Show policy briefly.
2. In Discord, run:

```txt
/reward @alice 10 reason: MVP of tonight's Valorant match
```

3. Bot shows pending reward card.
4. Admin clicks **Approve**.
5. Alice receives DM:

```txt
You received a $10 LootDrop.
Choose country and category.
```

6. Alice selects country and Gaming.
7. Bot shows test gift card option.
8. Alice confirms.
9. Bot fulfills via Bitrefill test product.
10. Alice receives private code/link.
11. Public channel shows redacted audit log.
12. Agent-created variant: Claude/Cursor calls MCP `create_reward_claim` for another reward.

### 27.3 Demo one-liner

> **LootDrop lets AI agents and Discord communities reward people with claimable digital loot, while BountyGuard keeps spending safe and Bitrefill handles fulfillment.**

---

## 28. Open questions

| Question | Default answer |
|---|---|
| Product name? | LootDrop externally, BountyGuard internally. |
| MVP approval surface? | Discord-only. |
| Real purchases in demo? | No. Use Bitrefill test products. |
| Recipient chooses category or exact card? | Category first, then exact product from 3-5 options. |
| Web UI? | Not MVP. Chat-native first. |
| Telegram? | Optional stretch for admin approvals. |
| Business API? | Not for hackathon MVP, needed for real platform scale. |
| Privacy marketing? | Secondary: no bank details, no payout headache. |
| Who funds the Bitrefill balance? | Community admin prepays Bitrefill balance (crypto or balance deposit) before any reward can fulfill. First real onboarding friction post-hackathon — needs a clear setup step and low-balance warnings. |

---

## 29. Source links

See `RESOURCES.md` for source notes and implementation relevance.
