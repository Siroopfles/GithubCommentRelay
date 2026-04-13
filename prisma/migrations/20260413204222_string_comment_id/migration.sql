-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BatchSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prNumber" INTEGER NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isProcessing" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_BatchSession" ("firstSeenAt", "id", "isProcessed", "prNumber", "repoName", "repoOwner") SELECT "firstSeenAt", "id", "isProcessed", "prNumber", "repoName", "repoOwner" FROM "BatchSession";
DROP TABLE "BatchSession";
ALTER TABLE "new_BatchSession" RENAME TO "BatchSession";
CREATE TABLE "new_ProcessedComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ProcessedComment" ("author", "body", "commentId", "id", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner") SELECT "author", "body", "commentId", "id", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner" FROM "ProcessedComment";
DROP TABLE "ProcessedComment";
ALTER TABLE "new_ProcessedComment" RENAME TO "ProcessedComment";
CREATE UNIQUE INDEX "ProcessedComment_commentId_key" ON "ProcessedComment"("commentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
