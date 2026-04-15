-- CreateTable
CREATE TABLE "AutoMergeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Repository" ("createdAt", "id", "isActive", "name", "owner") SELECT "createdAt", "id", "isActive", "name", "owner" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AutoMergeLog_repoOwner_repoName_prNumber_idx" ON "AutoMergeLog"("repoOwner", "repoName", "prNumber");
