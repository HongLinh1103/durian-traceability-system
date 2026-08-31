DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RawMaterialDirection') THEN
        CREATE TYPE "RawMaterialDirection" AS ENUM ('UNCLASSIFIED', 'FRESH_EXPORT', 'PROCESSING', 'SPLIT');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinishedProductBranch') THEN
        CREATE TYPE "FinishedProductBranch" AS ENUM ('FRESH_PACKED', 'PROCESSED');
    END IF;
END $$;

ALTER TABLE "raw_material_lots"
  ADD COLUMN IF NOT EXISTS "direction" "RawMaterialDirection" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN IF NOT EXISTS "freshExportWeight" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processingWeight" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "classifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "classifiedById" TEXT;

ALTER TABLE "finished_product_lots"
  ADD COLUMN IF NOT EXISTS "branch" "FinishedProductBranch" NOT NULL DEFAULT 'PROCESSED';

ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "boxCount" INTEGER;
