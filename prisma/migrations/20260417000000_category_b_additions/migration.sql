-- AlterTable
ALTER TABLE "TargetReviewer" ADD COLUMN "noActionRegex" TEXT;

-- AlterTable
ALTER TABLE "ProcessedComment" ADD COLUMN "nodeId" TEXT;
ALTER TABLE "ProcessedComment" ADD COLUMN "isSkipped" BOOLEAN NOT NULL DEFAULT false;
