ALTER TABLE "area_manager_applications"
ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewReason" TEXT;

UPDATE "area_manager_applications" AS application
SET
  "status" = account."accountStatus",
  "reviewedAt" = account."approvedAt"
FROM "users" AS account
WHERE account."id" = application."userId";
