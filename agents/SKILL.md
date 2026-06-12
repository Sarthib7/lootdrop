# LootDrop Agent Skill

Use this skill when a user, Discord community, game guild, hackathon, DAO, or agent wants to reward a person with a digital reward claim that can be redeemed for eligible Bitrefill products.

---

## Core behavior

You are an agent using LootDrop. Your job is to help create, approve, search, and redeem reward claims safely.

Always prefer creating a **reward claim** over directly buying a gift card.

---

## Product model

```txt
Reward-worthy event
        ↓
create_reward_claim
        ↓
BountyGuard policy check
        ↓
approval if required
        ↓
recipient chooses country/category/product
        ↓
redeem_reward_claim
        ↓
private redemption delivery
```

---

## Hard rules

- Never buy directly from Bitrefill unless using the approved LootDrop redemption flow.
- Never request or reveal the raw Bitrefill API key.
- Never send redemption codes, PINs, or links in a public channel.
- Never approve a reward where you or your requester is the recipient — any value, not just high-value.
- Never create a reward outside the community budget or allowed categories.
- Never bypass recipient country/product restrictions.
- Never describe the product as anonymous payment, cash-out, or money transfer.
- Never create transferable claims or wallet balances.
- If uncertain, create a pending claim and ask for admin approval.

---

## Preferred language

Use:

```txt
reward claim
LootDrop
claimable reward
digital reward drop
no bank details needed
recipient chooses
```

Avoid:

```txt
wallet balance
cash balance
withdraw
anonymous payment
bypass
VPN
regional arbitrage
```

---

## Tools

### `create_reward_claim`

Use when a community member should receive a reward.

Required fields:

```txt
recipient
amount
currency
reason
```

Optional fields:

```txt
allowed_categories
event_id
metadata
```

Your identity and community are fixed by the MCP server's configuration. Do not attempt to pass `community_id` or `requester_id` — they are ignored.

### `suggest_reward_amount`

Use to recommend reward size from contribution type.

Example:

```txt
minor help: $2-$5
moderation event: $5-$15
tournament MVP: $5-$25
hackathon micro-prize: $10-$50
```

### `list_reward_budget`

Use before creating a reward if budget is unclear.

### `list_pending_claims`

Use when an admin asks what needs approval.

### `search_claim_options`

Use after a claim is approved and recipient country/category are known.

### `redeem_reward_claim`

Use only when:

```txt
claim is approved
recipient selected product
policy still passes
redemption will be private
```

### `get_reward_audit_log`

Use to summarize reward history. Always redact redemption code/link/PIN.

---

## Example interaction

User:

```txt
Reward Alice $10 for winning MVP tonight.
```

Agent:

```txt
I will create a $10 LootDrop claim for Alice with reason “MVP tonight.” This requires admin approval because it is above the auto-approve threshold.
```

Tool call:

```json
{
  "tool": "create_reward_claim",
  "args": {
    "recipient": "discord:alice",
    "amount": 10,
    "currency": "USD",
    "reason": "MVP tonight",
    "allowed_categories": ["gaming", "food", "shopping"]
  }
}
```

Tool result:

```json
{
  "claim_id": "claim_123",
  "status": "requires_approval",
  "approval_channel": "discord"
}
```

Agent response:

```txt
Reward claim created and sent for approval. Alice will choose her reward after approval.
```

---

## Error handling

If policy denies a reward:

```txt
Explain the policy reason briefly.
Offer a safe alternative, such as a smaller amount or pending admin review.
```

If recipient country is missing:

```txt
Ask recipient to choose country before showing product options.
```

If Bitrefill fulfillment fails:

```txt
Do not retry indefinitely.
Mark claim failed or retryable.
Notify admin and recipient without exposing internals or codes.
```
