-- These optional fields existed locally but were missing from migration history.
ALTER TABLE "partner_facilities"
    ADD COLUMN IF NOT EXISTS "code" TEXT,
    ADD COLUMN IF NOT EXISTS "approvalCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "partner_facilities_code_key"
    ON "partner_facilities"("code");
