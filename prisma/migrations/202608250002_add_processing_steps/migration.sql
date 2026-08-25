-- CreateEnum
CREATE TYPE "ProcessingStepType" AS ENUM (
    'RAW_MATERIAL_ISSUE',
    'CLEANING',
    'PEELING_PULP_SEPARATION',
    'REJECT_REMOVAL',
    'FINAL_WEIGHING',
    'PACKAGING',
    'FREEZING',
    'FINISHED_PRODUCT_QC',
    'FINISHED_PRODUCT_WAREHOUSE_IN'
);

-- CreateEnum
CREATE TYPE "ProcessingStepStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED'
);

-- AlterTable
ALTER TABLE "processing_batches" ADD COLUMN IF NOT EXISTS "line_name" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "processing_steps" (
    "id" TEXT NOT NULL,
    "processing_batch_id" TEXT NOT NULL,
    "step_type" "ProcessingStepType" NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" "ProcessingStepStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "input_weight" DECIMAL(14,2),
    "output_weight" DECIMAL(14,2),
    "loss_weight" DECIMAL(14,2),
    "performed_by_id" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "processing_steps_processing_batch_id_step_type_key" ON "processing_steps"("processing_batch_id", "step_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "processing_steps_processing_batch_id_step_order_idx" ON "processing_steps"("processing_batch_id", "step_order");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processing_steps_processing_batch_id_fkey'
    ) THEN
        ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_processing_batch_id_fkey" FOREIGN KEY ("processing_batch_id") REFERENCES "processing_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processing_steps_performed_by_id_fkey'
    ) THEN
        ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
