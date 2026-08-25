-- CreateEnum safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcessingStepType') THEN
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
    END IF;
END $$;

-- CreateEnum safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcessingStepStatus') THEN
        CREATE TYPE "ProcessingStepStatus" AS ENUM (
            'PENDING',
            'IN_PROGRESS',
            'COMPLETED',
            'SKIPPED'
        );
    END IF;
END $$;

-- AlterTable
ALTER TABLE "processing_batches" ADD COLUMN IF NOT EXISTS "lineName" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "processing_steps" (
    "id" TEXT NOT NULL,
    "processingBatchId" TEXT NOT NULL,
    "stepType" "ProcessingStepType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" "ProcessingStepStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inputWeight" DECIMAL(14,2),
    "outputWeight" DECIMAL(14,2),
    "lossWeight" DECIMAL(14,2),
    "performedById" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "processing_steps_processingBatchId_stepType_key" ON "processing_steps"("processingBatchId", "stepType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "processing_steps_processingBatchId_stepOrder_idx" ON "processing_steps"("processingBatchId", "stepOrder");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processing_steps_processingBatchId_fkey'
    ) THEN
        ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_processingBatchId_fkey" FOREIGN KEY ("processingBatchId") REFERENCES "processing_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processing_steps_performedById_fkey'
    ) THEN
        ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
