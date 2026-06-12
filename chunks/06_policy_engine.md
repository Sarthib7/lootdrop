---
chunk_id: 06_policy_engine
title: BountyGuard Policy Engine
read_when: Implementing policy/safety checks
dependencies: [09_data_model, 10_security_compliance]
related_tasks: [M1, M5]
---

# 06 — BountyGuard Policy Engine

BountyGuard is the safety layer that decides whether a reward claim can be created, auto-approved, requires approval, or must be denied.

## Required checks

```txt
max single reward
daily/weekly budget
requester role/permission
no self-rewards (creator != recipient)
approver != recipient
creator MAY approve own created claim (solo-admin guilds must work)
category allowlist
recipient cooldown (only claims that reached approved+ count;
                    denied/cancelled/expired do not)
duplicate event id
approval threshold
country/product validity before redemption
```

## Budget accounting

Reserve amount against daily/weekly budget at claim creation. Release reservation on deny/cancel/expire/final-fail. Convert to spend on fulfilled. Pending claims count against budget, so 50 pending $10 claims cannot stack against a $100 daily budget.

## Example default policy

```json
{
  "daily_budget": 100,
  "weekly_budget": 500,
  "max_single_reward": 25,
  "auto_approve_below": 5,
  "claim_expiry_days": 30,
  "allowed_categories": ["gaming", "food", "shopping", "mobile_topup"],
  "allow_self_rewards": false,
  "recipient_cooldown_hours": 24
}
```

Threshold semantics: `amount < auto_approve_below` → auto-approved; `amount >= auto_approve_below` → requires approval. No separate `requires_approval_above` field — exactly $5 requires approval.

## Policy outputs

```txt
allowed_auto_approved
allowed_requires_approval
denied_policy_violation
denied_budget_exceeded
denied_permission
denied_duplicate
```
