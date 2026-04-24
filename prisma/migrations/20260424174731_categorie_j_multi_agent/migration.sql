-- AlterTable
ALTER TABLE "BotAgentMapping" ADD COLUMN "role" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
-- NOTE: Rebuilding the BatchSession table may lock the DB and cause downtime on large datasets.
-- If you have a large database, schedule a maintenance window.
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
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "loopCount" INTEGER NOT NULL DEFAULT 0,
    "lastPromptId" TEXT,
    "lastPromptVars" TEXT
);
INSERT INTO "new_BatchSession" ("firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isHighPriority", "isPaused", "isProcessed", "isProcessing", "lastPromptId", "lastPromptVars", "loopCount", "manualPrompt", "prNumber", "repoName", "repoOwner", "resolved", "resolvedAt") SELECT "firstSeenAt", "forceProcess", "id", "includeCheckRuns", "isHighPriority", "isPaused", "isProcessed", "isProcessing", "lastPromptId", "lastPromptVars", "loopCount", "manualPrompt", "prNumber", "repoName", "repoOwner", "resolved", "resolvedAt" FROM "BatchSession";
DROP TABLE "BatchSession";
ALTER TABLE "new_BatchSession" RENAME TO "BatchSession";
CREATE INDEX "BatchSession_prNumber_repoOwner_repoName_isProcessed_idx" ON "BatchSession"("prNumber", "repoOwner", "repoName", "isProcessed");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
