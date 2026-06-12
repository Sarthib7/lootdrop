# LootDrop RESOURCES.md

**Purpose:** Curated source/resource list for agents and developers implementing LootDrop.  
**Last updated:** 2026-06-11  

---

## 1. Official Bitrefill resources

| Resource | URL | Why it matters |
|---|---|---|
| Bitrefill API Overview | https://docs.bitrefill.com/docs/api-overview | Confirms Bitrefill can programmatically purchase gift cards, mobile top-ups, and eSIMs; explains Personal, Business, and Affiliate API access. |
| Searching Products | https://docs.bitrefill.com/docs/searching-products | Product search/filtering, pagination, test-product inclusion, cache guidance, product endpoint quota. |
| Gift Cards | https://docs.bitrefill.com/docs/gift-cards | Gift-card invoice purchase flow, fixed/flexible values, redemption fields such as code/link/pin/instructions. |
| Webhooks | https://docs.bitrefill.com/docs/webhooks | Invoice final-state notifications, webhook handler best practices, idempotency, partial failure handling. |
| Test Products | https://docs.bitrefill.com/docs/test-products | Free development products: test gift-card code/link and fail variants. Required for safe hackathon demo. |
| Terms and Conditions | https://www.bitrefill.com/terms/ | Country/geoblocking limitations, KYC/suspicious activity language, gift-card/store-credit restrictions. |

### Bitrefill implementation notes

- MVP should use `test-gift-card-code` and/or `test-gift-card-link`.
- Use `include_test_products=true` when listing test products.
- Treat redemption output as a flexible object: some products return codes, others links/PIN/instructions.
- Use webhooks or polling before delivering real redemption info.
- Do not build geoblocking circumvention or country-arbitrage flows.
- Do not expose raw API keys to agents or clients.

---

## 2. Agent / MCP resources

| Resource | URL | Why it matters |
|---|---|---|
| Model Context Protocol introduction | https://modelcontextprotocol.io/docs/getting-started/intro | Explains MCP as an open standard for connecting AI apps to external systems/tools/workflows. |

### MCP implementation notes

Expose reward-safe tools:

```txt
create_reward_claim
list_reward_budget
list_pending_claims
search_claim_options
redeem_reward_claim
get_reward_audit_log
```

Do not expose:

```txt
raw_bitrefill_buy
get_api_key
change_policy
approve_own_reward
reveal_redemption_code_publicly
```

---

## 3. Discord / Telegram resources

| Resource | URL | Why it matters |
|---|---|---|
| Discord Application Commands | https://docs.discord.com/developers/interactions/application-commands | Slash commands, user commands, message commands, permissions, command registration. |
| Discord Components | https://docs.discord.com/developers/components/overview | Interactive message components for approval buttons and recipient selections. |
| Telegram Bot API | https://core.telegram.org/bots/api | Optional approval bot or fallback notification surface. |

### Discord implementation notes

- Use `/reward` as the main slash command.
- Add right-click user/message commands as P1.
- Use Discord components for Approve/Deny buttons and category/product menus.
- Use DM for recipient redemption codes.
- Use public audit logs with redacted redemption info.

---

## 4. Competitive / market resources

| Resource | URL | Relevant insight |
|---|---|---|
| Tremendous | https://www.tremendous.com/ | Existing market for global reward/payout platforms with recipient choice and APIs. |
| Tango Reward Link | https://www.tangocard.com/reward-link/ | Validates reward-link UX: sender sends one link, recipient chooses reward. |
| Giftbit | https://www.giftbit.com/ | Validates gift-card API, bulk sending, tracking/reporting, global catalog, recipient choice. |

### Competitive positioning

LootDrop should not compete as a generic enterprise reward platform. The wedge is:

```txt
Discord-first
Gaming/community-first
Agent-native
Bitrefill-native
Claim-first
Approval/policy-first
```

---

## 5. Internal docs in this pack

| File | Purpose |
|---|---|
| `PRD.md` | Main product requirements document. |
| `STATUS.md` | Implementation task list/status board. |
| `AGENT_INDEX.md` | Chunk map and reading order for agents. |
| `agents/SKILL.md` | Draft behavior guide for agents using LootDrop tools. |
| `chunks/*.md` | Topic-specific chunks for agent retrieval and task pickup. |

---

## 6. Source reliability notes

- Official Bitrefill docs and terms are primary sources for API behavior and compliance constraints.
- Official Discord/MCP/Telegram docs are primary sources for integration design.
- Tremendous, Tango, and Giftbit pages are product/market reference sources, not neutral market research.
- Legal/compliance conclusions in the PRD are product-risk guidance, not legal advice.
