-- CreateEnum
CREATE TYPE "ProductBatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RECALLED', 'QUARANTINED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "SupplySourceType" AS ENUM ('STORE_PURCHASE', 'SELF_DECLARED', 'MANUAL_IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TraceComplianceStatus" AS ENUM ('PASS', 'WARNING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HarvestLotStatus" AS ENUM ('DRAFT', 'FINALIZED', 'DISPATCHED', 'PARTIALLY_USED', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_DELIVERY', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'RECEIVED', 'QC_PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityResult" AS ENUM ('PASSED', 'FAILED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "CollectionLotStatus" AS ENUM ('OPEN', 'FINALIZED', 'DISPATCHED', 'PARTIALLY_USED', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RawMaterialSourceType" AS ENUM ('HARVEST_LOT', 'COLLECTION_LOT');

-- CreateEnum
CREATE TYPE "RawMaterialReceiptStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'RECEIVED', 'QC_PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RawMaterialLotStatus" AS ENUM ('PENDING_QC', 'AVAILABLE', 'QUARANTINED', 'REJECTED', 'PARTIALLY_USED', 'USED');

-- CreateEnum
CREATE TYPE "ProcessingBatchStatus" AS ENUM ('DRAFT', 'PREPARING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinishedProductLotStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'QC_HOLD', 'READY_FOR_DISTRIBUTION', 'PARTIALLY_DISTRIBUTED', 'DISTRIBUTED', 'RECALLED');

-- CreateEnum
CREATE TYPE "LotEntityType" AS ENUM ('HARVEST_LOT', 'COLLECTION_LOT', 'RAW_MATERIAL_LOT', 'PROCESSING_BATCH', 'FINISHED_PRODUCT_LOT', 'COMMERCIAL_LOT');

-- CreateEnum
CREATE TYPE "LotRelationType" AS ENUM ('MERGED_INTO', 'SPLIT_INTO', 'PROCESSED_INTO', 'PACKAGED_INTO', 'TRANSFERRED_INTO');

-- CreateEnum
CREATE TYPE "DistributionDestinationType" AS ENUM ('RETAIL', 'DISTRIBUTOR', 'EXPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "CommercialLotOwnerType" AS ENUM ('COLLECTOR', 'PROCESSING_FACILITY');

-- CreateEnum
CREATE TYPE "CommercialLotSourceType" AS ENUM ('HARVEST_LOT', 'COLLECTION_LOT', 'FINISHED_PRODUCT_LOT');

-- CreateEnum
CREATE TYPE "CommercialLotStatus" AS ENUM ('DRAFT', 'READY', 'QR_ISSUED', 'DISPATCHED', 'RECEIVED', 'CLOSED', 'CANCELLED', 'RECALLED');

-- CreateEnum
CREATE TYPE "ShipmentSenderType" AS ENUM ('COLLECTOR', 'PROCESSING_FACILITY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'READY', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TraceabilityCodeStatus" AS ENUM ('DRAFT', 'READY_TO_ISSUE', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CropSeasonStatus" ADD VALUE 'PLANNED';
ALTER TYPE "CropSeasonStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "farmer_supplies" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "productBatchId" TEXT,
ADD COLUMN     "sourceType" "SupplySourceType" NOT NULL DEFAULT 'SELF_DECLARED',
ADD COLUMN     "storeId" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "supplierName" TEXT,
    "manufacturerName" TEXT,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "receivedQuantity" DECIMAL(14,2) NOT NULL,
    "remainingQuantity" DECIMAL(14,2) NOT NULL,
    "status" "ProductBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_batches" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "harvestRecordId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropSeasonId" TEXT NOT NULL,
    "harvestedAt" TIMESTAMP(3) NOT NULL,
    "weight" DECIMAL(14,2) NOT NULL,
    "remainingWeight" DECIMAL(14,2) NOT NULL,
    "complianceStatus" "TraceComplianceStatus" NOT NULL,
    "complianceDetails" JSONB,
    "status" "HarvestLotStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_trace_snapshots" (
    "id" TEXT NOT NULL,
    "harvestLotId" TEXT NOT NULL,
    "farmerSnapshot" JSONB NOT NULL,
    "farmSnapshot" JSONB NOT NULL,
    "regionSnapshot" JSONB NOT NULL,
    "seasonSnapshot" JSONB NOT NULL,
    "cultivationSummarySnapshot" JSONB NOT NULL,
    "pesticideSnapshot" JSONB NOT NULL,
    "complianceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harvest_trace_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_orders" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "sellerFarmerId" TEXT NOT NULL,
    "collectorFacilityId" TEXT NOT NULL,
    "harvestLotId" TEXT NOT NULL,
    "expectedWeight" DECIMAL(14,2) NOT NULL,
    "agreedWeight" DECIMAL(14,2),
    "agreedPrice" DECIMAL(14,2),
    "pickupDate" TIMESTAMP(3),
    "deliveryMethod" TEXT,
    "status" "ProcurementOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "procurementOrderId" TEXT NOT NULL,
    "deliveredWeight" DECIMAL(14,2) NOT NULL,
    "receivedWeight" DECIMAL(14,2) NOT NULL,
    "acceptedWeight" DECIMAL(14,2) NOT NULL,
    "rejectedWeight" DECIMAL(14,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedById" TEXT NOT NULL,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_qualities" (
    "id" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "appearance" TEXT,
    "ripeness" TEXT,
    "sizeGrade" TEXT,
    "damageRate" DECIMAL(5,2),
    "foreignMatter" TEXT,
    "grade" TEXT,
    "result" "QualityResult" NOT NULL,
    "note" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_qualities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "collectorFacilityId" TEXT NOT NULL,
    "totalWeight" DECIMAL(14,2) NOT NULL,
    "currentWeight" DECIMAL(14,2) NOT NULL,
    "storageLocation" TEXT,
    "status" "CollectionLotStatus" NOT NULL DEFAULT 'OPEN',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_lot_items" (
    "id" TEXT NOT NULL,
    "collectionLotId" TEXT NOT NULL,
    "harvestLotId" TEXT NOT NULL,
    "sourceWeight" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_lot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_receipts" (
    "id" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "sourceType" "RawMaterialSourceType" NOT NULL,
    "sourceHarvestLotId" TEXT,
    "sourceCollectionLotId" TEXT,
    "facilityId" TEXT NOT NULL,
    "dispatchedWeight" DECIMAL(14,2) NOT NULL,
    "receivedWeight" DECIMAL(14,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedById" TEXT NOT NULL,
    "status" "RawMaterialReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "rawMaterialReceiptId" TEXT NOT NULL,
    "acceptedWeight" DECIMAL(14,2) NOT NULL,
    "currentWeight" DECIMAL(14,2) NOT NULL,
    "warehouseLocation" TEXT,
    "status" "RawMaterialLotStatus" NOT NULL DEFAULT 'PENDING_QC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" TEXT NOT NULL,
    "rawMaterialLotId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "appearance" TEXT,
    "qualityGrade" TEXT,
    "residueResult" TEXT,
    "damageRate" DECIMAL(5,2),
    "result" "QualityResult" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "targetProduct" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "supervisorId" TEXT NOT NULL,
    "totalInputWeight" DECIMAL(14,2) NOT NULL,
    "totalOutputWeight" DECIMAL(14,2) NOT NULL,
    "lossWeight" DECIMAL(14,2) NOT NULL,
    "yieldPercent" DECIMAL(7,2) NOT NULL,
    "status" "ProcessingBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_batch_inputs" (
    "id" TEXT NOT NULL,
    "processingBatchId" TEXT NOT NULL,
    "rawMaterialLotId" TEXT NOT NULL,
    "inputWeight" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_batch_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finished_product_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "processingBatchId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "netWeight" DECIMAL(14,2) NOT NULL,
    "remainingWeight" DECIMAL(14,2) NOT NULL,
    "manufacturedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "packaging" TEXT,
    "storageCondition" TEXT,
    "warehouseLocation" TEXT,
    "status" "FinishedProductLotStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finished_product_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DistributionDestinationType" NOT NULL,
    "country" TEXT,
    "province" TEXT,
    "district" TEXT,
    "address" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "ownerType" "CommercialLotOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceType" "CommercialLotSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceHarvestLotId" TEXT,
    "sourceCollectionLotId" TEXT,
    "sourceFinishedProductLotId" TEXT,
    "destinationId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "status" "CommercialLotStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_relations" (
    "id" TEXT NOT NULL,
    "sourceType" "LotEntityType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" "LotEntityType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" "LotRelationType" NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentCode" TEXT NOT NULL,
    "senderType" "ShipmentSenderType" NOT NULL,
    "senderId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "dispatchAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "dispatchedWeight" DECIMAL(14,2) NOT NULL,
    "receivedWeight" DECIMAL(14,2),
    "vehicleReference" TEXT,
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "trackingReference" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "commercialLotId" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "weight" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_shipment_info" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "exporterName" TEXT,
    "buyerName" TEXT,
    "portOfLoading" TEXT,
    "portOfDestination" TEXT,
    "customsDeclarationNumber" TEXT,
    "phytosanitaryCertificateNumber" TEXT,
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "exportDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_shipment_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traceability_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "commercialLotId" TEXT NOT NULL,
    "status" "TraceabilityCodeStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedById" TEXT,
    "suspendReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traceability_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_events" (
    "id" TEXT NOT NULL,
    "commercialLotId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "organizationType" TEXT,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationText" TEXT,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "metadata" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trace_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trace_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_batchCode_key" ON "product_batches"("batchCode");

-- CreateIndex
CREATE INDEX "product_batches_storeProductId_status_expiryDate_idx" ON "product_batches"("storeProductId", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "order_item_batches_productBatchId_idx" ON "order_item_batches"("productBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_batches_orderItemId_productBatchId_key" ON "order_item_batches"("orderItemId", "productBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "harvest_lots_lotCode_key" ON "harvest_lots"("lotCode");

-- CreateIndex
CREATE UNIQUE INDEX "harvest_lots_harvestRecordId_key" ON "harvest_lots"("harvestRecordId");

-- CreateIndex
CREATE INDEX "harvest_lots_farmId_harvestedAt_idx" ON "harvest_lots"("farmId", "harvestedAt");

-- CreateIndex
CREATE INDEX "harvest_lots_cropSeasonId_status_idx" ON "harvest_lots"("cropSeasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "harvest_trace_snapshots_harvestLotId_key" ON "harvest_trace_snapshots"("harvestLotId");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_orders_orderCode_key" ON "procurement_orders"("orderCode");

-- CreateIndex
CREATE INDEX "procurement_orders_collectorFacilityId_status_idx" ON "procurement_orders"("collectorFacilityId", "status");

-- CreateIndex
CREATE INDEX "procurement_orders_sellerFarmerId_status_idx" ON "procurement_orders"("sellerFarmerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_receiptCode_key" ON "goods_receipts"("receiptCode");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_procurementOrderId_key" ON "goods_receipts"("procurementOrderId");

-- CreateIndex
CREATE INDEX "goods_receipts_status_receivedAt_idx" ON "goods_receipts"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_qualities_goodsReceiptId_key" ON "goods_receipt_qualities"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "goods_receipt_qualities_result_inspectedAt_idx" ON "goods_receipt_qualities"("result", "inspectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "collection_lots_lotCode_key" ON "collection_lots"("lotCode");

-- CreateIndex
CREATE INDEX "collection_lots_collectorFacilityId_status_idx" ON "collection_lots"("collectorFacilityId", "status");

-- CreateIndex
CREATE INDEX "collection_lot_items_harvestLotId_idx" ON "collection_lot_items"("harvestLotId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_lot_items_collectionLotId_harvestLotId_key" ON "collection_lot_items"("collectionLotId", "harvestLotId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_receipts_receiptCode_key" ON "raw_material_receipts"("receiptCode");

-- CreateIndex
CREATE INDEX "raw_material_receipts_facilityId_status_idx" ON "raw_material_receipts"("facilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_lots_lotCode_key" ON "raw_material_lots"("lotCode");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_lots_rawMaterialReceiptId_key" ON "raw_material_lots"("rawMaterialReceiptId");

-- CreateIndex
CREATE INDEX "raw_material_lots_facilityId_status_idx" ON "raw_material_lots"("facilityId", "status");

-- CreateIndex
CREATE INDEX "quality_inspections_rawMaterialLotId_inspectedAt_idx" ON "quality_inspections"("rawMaterialLotId", "inspectedAt");

-- CreateIndex
CREATE INDEX "quality_inspections_result_idx" ON "quality_inspections"("result");

-- CreateIndex
CREATE UNIQUE INDEX "processing_batches_batchCode_key" ON "processing_batches"("batchCode");

-- CreateIndex
CREATE INDEX "processing_batches_facilityId_status_idx" ON "processing_batches"("facilityId", "status");

-- CreateIndex
CREATE INDEX "processing_batch_inputs_rawMaterialLotId_idx" ON "processing_batch_inputs"("rawMaterialLotId");

-- CreateIndex
CREATE UNIQUE INDEX "processing_batch_inputs_processingBatchId_rawMaterialLotId_key" ON "processing_batch_inputs"("processingBatchId", "rawMaterialLotId");

-- CreateIndex
CREATE UNIQUE INDEX "finished_product_lots_lotCode_key" ON "finished_product_lots"("lotCode");

-- CreateIndex
CREATE INDEX "finished_product_lots_facilityId_status_idx" ON "finished_product_lots"("facilityId", "status");

-- CreateIndex
CREATE INDEX "distribution_destinations_type_country_idx" ON "distribution_destinations"("type", "country");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_destinations_name_address_key" ON "distribution_destinations"("name", "address");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_lots_lotCode_key" ON "commercial_lots"("lotCode");

-- CreateIndex
CREATE INDEX "commercial_lots_ownerId_status_idx" ON "commercial_lots"("ownerId", "status");

-- CreateIndex
CREATE INDEX "commercial_lots_sourceType_sourceId_idx" ON "commercial_lots"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "commercial_lots_destinationId_idx" ON "commercial_lots"("destinationId");

-- CreateIndex
CREATE INDEX "lot_relations_sourceType_sourceId_idx" ON "lot_relations"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "lot_relations_targetType_targetId_idx" ON "lot_relations"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "lot_relations_sourceType_sourceId_targetType_targetId_relat_key" ON "lot_relations"("sourceType", "sourceId", "targetType", "targetId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentCode_key" ON "shipments"("shipmentCode");

-- CreateIndex
CREATE INDEX "shipments_senderId_status_idx" ON "shipments"("senderId", "status");

-- CreateIndex
CREATE INDEX "shipments_destinationId_status_idx" ON "shipments"("destinationId", "status");

-- CreateIndex
CREATE INDEX "shipment_items_commercialLotId_idx" ON "shipment_items"("commercialLotId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_shipmentId_commercialLotId_key" ON "shipment_items"("shipmentId", "commercialLotId");

-- CreateIndex
CREATE UNIQUE INDEX "export_shipment_info_shipmentId_key" ON "export_shipment_info"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "traceability_codes_code_key" ON "traceability_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "traceability_codes_publicToken_key" ON "traceability_codes"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "traceability_codes_commercialLotId_key" ON "traceability_codes"("commercialLotId");

-- CreateIndex
CREATE INDEX "traceability_codes_status_issuedAt_idx" ON "traceability_codes"("status", "issuedAt");

-- CreateIndex
CREATE INDEX "trace_events_commercialLotId_isPublic_eventTime_idx" ON "trace_events"("commercialLotId", "isPublic", "eventTime");

-- CreateIndex
CREATE INDEX "trace_events_entityType_entityId_eventTime_idx" ON "trace_events"("entityType", "entityId", "eventTime");

-- CreateIndex
CREATE INDEX "trace_audit_logs_entityType_entityId_createdAt_idx" ON "trace_audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "trace_audit_logs_actorId_createdAt_idx" ON "trace_audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "farmer_supplies_productBatchId_idx" ON "farmer_supplies"("productBatchId");

-- AddForeignKey
ALTER TABLE "farmer_supplies" ADD CONSTRAINT "farmer_supplies_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_supplies" ADD CONSTRAINT "farmer_supplies_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_supplies" ADD CONSTRAINT "farmer_supplies_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_supplies" ADD CONSTRAINT "farmer_supplies_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batches" ADD CONSTRAINT "order_item_batches_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batches" ADD CONSTRAINT "order_item_batches_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_harvestRecordId_fkey" FOREIGN KEY ("harvestRecordId") REFERENCES "harvest_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "crop_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_trace_snapshots" ADD CONSTRAINT "harvest_trace_snapshots_harvestLotId_fkey" FOREIGN KEY ("harvestLotId") REFERENCES "harvest_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_orders" ADD CONSTRAINT "procurement_orders_sellerFarmerId_fkey" FOREIGN KEY ("sellerFarmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_orders" ADD CONSTRAINT "procurement_orders_collectorFacilityId_fkey" FOREIGN KEY ("collectorFacilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_orders" ADD CONSTRAINT "procurement_orders_harvestLotId_fkey" FOREIGN KEY ("harvestLotId") REFERENCES "harvest_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_procurementOrderId_fkey" FOREIGN KEY ("procurementOrderId") REFERENCES "procurement_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_qualities" ADD CONSTRAINT "goods_receipt_qualities_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_lots" ADD CONSTRAINT "collection_lots_collectorFacilityId_fkey" FOREIGN KEY ("collectorFacilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_lot_items" ADD CONSTRAINT "collection_lot_items_collectionLotId_fkey" FOREIGN KEY ("collectionLotId") REFERENCES "collection_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_lot_items" ADD CONSTRAINT "collection_lot_items_harvestLotId_fkey" FOREIGN KEY ("harvestLotId") REFERENCES "harvest_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_sourceHarvestLotId_fkey" FOREIGN KEY ("sourceHarvestLotId") REFERENCES "harvest_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_sourceCollectionLotId_fkey" FOREIGN KEY ("sourceCollectionLotId") REFERENCES "collection_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receipts" ADD CONSTRAINT "raw_material_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_lots" ADD CONSTRAINT "raw_material_lots_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_lots" ADD CONSTRAINT "raw_material_lots_rawMaterialReceiptId_fkey" FOREIGN KEY ("rawMaterialReceiptId") REFERENCES "raw_material_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_rawMaterialLotId_fkey" FOREIGN KEY ("rawMaterialLotId") REFERENCES "raw_material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_batch_inputs" ADD CONSTRAINT "processing_batch_inputs_processingBatchId_fkey" FOREIGN KEY ("processingBatchId") REFERENCES "processing_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_batch_inputs" ADD CONSTRAINT "processing_batch_inputs_rawMaterialLotId_fkey" FOREIGN KEY ("rawMaterialLotId") REFERENCES "raw_material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finished_product_lots" ADD CONSTRAINT "finished_product_lots_processingBatchId_fkey" FOREIGN KEY ("processingBatchId") REFERENCES "processing_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finished_product_lots" ADD CONSTRAINT "finished_product_lots_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_sourceHarvestLotId_fkey" FOREIGN KEY ("sourceHarvestLotId") REFERENCES "harvest_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_sourceCollectionLotId_fkey" FOREIGN KEY ("sourceCollectionLotId") REFERENCES "collection_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_sourceFinishedProductLotId_fkey" FOREIGN KEY ("sourceFinishedProductLotId") REFERENCES "finished_product_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_lots" ADD CONSTRAINT "commercial_lots_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "distribution_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "partner_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "distribution_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_commercialLotId_fkey" FOREIGN KEY ("commercialLotId") REFERENCES "commercial_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_shipment_info" ADD CONSTRAINT "export_shipment_info_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_codes" ADD CONSTRAINT "traceability_codes_commercialLotId_fkey" FOREIGN KEY ("commercialLotId") REFERENCES "commercial_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_codes" ADD CONSTRAINT "traceability_codes_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_codes" ADD CONSTRAINT "traceability_codes_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceability_codes" ADD CONSTRAINT "traceability_codes_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_events" ADD CONSTRAINT "trace_events_commercialLotId_fkey" FOREIGN KEY ("commercialLotId") REFERENCES "commercial_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_events" ADD CONSTRAINT "trace_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_audit_logs" ADD CONSTRAINT "trace_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
