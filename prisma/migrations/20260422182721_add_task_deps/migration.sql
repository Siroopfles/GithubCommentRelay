-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
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
    "dependsOnId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("body", "contextFiles", "createdAt", "githubIssueNumber", "id", "julesSessionId", "prNumber", "priority", "repositoryId", "source", "status", "title", "updatedAt") SELECT "body", "contextFiles", "createdAt", "githubIssueNumber", "id", "julesSessionId", "prNumber", "priority", "repositoryId", "source", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_repositoryId_status_idx" ON "Task"("repositoryId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
