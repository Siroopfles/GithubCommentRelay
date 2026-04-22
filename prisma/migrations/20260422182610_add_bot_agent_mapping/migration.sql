-- CreateTable
CREATE TABLE "BotAgentMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botSource" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BotAgentMapping_botSource_key" ON "BotAgentMapping"("botSource");
