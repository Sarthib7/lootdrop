# LootDrop AGENT_INDEX.md

**Purpose:** Agent-readable index for chunked project context and task pickup.  
**Read this first before implementing.**

---

## 1. Quick project summary

LootDrop is a Discord-first, agent-native reward-claim system.

```txt
Admin/agent creates reward claim
        ↓
BountyGuard policy checks budget/rules
        ↓
Admin approves if required
        ↓
Recipient chooses country/category/product
        ↓
Bitrefill fulfills gift card/test product
        ↓
Recipient receives code/link privately
        ↓
Community receives redacted audit log
```

Primary demo path:

```txt
/reward @alice 10 reason: MVP of tonight's match
```

---

## 2. Reading order for implementation agents

| Order | Chunk | Read when |
|---:|---|---|
| 1 | `chunks/00_project_brief.md` | Always read first. |
| 2 | `chunks/01_product_strategy.md` | Product positioning, Bitrefill value, differentiation. |
| 3 | `chunks/02_personas_use_cases.md` | User/use-case context. |
| 4 | `chunks/03_mvp_scope.md` | What is in/out of MVP. |
| 5 | `chunks/04_user_flows.md` | Discord, recipient, approval, failure flows. |
| 6 | `chunks/05_agent_mcp_design.md` | MCP tools and agent behavior. |
| 7 | `chunks/06_policy_engine.md` | BountyGuard rules and policies. |
| 8 | `chunks/07_bitrefill_integration.md` | Bitrefill API/test-product details. |
| 9 | `chunks/08_discord_bot.md` | Discord commands/components. |
| 10 | `chunks/09_data_model.md` | Tables and status lifecycle. |
| 11 | `chunks/10_security_compliance.md` | Must-read before touching money/redemption. |
| 12 | `chunks/11_roadmap.md` | Layer 1/2/3 roadmap. |
| 13 | `chunks/12_demo_script.md` | Demo flow and pitch. |

---

## 3. Task pickup protocol

When an agent picks a task:

1. Read this file.
2. Read relevant chunks from the table above.
3. Pick a task ID from `STATUS.md`.
4. State the task ID in commits/PRs.
5. Do not implement out-of-scope items without explicit instruction.
6. Add or update tests for policy, status transitions, and redemption privacy.
7. Never log redemption code/link/pin in public logs.

---

## 4. Key architectural constraints

```txt
No raw Bitrefill API key exposed to agents.
No public redemption codes.
No cash-out.
No transferable wallet/balance.
No geoblocking circumvention.
No high-value autonomous spending.
No web UI in MVP unless specifically requested.
```

---

## 5. Fast task routing

| If you are building... | Read these chunks |
|---|---|
| Discord command | `03`, `04`, `08`, `09`, `10` |
| Policy engine | `06`, `09`, `10` |
| MCP server | `05`, `06`, `10` |
| Bitrefill client | `07`, `10` |
| Recipient flow | `04`, `07`, `08`, `10` |
| Demo/pitch | `00`, `01`, `02`, `12` |
| Roadmap/business | `01`, `02`, `11` |

---

## 6. Source docs

See `RESOURCES.md` for all external references.
