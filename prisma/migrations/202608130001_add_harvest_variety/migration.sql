ALTER TABLE "harvest_records" ADD COLUMN "durianVariety" TEXT;

UPDATE "harvest_records" AS harvest
SET "durianVariety" = farm."durianVariety"
FROM "Farm" AS farm
WHERE harvest."farmId" = farm."id";

ALTER TABLE "harvest_records" ALTER COLUMN "durianVariety" SET NOT NULL;
