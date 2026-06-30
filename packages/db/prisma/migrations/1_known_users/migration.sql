-- CreateTable
CREATE TABLE "known_users" (
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "known_users_pkey" PRIMARY KEY ("communityId","userId")
);

-- CreateIndex
CREATE INDEX "known_users_communityId_idx" ON "known_users"("communityId");
