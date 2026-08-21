ALTER TABLE "crop_seasons"
ADD COLUMN "startingStage" "GrowthStage" NOT NULL DEFAULT 'POST_HARVEST_RECOVERY',
ADD COLUMN "notes" TEXT;

-- Existing active seasons represent the cycle targeting the next harvest year.
UPDATE "crop_seasons"
SET "name" = 'Vụ ' || ("year" + 1)::TEXT,
    "year" = "year" + 1,
    "expectedEndAt" = make_timestamptz("year" + 1, 12, 31, 23, 59, 59, 'Asia/Ho_Chi_Minh')
WHERE "status" = 'ACTIVE';

UPDATE "crop_seasons"
SET "name" = 'Vụ ' || "year"::TEXT
WHERE "status" = 'CLOSED';
