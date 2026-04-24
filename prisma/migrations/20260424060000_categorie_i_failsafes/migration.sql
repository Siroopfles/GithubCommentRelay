-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT,
    "template" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptTemplate_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "isHighPriority" BOOLEAN NOT NULL DEFAULT false,
    "manualPrompt" TEXT,
    "resolvedAt" DATETIME,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "loopCount" INTEGER NOT NULL DEFAULT 0,
    "lastPromptId" TEXT
);
INSERT INTO "new_BatchSession" ("firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner", "resolved", "resolvedAt") SELECT "firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner", "resolved", "resolvedAt" FROM "BatchSession";
DROP TABLE "BatchSession";
ALTER TABLE "new_BatchSession" RENAME TO "BatchSession";
CREATE INDEX "BatchSession_prNumber_repoOwner_repoName_isProcessed_idx" ON "BatchSession"("prNumber", "repoOwner", "repoName", "isProcessed");
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
    "isRegression" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ProcessedComment" ("author", "body", "category", "commentId", "forwardedToJules", "id", "isSkipped", "nodeId", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source") SELECT "author", "body", "category", "commentId", "forwardedToJules", "id", "isSkipped", "nodeId", "postedAt", "prNumber", "processedAt", "repoName", "repoOwner", "source" FROM "ProcessedComment";
DROP TABLE "ProcessedComment";
ALTER TABLE "new_ProcessedComment" RENAME TO "ProcessedComment";
CREATE INDEX "ProcessedComment_repoOwner_repoName_prNumber_postedAt_idx" ON "ProcessedComment"("repoOwner", "repoName", "prNumber", "postedAt");
CREATE INDEX "ProcessedComment_postedAt_idx" ON "ProcessedComment"("postedAt");
CREATE INDEX "ProcessedComment_category_idx" ON "ProcessedComment"("category");
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
    "aiBotUsernames" TEXT,
    "regressionDetection" BOOLEAN NOT NULL DEFAULT true,
    "regressionMatchMode" TEXT NOT NULL DEFAULT 'exact',
    "infiniteLoopThreshold" INTEGER NOT NULL DEFAULT 3,
    "maxDiffLines" INTEGER NOT NULL DEFAULT 500,
    "complexityWeights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Repository" ("aiSystemPrompt", "autoMergeEnabled", "batchDelay", "branchBlacklist", "branchWhitelist", "commentTemplate", "createdAt", "githubToken", "id", "includeCheckRuns", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "maxConcurrentTasks", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "requiredBots", "taskSourcePath", "taskSourceType") SELECT "aiSystemPrompt", "autoMergeEnabled", "batchDelay", "branchBlacklist", "branchWhitelist", "commentTemplate", "createdAt", "githubToken", "id", "includeCheckRuns", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "maxConcurrentTasks", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "requiredBots", "taskSourcePath", "taskSourceType" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PromptTemplate_repositoryId_isActive_idx" ON "PromptTemplate"("repositoryId", "isActive");
CREATE UNIQUE INDEX "PromptTemplate_repositoryId_name_key" ON "PromptTemplate"("repositoryId", "name");
