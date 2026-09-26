-- Older databases were created before this optional profile field was added.
-- Local databases may already have it from a schema push.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "identityNumber" TEXT;
