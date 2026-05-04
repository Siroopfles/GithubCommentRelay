-- CreateTable
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "commentId" BIGINT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "promptUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentFeedback_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlakyTestRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "name" TEXT,
    "testNameRegex" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ignoreCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlakyTestRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorRewriteRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "name" TEXT,
    "errorRegex" TEXT NOT NULL,
    "rewriteTo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ErrorRewriteRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResolutionTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME NOT NULL,
    "durationSecs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ResolutionTime_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT,
    "template" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PromptTemplate_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PromptTemplate" ("createdAt", "id", "isActive", "name", "repositoryId", "systemPrompt", "template") SELECT "createdAt", "id", "isActive", "name", "repositoryId", "systemPrompt", "template" FROM "PromptTemplate";
DROP TABLE "PromptTemplate";
ALTER TABLE "new_PromptTemplate" RENAME TO "PromptTemplate";
CREATE INDEX "PromptTemplate_repositoryId_isActive_idx" ON "PromptTemplate"("repositoryId", "isActive");
CREATE UNIQUE INDEX "PromptTemplate_repositoryId_name_key" ON "PromptTemplate"("repositoryId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AgentFeedback_repositoryId_agentName_idx" ON "AgentFeedback"("repositoryId", "agentName");

-- CreateIndex
CREATE INDEX "FlakyTestRule_repositoryId_isActive_idx" ON "FlakyTestRule"("repositoryId", "isActive");

-- CreateIndex
CREATE INDEX "ErrorRewriteRule_repositoryId_isActive_idx" ON "ErrorRewriteRule"("repositoryId", "isActive");

-- CreateIndex
CREATE INDEX "ResolutionTime_repositoryId_category_idx" ON "ResolutionTime"("repositoryId", "category");
