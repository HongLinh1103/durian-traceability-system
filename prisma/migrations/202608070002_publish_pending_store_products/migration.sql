-- Product publishing no longer requires administrator approval.
UPDATE "store_products"
SET "status" = 'APPROVED',
    "reviewReason" = NULL
WHERE "status" = 'PENDING_REVIEW'
  AND "deletedAt" IS NULL;
