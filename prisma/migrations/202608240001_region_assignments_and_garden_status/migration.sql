CREATE TYPE "GrowingRegionStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED');
CREATE TYPE "GardenStatus" AS ENUM ('PENDING', 'ACTIVE', 'NEEDS_INSPECTION', 'SUSPENDED', 'INACTIVE');

ALTER TABLE "growing_regions"
  ADD COLUMN "status" "GrowingRegionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "boundary" JSONB,
  ADD COLUMN "areaSize" DOUBLE PRECISION,
  ADD COLUMN "cropType" TEXT NOT NULL DEFAULT 'Sầu riêng',
  ADD COLUMN "approvalCode" TEXT,
  ADD COLUMN "approvalIssuedAt" TIMESTAMP(3),
  ADD COLUMN "exportMarkets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "managingOrganization" TEXT,
  ADD COLUMN "certificateUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "growing_regions"
SET "status" = CASE
  WHEN "isActive" = false THEN 'SUSPENDED'::"GrowingRegionStatus"
  WHEN "validUntil" IS NOT NULL AND "validUntil" < CURRENT_TIMESTAMP THEN 'EXPIRED'::"GrowingRegionStatus"
  ELSE 'ACTIVE'::"GrowingRegionStatus"
END;

ALTER TABLE "Farm"
  ADD COLUMN "status" "GardenStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "statusChangedAt" TIMESTAMP(3);

UPDATE "Farm" f SET "status" = CASE
  WHEN EXISTS (SELECT 1 FROM "User" u WHERE u."id" = f."farmerId" AND u."accountStatus" <> 'APPROVED') THEN 'PENDING'::"GardenStatus"
  WHEN f."isActive" = false THEN 'INACTIVE'::"GardenStatus"
  ELSE 'ACTIVE'::"GardenStatus"
END;

CREATE TABLE "area_manager_region_assignments" (
  "id" TEXT NOT NULL,
  "areaManagerId" TEXT NOT NULL,
  "growingRegionId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT NOT NULL,
  "endedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  CONSTRAINT "area_manager_region_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "garden_status_histories" (
  "id" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "fromStatus" "GardenStatus",
  "toStatus" "GardenStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "garden_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "area_manager_region_assignments_areaManagerId_isActive_idx" ON "area_manager_region_assignments"("areaManagerId", "isActive");
CREATE INDEX "area_manager_region_assignments_growingRegionId_isActive_idx" ON "area_manager_region_assignments"("growingRegionId", "isActive");
CREATE UNIQUE INDEX "one_active_manager_per_region_idx" ON "area_manager_region_assignments"("growingRegionId") WHERE "isActive" = true;
CREATE INDEX "garden_status_histories_farmId_createdAt_idx" ON "garden_status_histories"("farmId", "createdAt");

ALTER TABLE "area_manager_region_assignments" ADD CONSTRAINT "area_manager_region_assignments_areaManagerId_fkey" FOREIGN KEY ("areaManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "area_manager_region_assignments" ADD CONSTRAINT "area_manager_region_assignments_growingRegionId_fkey" FOREIGN KEY ("growingRegionId") REFERENCES "growing_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "area_manager_region_assignments" ADD CONSTRAINT "area_manager_region_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garden_status_histories" ADD CONSTRAINT "garden_status_histories_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garden_status_histories" ADD CONSTRAINT "garden_status_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill the legacy JSON assignments. The manager is used as actor when no Admin exists.
WITH assignment_codes AS (
  SELECT a."userId" AS manager_id,
         COALESCE(item->>'code', a."managedRegions"->>'code') AS region_code
  FROM "area_manager_applications" a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(a."managedRegions") = 'array' THEN a."managedRegions" ELSE '[]'::jsonb END
  ) item ON true
), resolved AS (
  SELECT DISTINCT ac.manager_id, r."id" AS region_id
  FROM assignment_codes ac JOIN "growing_regions" r ON r."code" = ac.region_code
  WHERE ac.region_code IS NOT NULL
)
INSERT INTO "area_manager_region_assignments" ("id", "areaManagerId", "growingRegionId", "assignedById", "note")
SELECT 'assignment_' || md5(res.manager_id || ':' || res.region_id), res.manager_id, res.region_id,
       COALESCE((SELECT "id" FROM "User" WHERE "role" = 'ADMIN' AND "deletedAt" IS NULL ORDER BY "createdAt" LIMIT 1), res.manager_id),
       'Chuyển đổi từ phân công vùng cũ'
FROM resolved res
ON CONFLICT DO NOTHING;
