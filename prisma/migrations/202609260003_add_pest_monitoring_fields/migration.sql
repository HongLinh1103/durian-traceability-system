-- AlterTable
ALTER TABLE "pest_monitoring_books" ALTER COLUMN "trapType" DROP NOT NULL;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "chemicalName" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "controlMethod" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "discoveryLogId" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "discoverySource" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "discoveryStage" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "dosage" text;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "firstDetectedDate" timestamp(3) without time zone;
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "monitoringMethods" text[] DEFAULT ARRAY[]::text[];
ALTER TABLE "pest_monitoring_books" ADD COLUMN IF NOT EXISTS "targetPart" text;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pest_monitoring_books_discoveryLogId_fkey'
    ) THEN
        ALTER TABLE "pest_monitoring_books" 
        ADD CONSTRAINT "pest_monitoring_books_discoveryLogId_fkey" 
        FOREIGN KEY ("discoveryLogId") REFERENCES "FarmingLog"("id") ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "pest_traps" ADD COLUMN IF NOT EXISTS "attractant" text;

-- AlterTable
ALTER TABLE "pest_inspections" ADD COLUMN IF NOT EXISTS "method" text;
ALTER TABLE "pest_inspections" ADD COLUMN IF NOT EXISTS "resultText" text;
ALTER TABLE "pest_inspections" ADD COLUMN IF NOT EXISTS "targetPart" text;

-- AlterTable
ALTER TABLE "pest_inspection_items" ALTER COLUMN "trapId" DROP NOT NULL;
ALTER TABLE "pest_inspection_items" ADD COLUMN IF NOT EXISTS "method" text;
ALTER TABLE "pest_inspection_items" ADD COLUMN IF NOT EXISTS "resultText" text;
ALTER TABLE "pest_inspection_items" ADD COLUMN IF NOT EXISTS "targetPart" text;

-- AlterTable
ALTER TABLE "pest_treatments" ADD COLUMN IF NOT EXISTS "phiDays" integer;
