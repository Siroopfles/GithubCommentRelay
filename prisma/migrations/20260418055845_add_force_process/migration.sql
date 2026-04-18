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
    "forceProcess" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_BatchSession" ("firstSeenAt", "id", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner") SELECT "firstSeenAt", "id", "isProcessed", "isProcessing", "prNumber", "repoName", "repoOwner" FROM "BatchSession";
DROP TABLE "BatchSession";
ALTER TABLE "new_BatchSession" RENAME TO "BatchSession";
CREATE INDEX "BatchSession_prNumber_repoOwner_repoName_isProcessed_idx" ON "BatchSession"("prNumber", "repoOwner", "repoName", "isProcessed");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
