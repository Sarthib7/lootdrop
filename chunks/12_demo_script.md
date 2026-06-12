---
chunk_id: 12_demo_script
title: Demo Script
read_when: Preparing hackathon demo or pitch
dependencies: [00_project_brief, 04_user_flows]
related_tasks: [M6]
---

# 12 — Demo Script

## One-liner

> LootDrop lets AI agents and Discord communities reward people with claimable digital loot, while BountyGuard keeps spending safe and Bitrefill handles fulfillment.

## Demo setup

```txt
Community: Sarthi Gaming Guild
Admin: Sarthi
Recipient: Alice
Agent: GameAgent
Reward budget: $100/day
Max reward: $25
Auto-approve below: $5 (at or above $5 requires approval)
Bitrefill mode: test products
Pre-check: Alice's DMs verified open before demo starts
```

## Steps

1. Show Discord server and policy.
2. Run `/reward @alice 10 reason: MVP of tonight's match`.
3. Show claim card and policy result.
4. Click Approve.
5. Show Alice DM.
6. Choose country and Gaming.
7. Choose test gift card.
8. Show private redemption code/link.
9. Show public audit log with code redacted.
10. Show agent/MCP variant creating a second claim.

## Judge-facing message

```txt
Bitrefill gives agents purchasing power.
LootDrop gives communities a safe reason to use that power:
reward people, with budgets, approvals, recipient choice, and audit logs.
```
