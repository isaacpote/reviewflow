-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "kycFailureReason" TEXT,
ADD COLUMN     "kycSessionId" TEXT,
ADD COLUMN     "kycStatus" "KycStatus",
ADD COLUMN     "kycVerifiedName" TEXT;
