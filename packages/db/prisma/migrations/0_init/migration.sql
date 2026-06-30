-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'discord',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_policies" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dailyBudgetCents" INTEGER NOT NULL,
    "weeklyBudgetCents" INTEGER NOT NULL,
    "maxSingleRewardCents" INTEGER NOT NULL,
    "autoApproveBelowCents" INTEGER NOT NULL,
    "claimExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "allowedCategoriesJson" TEXT NOT NULL,
    "allowSelfRewards" BOOLEAN NOT NULL DEFAULT false,
    "recipientCooldownHours" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "community_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_claims" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "allowedCategoriesJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "bitrefillProductId" TEXT NOT NULL,
    "bitrefillInvoiceId" TEXT,
    "bitrefillOrderId" TEXT,
    "country" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_preferences" (
    "platform" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipient_preferences_pkey" PRIMARY KEY ("platform","recipientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_policies_communityId_key" ON "community_policies"("communityId");

-- CreateIndex
CREATE INDEX "reward_claims_communityId_status_idx" ON "reward_claims"("communityId", "status");

-- CreateIndex
CREATE INDEX "reward_claims_communityId_recipientId_createdAt_idx" ON "reward_claims"("communityId", "recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_claimId_key" ON "redemptions"("claimId");

-- CreateIndex
CREATE INDEX "audit_logs_communityId_createdAt_idx" ON "audit_logs"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "community_policies" ADD CONSTRAINT "community_policies_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "reward_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "reward_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

