---
chunk_id: 10_security_compliance
title: Security and Compliance
read_when: Before implementing money, redemption, or Bitrefill flows
dependencies: []
related_tasks: [M5]
sources:
  - https://www.bitrefill.com/terms/
---

# 10 — Security and Compliance

This is product-risk guidance, not legal advice.

## Must not do

```txt
expose raw Bitrefill API key
publicize redemption codes
create cash-out
create transferable balances
market anonymous payments
bypass geoblocking
automate regional subscription arbitrage
allow agents to approve high-value rewards
```

## Safer wording

Use:

```txt
reward claim
claimable reward
digital reward drop
no bank details needed
recipient chooses
```

Avoid:

```txt
wallet balance
withdraw
cash transfer
anonymous payment
VPN bypass
```

## Bitrefill terms posture

Bitrefill terms say products can vary by country and geoblocking circumvention violates their terms. LootDrop must ask for country, respect product availability, and avoid country-arbitrage features.

## Redemption privacy

Redemption data fields may include code, link, PIN, and instructions. Treat all as secrets.
