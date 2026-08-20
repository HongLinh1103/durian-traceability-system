-- Normalize the visible demo harvest code to the production document format.
UPDATE "HarvestRecord"
SET "code" = 'TH-20260817-001'
WHERE "code" = 'TH-DEMO-20260817-001'
  AND NOT EXISTS (
    SELECT 1 FROM "HarvestRecord" WHERE "code" = 'TH-20260817-001'
  );

-- Backfill the agreed proposal price for the two existing collector tickets.
UPDATE "HarvestRecord"
SET "expectedPricePerKg" = 65000
WHERE "code" IN ('TH-20260817-001', 'TH-DEMO-20260817-001', 'TH-20260818-001')
  AND "expectedPricePerKg" IS NULL;

UPDATE "HarvestVarietyItem" AS item
SET "expectedPricePerKg" = COALESCE(item."expectedPricePerKg", harvest."expectedPricePerKg")
FROM "HarvestRecord" AS harvest
WHERE item."harvestId" = harvest."id"
  AND harvest."code" IN ('TH-20260817-001', 'TH-DEMO-20260817-001', 'TH-20260818-001');
