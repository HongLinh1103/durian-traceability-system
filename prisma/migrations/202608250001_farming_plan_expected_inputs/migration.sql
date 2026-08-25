ALTER TABLE "farming_plans"
ADD COLUMN IF NOT EXISTS "plannedMaterial" TEXT,
ADD COLUMN IF NOT EXISTS "plannedQuantity" TEXT;
