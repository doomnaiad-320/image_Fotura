-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "videoUrl" TEXT,
    "aspectRatio" REAL NOT NULL DEFAULT 1.0,
    "durationSec" INTEGER,
    "modelTag" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "hotScore" REAL NOT NULL DEFAULT 0,
    "prompt" TEXT,
    "userId" TEXT,
    "messageId" TEXT,
    "conversationId" TEXT,
    "model" TEXT,
    "modelName" TEXT,
    "size" TEXT,
    "mode" TEXT,
    "editChain" TEXT DEFAULT '{}',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("aspectRatio", "coverUrl", "createdAt", "durationSec", "hotScore", "id", "likes", "modelTag", "tags", "title", "type", "updatedAt", "videoUrl", "views") SELECT "aspectRatio", "coverUrl", "createdAt", "durationSec", "hotScore", "id", "likes", "modelTag", "tags", "title", "type", "updatedAt", "videoUrl", "views" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");
CREATE INDEX "Asset_isPublic_idx" ON "Asset"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
