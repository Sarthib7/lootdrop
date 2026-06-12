---
chunk_id: 04_user_flows
title: User Flows
read_when: Building Discord UI, recipient UX, or demo
dependencies: [03_mvp_scope]
related_tasks: [M2, M3, M6]
---

# 04 — User Flows

## Manual reward flow

```txt
/reward @alice 10 reason: MVP of tonight's match
        ↓
claim created
        ↓
policy checked
        ↓
approval required if above threshold
        ↓
admin approves
        ↓
recipient receives DM
        ↓
recipient chooses country/category/product
        ↓
Bitrefill test product fulfilled
        ↓
code/link sent privately
        ↓
audit log posted publicly without code
```

## Agent-assisted flow

```txt
Agent identifies reward-worthy event
        ↓
Agent calls create_reward_claim
        ↓
BountyGuard checks policy
        ↓
Admin approves if needed
        ↓
Recipient redeems
```

## Failure flow

```txt
fulfillment fails
        ↓
claim status = failed or retryable
        ↓
recipient receives safe failure message
        ↓
admin receives details
        ↓
no code/link exposed publicly
```
