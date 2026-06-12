---
chunk_id: 00_project_brief
title: Project Brief
read_when: Always read first
dependencies: []
related_tasks: [M0, M6]
---

# 00 — Project Brief

LootDrop is a Discord-first, agent-native reward-claim system.

Core flow:

```txt
Admin or agent creates reward claim
        ↓
BountyGuard policy engine checks spend/rules
        ↓
Admin approves if required
        ↓
Recipient chooses country/category/product
        ↓
Bitrefill fulfills selected product
        ↓
Recipient receives code/link privately
        ↓
Community receives redacted audit log
```

Product name:

```txt
LootDrop = user-facing product
BountyGuard = internal policy/safety layer
Bitrefill = fulfillment partner
```

Main pitch:

> LootDrop turns community achievements into claimable real-world rewards.

MVP:

```txt
Discord bot
MCP server
Policy engine
Bitrefill test products
Private redemption delivery
Public audit logs
```
