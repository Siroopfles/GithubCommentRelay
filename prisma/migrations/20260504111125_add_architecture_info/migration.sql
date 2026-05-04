-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "architectureInfo" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "healthApiToken" TEXT;
ALTER TABLE "Settings" ADD COLUMN "rssEvents" TEXT;
ALTER TABLE "Settings" ADD COLUMN "rssSecretToken" TEXT;

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settingsId" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT,
    "token" TEXT,
    "chatId" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "smtpTo" TEXT,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationRule_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "Settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationRule_settingsId_isActive_idx" ON "NotificationRule"("settingsId", "isActive");
