ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'exporter';
CREATE TABLE "ExporterOrganization" (
 "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
 "taxCode" TEXT UNIQUE, "contactName" TEXT NOT NULL, "phone" TEXT NOT NULL, "address" TEXT NOT NULL,
 "isActive" BOOLEAN NOT NULL DEFAULT true, "canReceive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "User" ADD COLUMN "exporterOrganizationId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_exporterOrganizationId_fkey" FOREIGN KEY ("exporterOrganizationId") REFERENCES "ExporterOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "ExporterHandover" (
 "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "saleId" TEXT NOT NULL, "exporterId" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "acceptedBoxes" INTEGER,
 "acceptedWeight" DECIMAL(14,3), "receivedAt" TIMESTAMP(3), "receiptNote" TEXT, "receivedBy" TEXT,
 "revision" INTEGER NOT NULL DEFAULT 0, "audit" JSONB NOT NULL DEFAULT '[]',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ExporterHandover_exporterId_fkey" FOREIGN KEY ("exporterId") REFERENCES "ExporterOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ExporterHandover_receipt_check" CHECK ("acceptedBoxes" IS NULL OR "acceptedBoxes" >= 0),
 CONSTRAINT "ExporterHandover_weight_check" CHECK ("acceptedWeight" IS NULL OR "acceptedWeight" >= 0)
);
CREATE UNIQUE INDEX "ExporterHandover_ownerId_saleId_key" ON "ExporterHandover"("ownerId", "saleId");
CREATE INDEX "ExporterHandover_exporterId_status_idx" ON "ExporterHandover"("exporterId", "status");
CREATE TABLE "ExporterShipment" (
 "id" TEXT PRIMARY KEY, "exporterId" TEXT NOT NULL, "code" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "isPublic" BOOLEAN NOT NULL DEFAULT false,
 "data" JSONB NOT NULL, "audit" JSONB NOT NULL DEFAULT '[]', "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ExporterShipment_exporterId_fkey" FOREIGN KEY ("exporterId") REFERENCES "ExporterOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExporterShipment_exporterId_code_key" ON "ExporterShipment"("exporterId", "code");
CREATE INDEX "ExporterShipment_exporterId_status_idx" ON "ExporterShipment"("exporterId", "status");
CREATE TABLE "ExporterShipmentAllocation" (
 "id" TEXT PRIMARY KEY, "shipmentId" TEXT NOT NULL, "handoverId" TEXT NOT NULL,
 "boxes" INTEGER NOT NULL, "weight" DECIMAL(14,3) NOT NULL,
 CONSTRAINT "ExporterShipmentAllocation_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ExporterShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ExporterShipmentAllocation_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "ExporterHandover"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ExporterShipmentAllocation_positive_check" CHECK ("boxes" > 0 AND "weight" > 0)
);
CREATE UNIQUE INDEX "ExporterShipmentAllocation_shipmentId_handoverId_key" ON "ExporterShipmentAllocation"("shipmentId", "handoverId");
CREATE INDEX "ExporterShipmentAllocation_handoverId_idx" ON "ExporterShipmentAllocation"("handoverId");
