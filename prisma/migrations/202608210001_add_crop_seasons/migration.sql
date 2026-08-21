CREATE TYPE "CropSeasonStatus" AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE "crop_seasons" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "status" "CropSeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expectedEndAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crop_seasons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FarmingLog" ADD COLUMN "cropSeasonId" TEXT;
ALTER TABLE "harvest_records" ADD COLUMN "cropSeasonId" TEXT;

CREATE UNIQUE INDEX "crop_seasons_farmId_year_sequence_key" ON "crop_seasons"("farmId", "year", "sequence");
CREATE INDEX "crop_seasons_farmId_status_idx" ON "crop_seasons"("farmId", "status");
CREATE UNIQUE INDEX "crop_seasons_one_active_per_farm_idx" ON "crop_seasons"("farmId") WHERE "status" = 'ACTIVE';
CREATE INDEX "FarmingLog_cropSeasonId_actionDate_idx" ON "FarmingLog"("cropSeasonId", "actionDate");
CREATE INDEX "harvest_records_cropSeasonId_idx" ON "harvest_records"("cropSeasonId");

ALTER TABLE "crop_seasons" ADD CONSTRAINT "crop_seasons_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmingLog" ADD CONSTRAINT "FarmingLog_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "crop_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "harvest_records" ADD CONSTRAINT "harvest_records_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "crop_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Give every existing farmer garden a closed previous season and an active current season.
INSERT INTO "crop_seasons" ("id", "farmId", "name", "year", "sequence", "status", "startedAt", "expectedEndAt", "closedAt", "createdAt", "updatedAt")
SELECT 'season_' || md5(f."id" || ':2025:1'), f."id", 'Vụ mùa 2025', 2025, 1, 'CLOSED', TIMESTAMP '2025-01-01', TIMESTAMP '2025-12-31', TIMESTAMP '2025-12-31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Farm" f
JOIN "User" u ON u."id" = f."farmerId"
WHERE u."role" = 'FARMER';

INSERT INTO "crop_seasons" ("id", "farmId", "name", "year", "sequence", "status", "startedAt", "expectedEndAt", "createdAt", "updatedAt")
SELECT 'season_' || md5(f."id" || ':2026:1'), f."id", 'Vụ mùa 2026', 2026, 1, 'ACTIVE', TIMESTAMP '2026-01-01', TIMESTAMP '2026-12-31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Farm" f
JOIN "User" u ON u."id" = f."farmerId"
WHERE u."role" = 'FARMER' AND f."isActive" = true;

UPDATE "FarmingLog" l
SET "cropSeasonId" = s."id"
FROM "crop_seasons" s
WHERE s."farmId" = l."farmId" AND s."year" = EXTRACT(YEAR FROM l."actionDate")::INTEGER;

UPDATE "harvest_records" h
SET "cropSeasonId" = s."id"
FROM "crop_seasons" s
WHERE s."farmId" = h."farmId" AND s."year" = EXTRACT(YEAR FROM h."expectedHarvestDate")::INTEGER;
