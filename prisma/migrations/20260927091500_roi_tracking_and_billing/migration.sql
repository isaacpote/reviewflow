ALTER TABLE "Business" ADD COLUMN "avgCustomerValue" INTEGER,
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT,
ADD COLUMN "trialEndsAt" TIMESTAMP(3);
