-- Normalize the visible demo harvest code to the production document format.
UPDATE "harvest_records"
SET "code" = 'TH-20260817-001'
WHERE "code" = 'TH-DEMO-20260817-001'
  AND NOT EXISTS (
    SELECT 1 FROM "harvest_records" WHERE "code" = 'TH-20260817-001'
  );

-- Backfill the agreed proposal price for the two existing collector tickets.
UPDATE "harvest_records"
SET "expectedPricePerKg" = 65000
WHERE "code" IN ('TH-20260817-001', 'TH-DEMO-20260817-001', 'TH-20260818-001')
  AND "expectedPricePerKg" IS NULL;

UPDATE "harvest_variety_items" AS item
SET "expectedPricePerKg" = COALESCE(item."expectedPricePerKg", harvest."expectedPricePerKg")
FROM "harvest_records" AS harvest
WHERE item."harvestId" = harvest."id"
  AND harvest."code" IN ('TH-20260817-001', 'TH-DEMO-20260817-001', 'TH-20260818-001');
