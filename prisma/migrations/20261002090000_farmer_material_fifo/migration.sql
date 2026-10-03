ALTER TABLE "farmer_supply_transactions"
  ADD COLUMN "exportPurpose" TEXT,
  ADD COLUMN "expiryDate" TIMESTAMP(3),
  ADD COLUMN "fifoAllocations" JSONB;

-- Preserve known cultivation exports; unscoped legacy exports are not cultivation costs.
UPDATE "farmer_supply_transactions"
SET "exportPurpose" = CASE
  WHEN COALESCE(notes, '') ILIKE '%[disposal]%' OR COALESCE(purpose, '') ~* '(hủy|huỷ|dispose|disposal|expired|hết hạn)' THEN 'DISPOSAL'
  WHEN "farmId" IS NOT NULL AND "cropSeasonId" IS NOT NULL THEN 'CULTIVATION'
  ELSE 'OTHER' END
WHERE type = 'OUT';

UPDATE "farmer_supply_transactions" t
SET "expiryDate" = b."expiryDate"
FROM "farmer_supplies" s JOIN "product_batches" b ON b.id = s."productBatchId"
WHERE t."supplyId" = s.id AND t.type = 'IN';

ALTER TABLE "farming_log_materials" ADD COLUMN "content" TEXT, ADD COLUMN "phiDays" INTEGER;
UPDATE "farming_log_materials" m SET content = t.notes FROM "farmer_supply_transactions" t WHERE t.id = m."transactionId";
