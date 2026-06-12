# LootDrop

Discord-first, agent-native reward-claim system. Admins or agents allocate value, BountyGuard enforces policy, recipients choose, Bitrefill fulfills.

## Language

**Community**:
A Discord guild using LootDrop; `community_id` is the guild ID, 1:1, no platform-neutral abstraction in MVP.
_Avoid_: server, workspace, org

**Reward Claim**:
An internal, recipient-bound authorization to redeem up to a value for eligible Bitrefill products.
_Avoid_: wallet balance, credit, voucher, gift card (the claim is not the product)

**Operator Account**:
The single LootDrop-operated Bitrefill account whose balance pays for all redemptions.
_Avoid_: community account, user wallet

**Community Budget**:
An internal ledger limit (daily/weekly) on a community's claim creation — not a Bitrefill balance.
_Avoid_: balance, funds, deposit

**Redemption**:
The act of converting an approved Reward Claim into one Bitrefill order; at most one per claim.
_Avoid_: purchase, payout, withdrawal

**Requester**:
The identity that creates a claim (admin, moderator, or agent); for MCP calls it is bound at server startup, never client-supplied.
_Avoid_: caller, user (ambiguous with recipient)

## Relationships

- A **Reward Claim** belongs to exactly one **Community** and one recipient
- A **Reward Claim** is created by exactly one **Requester**; the recipient can never be the requester or the approver
- A **Reward Claim** produces at most one **Redemption**
- All **Redemptions** are paid by the **Operator Account**; **Community Budgets** only gate claim creation

## Example dialogue

> **Dev:** "When the agent creates a **Reward Claim**, does money leave the **Operator Account**?"
> **Domain expert:** "No — the claim only reserves **Community Budget**, which is an internal number. Money moves once, at **Redemption**, when the recipient confirms a product."
> **Dev:** "And if the claim expires before redemption?"
> **Domain expert:** "The budget reservation is released. Nothing was ever spent."

## Flagged ambiguities

- "budget" could mean Bitrefill balance or internal limit — resolved: **Community Budget** is purely an internal ledger limit; real money lives only in the **Operator Account**.
- "self-reward/self-approval" conflated two rules — resolved: creator ≠ recipient and approver ≠ recipient are enforced; creator MAY be the approver (solo-admin guilds must work).
- `requester_id` appeared as a client-supplied MCP field — resolved: **Requester** identity is bound at MCP server startup, never accepted from tool arguments.
