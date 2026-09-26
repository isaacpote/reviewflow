-- AlterTable
ALTER TABLE "Business" ADD COLUMN "notifyOnFailure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notifyEmail" TEXT;
