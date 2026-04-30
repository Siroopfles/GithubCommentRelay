-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "groupName" TEXT DEFAULT 'Default';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "julesSessionCreatedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "julesSessionPrUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN "julesSessionState" TEXT;
ALTER TABLE "Task" ADD COLUMN "julesSessionUrl" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProcessedComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" BIGINT NOT NULL,
    "nodeId" TEXT,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forwardedToJules" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "isRegression" BOOLEAN NOT NULL DEFAULT false,
    "isPruned" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ProcessedComment" ("author", "body", "category", "commentId", "forwardedToJules", "id", "isRegression", "isSkipped", "nodeId", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source") SELECT "author", "body", "category", "commentId", "forwardedToJules", "id", "isRegression", "isSkipped", "nodeId", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source" FROM "ProcessedComment";
DROP TABLE "ProcessedComment";
ALTER TABLE "new_ProcessedComment" RENAME TO "ProcessedComment";
CREATE INDEX "ProcessedComment_repoOwner_repoName_prNumber_postedAt_idx" ON "ProcessedComment"("repoOwner", "repoName", "prNumber", "postedAt");
CREATE INDEX "ProcessedComment_postedAt_idx" ON "ProcessedComment"("postedAt");
CREATE INDEX "ProcessedComment_category_idx" ON "ProcessedComment"("category");
CREATE UNIQUE INDEX "ProcessedComment_commentId_source_key" ON "ProcessedComment"("commentId", "source");
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "githubToken" TEXT,
    "pollingInterval" INTEGER NOT NULL DEFAULT 60,
    "batchDelay" INTEGER NOT NULL DEFAULT 5,
    "julesApiKey" TEXT,
    "pruneDays" INTEGER NOT NULL DEFAULT 60,
    "githubRateLimitRemaining" INTEGER,
    "githubRateLimitReset" DATETIME,
    "webhookSecret" TEXT,
    "masterPasswordHash" TEXT,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sessionSecret" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("batchDelay", "githubRateLimitRemaining", "githubRateLimitReset", "githubToken", "id", "julesApiKey", "pollingInterval", "pruneDays", "updatedAt", "webhookSecret") SELECT "batchDelay", "githubRateLimitRemaining", "githubRateLimitReset", "githubToken", "id", "julesApiKey", "pollingInterval", "pruneDays", "updatedAt", "webhookSecret" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Task_julesSessionState_idx" ON "Task"("julesSessionState");
