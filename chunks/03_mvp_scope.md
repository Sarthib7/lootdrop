---
chunk_id: 03_mvp_scope
title: MVP Scope
read_when: Scoping implementation
dependencies: [00_project_brief]
related_tasks: [M0, M1, M2, M3, M4]
---

# 03 — MVP Scope

## In MVP

```txt
Discord slash command /reward
Approval buttons
Recipient DM claim flow
Country/category/product selection
Bitrefill test-product fulfillment
MCP create_reward_claim tool
Policy checks
Audit log
SQLite/Supabase storage
```

## Out of MVP

```txt
Web dashboard
Cash-out
Wallet balance
Transferable claims
Regional/VPN arbitrage
Browser extension
Real-money autonomous purchases
Enterprise tax reporting
```

## MVP definition of done

End-to-end flow works:

```txt
/reward @alice 10 reason: MVP
        ↓
approval
        ↓
recipient DM
        ↓
product selection
        ↓
test product redemption
        ↓
private code/link
        ↓
public redacted audit log
```
