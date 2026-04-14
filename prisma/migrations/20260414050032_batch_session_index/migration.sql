-- CreateIndex
CREATE INDEX "BatchSession_prNumber_repoOwner_repoName_isProcessed_idx" ON "BatchSession"("prNumber", "repoOwner", "repoName", "isProcessed");
