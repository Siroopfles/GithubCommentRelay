-- CreateTable
CREATE TABLE "WebhookSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("batchDelay", "githubToken", "id", "julesApiKey", "pollingInterval", "updatedAt") SELECT "batchDelay", "githubToken", "id", "julesApiKey", "pollingInterval", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WebhookSignal_createdAt_repoOwner_repoName_idx" ON "WebhookSignal"("createdAt", "repoOwner", "repoName");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookSignal_repoOwner_repoName_prNumber_key" ON "WebhookSignal"("repoOwner", "repoName", "prNumber");
