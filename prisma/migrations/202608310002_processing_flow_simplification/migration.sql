CREATE TYPE "RawMaterialDirection" AS ENUM ('UNCLASSIFIED', 'FRESH_EXPORT', 'PROCESSING', 'SPLIT');
CREATE TYPE "FinishedProductBranch" AS ENUM ('FRESH_PACKED', 'PROCESSED');
ALTER TABLE "raw_material_lots"
  ADD COLUMN "direction" "RawMaterialDirection" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "freshExportWeight" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "processingWeight" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "classifiedAt" TIMESTAMP(3),
  ADD COLUMN "classifiedById" TEXT;
ALTER TABLE "finished_product_lots"
  ADD COLUMN "branch" "FinishedProductBranch" NOT NULL DEFAULT 'PROCESSED';
ALTER TABLE "shipments" ADD COLUMN "boxCount" INTEGER;
