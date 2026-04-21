-- AlterTable
ALTER TABLE "ProcessedComment" ADD COLUMN "category" TEXT;

-- CreateTable
CREATE TABLE "PRLabelRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "labelName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PRLabelRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "remaining" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIAgentAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "isSuccess" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "forceProcess" BOOLEAN NOT NULL DEFAULT false,
    "includeCheckRuns" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "aiRespondedAt" DATETIME
);
INSERT INTO "new_BatchSession" ("firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner") SELECT "firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner" FROM "BatchSession";
DROP TABLE "BatchSession";
ALTER TABLE "new_BatchSession" RENAME TO "BatchSession";
CREATE INDEX "BatchSession_prNumber_repoOwner_repoName_isProcessed_idx" ON "BatchSession"("prNumber", "repoOwner", "repoName", "isProcessed");
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
    "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 3,
    "julesPromptTemplate" TEXT,
    "julesChatForwardMode" TEXT NOT NULL DEFAULT 'off',
    "julesChatForwardDelay" INTEGER NOT NULL DEFAULT 5,
    "aiSystemPrompt" TEXT,
    "commentTemplate" TEXT,
    "postAggregatedComments" BOOLEAN NOT NULL DEFAULT true,
    "batchDelay" INTEGER,
    "branchWhitelist" TEXT,
    "branchBlacklist" TEXT,
    "includeCheckRuns" BOOLEAN NOT NULL DEFAULT false,
    "githubToken" TEXT,
    "requiredBots" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Repository" ("aiSystemPrompt", "autoMergeEnabled", "batchDelay", "branchBlacklist", "branchWhitelist", "commentTemplate", "createdAt", "githubToken", "id", "includeCheckRuns", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "maxConcurrentTasks", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "requiredBots", "taskSourcePath", "taskSourceType") SELECT "aiSystemPrompt", "autoMergeEnabled", "batchDelay", "branchBlacklist", "branchWhitelist", "commentTemplate", "createdAt", "githubToken", "id", "includeCheckRuns", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "maxConcurrentTasks", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "requiredBots", "taskSourcePath", "taskSourceType" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PRLabelRule_repositoryId_idx" ON "PRLabelRule"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PRLabelRule_repositoryId_event_labelName_key" ON "PRLabelRule"("repositoryId", "event", "labelName");

-- CreateIndex
CREATE INDEX "RateLimitLog_createdAt_idx" ON "RateLimitLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessedComment_postedAt_idx" ON "ProcessedComment"("postedAt");

-- CreateIndex
CREATE INDEX "ProcessedComment_category_idx" ON "ProcessedComment"("category");
