# syntax=docker/dockerfile:1
# Multi-stage build for the LootDrop pnpm monorepo + Prisma.
# Key point: build EVERY workspace package in dependency order (`pnpm -r build`)
# so the bots' cross-package imports resolve — building a single app in
# isolation is what made the original Nixpacks deploy fail.

FROM node:20-slim AS base
# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lootdrop/db generate
RUN pnpm -r build

FROM base AS runtime
ENV NODE_ENV=production
# Copy the whole built workspace (incl. node_modules) so the Prisma CLI + schema
# remain available for `prisma migrate deploy` at boot.
COPY --from=build /app /app
# Apply pending migrations, then start the Telegram bot. Other services override
# this start command (e.g. the Discord bot) via Railway service settings.
CMD ["sh", "-c", "pnpm --filter @lootdrop/db exec prisma migrate deploy && node apps/telegram-bot/dist/index.js"]
