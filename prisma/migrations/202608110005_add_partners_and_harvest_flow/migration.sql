ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COLLECTOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PROCESSING_FACILITY';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'TRACK_FRUIT';

CREATE TYPE "PartnerStatus" AS ENUM ('DRAFT','PENDING','NEED_SUPPLEMENT','APPROVED','REJECTED','SUSPENDED');
CREATE TYPE "PartnerType" AS ENUM ('COLLECTOR','PROCESSING_FACILITY');
CREATE TYPE "PartnerDocumentType" AS ENUM ('BUSINESS_REGISTRATION','FOOD_SAFETY_CERTIFICATE','PROCESSING_CERTIFICATE','STANDARD_CERTIFICATE','OTHER');
CREATE TYPE "HarvestBuyerType" AS ENUM ('UNDETERMINED','COLLECTOR','PROCESSING_FACILITY','SELF_CONSUMPTION');
CREATE TYPE "HarvestStatus" AS ENUM ('DRAFT','WAITING_CONFIRMATION','CONFIRMED','REJECTED','HARVESTING','HARVESTED','DELIVERY_CONFIRMED','COMPLETED','CANCELLED');
CREATE TYPE "HarvestDeliveryMethod" AS ENUM ('BUYER_PICKUP','FARMER_DELIVERY');

CREATE TABLE "partner_facilities" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL UNIQUE, "type" "PartnerType" NOT NULL,
  "representativeName" TEXT NOT NULL, "representativePhone" TEXT NOT NULL, "representativeEmail" TEXT,
  "identityNumber" TEXT NOT NULL, "identityIssuedDate" TIMESTAMP(3), "identityIssuedPlace" TEXT,
  "name" TEXT NOT NULL, "organizationType" TEXT NOT NULL, "taxCode" TEXT, "businessCode" TEXT,
  "phone" TEXT NOT NULL, "email" TEXT, "website" TEXT, "address" TEXT NOT NULL, "province" TEXT NOT NULL,
  "ward" TEXT, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "contactPerson" TEXT,
  "purchasingAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "processingTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expectedCapacity" DECIMAL(14,2), "capacityUnit" TEXT, "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "description" TEXT, "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING', "reviewReason" TEXT,
  "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "approvedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_facilities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "partner_facilities_type_status_deletedAt_idx" ON "partner_facilities"("type","status","deletedAt");
CREATE INDEX "partner_facilities_province_status_idx" ON "partner_facilities"("province","status");

CREATE TABLE "partner_documents" (
  "id" TEXT PRIMARY KEY, "facilityId" TEXT NOT NULL, "type" "PartnerDocumentType" NOT NULL, "name" TEXT NOT NULL,
  "documentNumber" TEXT, "issuedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "issuingAuthority" TEXT,
  "storageKey" TEXT, "fileUrl" TEXT, "mimeType" TEXT, "fileSize" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partner_documents_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "partner_documents_facilityId_type_idx" ON "partner_documents"("facilityId","type");
CREATE INDEX "partner_documents_expiresAt_idx" ON "partner_documents"("expiresAt");

CREATE TABLE "harvest_records" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "farmId" TEXT NOT NULL, "farmerId" TEXT NOT NULL,
  "buyerType" "HarvestBuyerType" NOT NULL DEFAULT 'UNDETERMINED', "buyerFacilityId" TEXT, "buyerUserId" TEXT,
  "status" "HarvestStatus" NOT NULL DEFAULT 'DRAFT', "expectedHarvestDate" TIMESTAMP(3) NOT NULL, "plotArea" TEXT,
  "expectedTreeCount" INTEGER, "expectedFruitCount" INTEGER, "expectedWeight" DECIMAL(14,2) NOT NULL,
  "weightUnit" TEXT NOT NULL DEFAULT 'kg', "fruitCondition" TEXT, "evidenceImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expectedSaleWeight" DECIMAL(14,2), "expectedPricePerKg" DECIMAL(14,2), "expectedBuyerArrivalDate" TIMESTAMP(3),
  "deliveryMethod" "HarvestDeliveryMethod", "transactionNote" TEXT, "rejectionReason" TEXT,
  "actualStartedAt" TIMESTAMP(3), "actualHarvestedAt" TIMESTAMP(3), "actualTreeCount" INTEGER, "actualFruitCount" INTEGER,
  "actualWeight" DECIMAL(14,2), "actualImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "actualNote" TEXT,
  "farmerDeliveredAt" TIMESTAMP(3), "buyerReceivedAt" TIMESTAMP(3), "deliveredWeight" DECIMAL(14,2),
  "receivedWeight" DECIMAL(14,2), "weightDifferenceReason" TEXT, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "harvest_records_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "harvest_records_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "harvest_records_buyerFacilityId_fkey" FOREIGN KEY ("buyerFacilityId") REFERENCES "partner_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "harvest_records_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "harvest_records_farmerId_status_createdAt_idx" ON "harvest_records"("farmerId","status","createdAt");
CREATE INDEX "harvest_records_buyerUserId_status_createdAt_idx" ON "harvest_records"("buyerUserId","status","createdAt");
CREATE INDEX "harvest_records_farmId_expectedHarvestDate_idx" ON "harvest_records"("farmId","expectedHarvestDate");

CREATE TABLE "harvest_status_histories" (
  "id" TEXT PRIMARY KEY, "harvestId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "fromStatus" "HarvestStatus",
  "toStatus" "HarvestStatus" NOT NULL, "note" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "harvest_status_histories_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "harvest_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "harvest_status_histories_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "harvest_status_histories_harvestId_createdAt_idx" ON "harvest_status_histories"("harvestId","createdAt");

ALTER TABLE "FarmingLog" ADD COLUMN "harvestRecordId" TEXT;
CREATE UNIQUE INDEX "FarmingLog_harvestRecordId_key" ON "FarmingLog"("harvestRecordId");
ALTER TABLE "FarmingLog" ADD CONSTRAINT "FarmingLog_harvestRecordId_fkey" FOREIGN KEY ("harvestRecordId") REFERENCES "harvest_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
