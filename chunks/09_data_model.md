---
chunk_id: 09_data_model
title: Data Model
read_when: Building DB schema or status machine
dependencies: [03_mvp_scope]
related_tasks: [M1]
---

# 09 — Data Model

## Tables

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

## Claim statuses

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

## Valid transitions

```txt
created             → approved | pending_approval | cancelled
pending_approval    → approved | cancelled | expired
approved            → recipient_selecting | expired | cancelled
recipient_selecting → redeeming | expired
redeeming           → fulfilled | failed
failed              → recipient_selecting (retry) | cancelled
```

Terminal: `fulfilled`, `expired`, `cancelled`. Reject + audit anything else. The `recipient_selecting → redeeming` transition must be atomic (double-spend guard, STATUS M5-07).

## Important data rules

- Store amounts as integer cents/minor units.
- Never persist redemption info — store Bitrefill order/invoice IDs only; fetch codes on demand for delivery/re-delivery.
- Audit logs must not contain redemption code/link/PIN.
- Every state transition should append an audit event.
- Use idempotency keys for Discord interactions and MCP calls.
- Unique constraint on `redemptions.claim_id` — one claim can never produce two invoices.
- `recipient_preferences` stores the recipient's confirmed country (and later category preference); pre-selected with one-tap change on each claim.
