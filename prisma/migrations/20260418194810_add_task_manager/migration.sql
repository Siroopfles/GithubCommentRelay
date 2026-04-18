-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "githubIssueNumber" INTEGER,
    "julesSessionId" TEXT,
    "prNumber" INTEGER,
    "contextFiles" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "githubToken" TEXT,
    "requiredBots" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Repository" ("aiSystemPrompt", "autoMergeEnabled", "commentTemplate", "createdAt", "id", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "taskSourcePath", "taskSourceType") SELECT "aiSystemPrompt", "autoMergeEnabled", "commentTemplate", "createdAt", "id", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "mergeStrategy", "name", "owner", "postAggregatedComments", "requireCI", "requiredApprovals", "taskSourcePath", "taskSourceType" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Task_repositoryId_status_idx" ON "Task"("repositoryId", "status");
