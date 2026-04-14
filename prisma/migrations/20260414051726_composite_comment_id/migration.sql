/*
  Warnings:

  - You are about to alter the column `commentId` on the `ProcessedComment` table. The data in that column could be lost. The data in that column will be cast from `String` to `BigInt`.
  - Added the required column `source` to the `ProcessedComment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProcessedComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
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
CREATE INDEX "ProcessedComment_repoOwner_repoName_prNumber_postedAt_idx" ON "ProcessedComment"("repoOwner", "repoName", "prNumber", "postedAt");
CREATE UNIQUE INDEX "ProcessedComment_commentId_source_key" ON "ProcessedComment"("commentId", "source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
