---
chunk_id: 08_discord_bot
title: Discord Bot
read_when: Building slash commands, buttons, DMs
dependencies: [04_user_flows, 09_data_model, 10_security_compliance]
related_tasks: [M2]
sources:
  - https://docs.discord.com/developers/interactions/application-commands
  - https://docs.discord.com/developers/components/overview
---

# 08 — Discord Bot

## P0 commands

```txt
/reward user amount reason
/rewards pending
/rewards budget
/myrewards
```

## P1 commands

```txt
/rewards approve claim_id
/rewards deny claim_id
right-click user: Reward user
right-click message: Reward this contribution
```

## Components

Approval card:

```txt
[Approve] [Deny] [Edit amount]
```

Recipient card:

```txt
Country select
Category select
Product select
Confirm redemption
```

## Visibility

```txt
approval: admin channel/ephemeral
recipient selection: DM
redemption code: DM only
audit log: public — recipient + amount + reason + status only
           (chosen product/category/country never public)
```
