-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "categoryId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "reusePoints" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("aspectRatio", "conversationId", "coverUrl", "createdAt", "deletedAt", "durationSec", "editChain", "hotScore", "id", "isDeleted", "isPublic", "likes", "messageId", "mode", "model", "modelName", "modelTag", "prompt", "reusePoints", "size", "tags", "title", "type", "updatedAt", "userId", "videoUrl", "views") SELECT "aspectRatio", "conversationId", "coverUrl", "createdAt", "deletedAt", "durationSec", "editChain", "hotScore", "id", "isDeleted", "isPublic", "likes", "messageId", "mode", "model", "modelName", "modelTag", "prompt", "reusePoints", "size", "tags", "title", "type", "updatedAt", "userId", "videoUrl", "views" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");
CREATE INDEX "Asset_isPublic_idx" ON "Asset"("isPublic");
CREATE INDEX "Asset_isDeleted_idx" ON "Asset"("isDeleted");
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_enabled_idx" ON "Category"("enabled");

-- CreateIndex
CREATE INDEX "Category_sort_idx" ON "Category"("sort");
