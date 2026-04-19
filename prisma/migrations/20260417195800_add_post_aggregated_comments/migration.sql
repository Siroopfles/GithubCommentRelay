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
INSERT INTO "new_Repository" ("aiSystemPrompt", "autoMergeEnabled", "commentTemplate", "createdAt", "id", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "mergeStrategy", "name", "owner", "requireCI", "requiredApprovals", "taskSourcePath", "taskSourceType") SELECT "aiSystemPrompt", "autoMergeEnabled", "commentTemplate", "createdAt", "id", "isActive", "julesChatForwardDelay", "julesChatForwardMode", "julesPromptTemplate", "mergeStrategy", "name", "owner", "requireCI", "requiredApprovals", "taskSourcePath", "taskSourceType" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
