-- CreateEnum
CREATE TYPE "ReviewRequestKind" AS ENUM ('REVIEW_REQUEST', 'REACTIVATION');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "reactivationMessage" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "lastVisitAt" TIMESTAMP(3),
ADD COLUMN "autoSentReactivationAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AutomationRule" DROP COLUMN "triggerType",
ADD COLUMN "reactivationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reactivationDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN "kind" "ReviewRequestKind" NOT NULL DEFAULT 'REVIEW_REQUEST';

-- DropEnum
DROP TYPE "TriggerType";
