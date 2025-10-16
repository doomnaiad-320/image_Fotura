-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "modalities" TEXT NOT NULL DEFAULT '[]',
    "contextWindow" INTEGER,
    "supportsStream" BOOLEAN NOT NULL DEFAULT false,
    "pricing" TEXT NOT NULL DEFAULT '{}',
    "rateLimit" TEXT NOT NULL DEFAULT '{}',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isPromptOptimizer" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AiModel" ("contextWindow", "createdAt", "displayName", "enabled", "family", "id", "modalities", "pricing", "providerId", "rateLimit", "slug", "sort", "supportsStream", "tags", "updatedAt") SELECT "contextWindow", "createdAt", "displayName", "enabled", "family", "id", "modalities", "pricing", "providerId", "rateLimit", "slug", "sort", "supportsStream", "tags", "updatedAt" FROM "AiModel";
DROP TABLE "AiModel";
ALTER TABLE "new_AiModel" RENAME TO "AiModel";
CREATE UNIQUE INDEX "AiModel_slug_key" ON "AiModel"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
