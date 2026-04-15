-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "julesApiKey" TEXT;

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
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forwardedToJules" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ProcessedComment" ("author", "body", "commentId", "id", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source", "forwardedToJules") SELECT "author", "body", "commentId", "id", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source", true AS "forwardedToJules" FROM "ProcessedComment";
DROP TABLE "ProcessedComment";
ALTER TABLE "new_ProcessedComment" RENAME TO "ProcessedComment";
CREATE INDEX "ProcessedComment_repoOwner_repoName_prNumber_postedAt_idx" ON "ProcessedComment"("repoOwner", "repoName", "prNumber", "postedAt");
CREATE UNIQUE INDEX "ProcessedComment_commentId_source_key" ON "ProcessedComment"("commentId", "source");
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoMergeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    "requireCI" BOOLEAN NOT NULL DEFAULT true,
    "mergeStrategy" TEXT NOT NULL DEFAULT 'merge',
    "taskSourceType" TEXT NOT NULL DEFAULT 'none',
    "taskSourcePath" TEXT,
    "julesPromptTemplate" TEXT,
    "julesChatForwardMode" TEXT NOT NULL DEFAULT 'off',
    "julesChatForwardDelay" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Repository" ("autoMergeEnabled", "createdAt", "id", "isActive", "mergeStrategy", "name", "owner", "requireCI", "requiredApprovals") SELECT "autoMergeEnabled", "createdAt", "id", "isActive", "mergeStrategy", "name", "owner", "requireCI", "requiredApprovals" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
