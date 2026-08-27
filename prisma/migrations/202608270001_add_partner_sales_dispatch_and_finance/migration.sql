-- CreateEnum
CREATE TYPE "PartnerExpenseCategory" AS ENUM ('RAW_MATERIAL', 'PROCESSING_LABOR', 'PACKAGING', 'COLD_STORAGE_ELECTRICITY', 'LOGISTICS_TRANSPORT', 'EQUIPMENT_MAINTENANCE', 'FACTORY_OVERHEAD', 'OTHER');

-- AlterTable
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "stockBeforeDispatch" DECIMAL(14,2);
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "buyerPhone" TEXT;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "buyerAddress" TEXT;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(14,2);
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(14,2);
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(14,2);
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "debtAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "commercial_lots" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_expenses" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "category" "PartnerExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) DEFAULT 0,
    "status" "ExpensePaymentStatus" NOT NULL DEFAULT 'PAID',
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CHUYEN_KHOAN',
    "recipient" TEXT,
    "note" TEXT,
    "receiptImageUrl" TEXT,
    "relatedHarvestRecordId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_payment_records" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "commercialLotId" TEXT,
    "expenseId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'RECEIPT',
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CHUYEN_KHOAN',
    "payerName" TEXT,
    "receiverName" TEXT,
    "referenceCode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_expenses_facilityId_expenseDate_idx" ON "partner_expenses"("facilityId", "expenseDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_expenses_facilityId_category_idx" ON "partner_expenses"("facilityId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_payment_records_facilityId_paymentDate_idx" ON "partner_payment_records"("facilityId", "paymentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_payment_records_commercialLotId_idx" ON "partner_payment_records"("commercialLotId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_payment_records_expenseId_idx" ON "partner_payment_records"("expenseId");

-- AddForeignKey
ALTER TABLE "partner_expenses" ADD CONSTRAINT "partner_expenses_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payment_records" ADD CONSTRAINT "partner_payment_records_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payment_records" ADD CONSTRAINT "partner_payment_records_commercialLotId_fkey" FOREIGN KEY ("commercialLotId") REFERENCES "commercial_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_payment_records" ADD CONSTRAINT "partner_payment_records_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "partner_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
