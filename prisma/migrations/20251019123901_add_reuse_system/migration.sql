-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN "refUserId" TEXT;
ALTER TABLE "CreditTransaction" ADD COLUMN "refWorkId" TEXT;

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceWorkId" TEXT NOT NULL,
    "derivativeWorkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkRelation_sourceWorkId_fkey" FOREIGN KEY ("sourceWorkId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkRelation_derivativeWorkId_fkey" FOREIGN KEY ("derivativeWorkId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReuseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceWorkId" TEXT NOT NULL,
    "reuserId" TEXT NOT NULL,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReuseRecord_sourceWorkId_fkey" FOREIGN KEY ("sourceWorkId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReuseRecord_reuserId_fkey" FOREIGN KEY ("reuserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "WorkRelation_sourceWorkId_idx" ON "WorkRelation"("sourceWorkId");

-- CreateIndex
CREATE INDEX "WorkRelation_derivativeWorkId_idx" ON "WorkRelation"("derivativeWorkId");

-- CreateIndex
CREATE INDEX "ReuseRecord_sourceWorkId_idx" ON "ReuseRecord"("sourceWorkId");

-- CreateIndex
CREATE INDEX "ReuseRecord_reuserId_idx" ON "ReuseRecord"("reuserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReuseRecord_sourceWorkId_reuserId_key" ON "ReuseRecord"("sourceWorkId", "reuserId");

-- CreateIndex
CREATE INDEX "CreditTransaction_refWorkId_idx" ON "CreditTransaction"("refWorkId");
