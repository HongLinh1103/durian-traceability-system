-- AlterEnum
ALTER TYPE "CommercialLotOwnerType" ADD VALUE 'FARMER';

-- AlterEnum
ALTER TYPE "DistributionDestinationType" ADD VALUE 'MARKET';

-- AlterEnum
ALTER TYPE "LotRelationType" ADD VALUE 'SOLD_DIRECTLY_AS';

-- AlterEnum
ALTER TYPE "ShipmentSenderType" ADD VALUE 'FARMER';

-- AlterTable
ALTER TABLE "commercial_lots" ADD COLUMN     "farmerOwnerId" TEXT,
ADD COLUMN     "remainingQuantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "farmerSenderId" TEXT,
ALTER COLUMN "senderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "traceability_codes" ADD COLUMN     "issuedByRole" "UserRole";

-- Backfill immutable ownership/quantity metadata for existing trace records.
UPDATE "commercial_lots" SET "remainingQuantity" = "quantity" WHERE "remainingQuantity" = 0;
UPDATE "traceability_codes" AS trace
SET "issuedByRole" = account."role"
FROM "User" AS account
WHERE trace."issuedById" = account."id" AND trace."issuedByRole" IS NULL;

-- CreateIndex
CREATE INDEX "commercial_lots_farmerOwnerId_status_idx" ON "commercial_lots"("farmerOwnerId", "status");

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_farmerOwnerId_fkey" FOREIGN KEY ("farmerOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_farmerSenderId_fkey" FOREIGN KEY ("farmerSenderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
