---
chunk_id: 05_agent_mcp_design
title: Agent MCP Design
read_when: Building MCP server/tools or agent skill
dependencies: [06_policy_engine, 10_security_compliance]
related_tasks: [M4]
---

# 05 — Agent MCP Design

Expose safe reward operations, not raw Bitrefill purchase tools.

## P0 tools

```txt
create_reward_claim
list_reward_budget
list_pending_claims
```

## P1 tools

```txt
suggest_reward_amount
search_claim_options
redeem_reward_claim
get_reward_audit_log
```

## Forbidden tools

```txt
raw_bitrefill_buy
get_api_key
change_policy
approve_own_reward
reveal_redemption_code_publicly
```

## Tool result principles

- Return policy decision.
- Return claim ID.
- Return approval requirement.
- Redact all redemption data unless recipient is explicitly redeeming in private context.
