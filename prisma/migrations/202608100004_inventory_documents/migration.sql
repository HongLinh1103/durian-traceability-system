CREATE TYPE "InventoryDocumentType" AS ENUM ('PN', 'PX', 'DC', 'HT');
CREATE TYPE "InventoryBusinessType" AS ENUM (
  'SUPPLIER_IMPORT', 'STOCK_REPLENISHMENT', 'RETURNED_GOODS_IMPORT',
  'SALE_EXPORT', 'DISPOSAL_EXPORT', 'TRANSFER_EXPORT',
  'STOCKTAKE_INCREASE', 'STOCKTAKE_DECREASE', 'CUSTOMER_RETURN',
  'SUPPLIER_RETURN', 'OPENING_BALANCE'
);

CREATE TABLE "inventory_documents" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "InventoryDocumentType" NOT NULL,
  "businessType" "InventoryBusinessType" NOT NULL,
  "supplierName" TEXT,
  "orderId" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_documents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_movements" ADD COLUMN "documentId" TEXT;

CREATE TEMP TABLE "inventory_legacy_groups" AS
SELECT
  CASE WHEN im."type" IN ('ORDER_SALE', 'ORDER_RETURN') AND im."reference" IS NOT NULL
       THEN im."type"::text || ':' || im."reference"
       ELSE im."id" END AS group_key,
  MIN(im."id") AS document_id,
  MIN(sp."storeId") AS store_id,
  MIN(im."type"::text) AS movement_type,
  MIN(im."reference") AS reference,
  MIN(im."actorId") AS actor_id,
  MIN(im."note") AS note,
  MIN(im."createdAt") AS created_at
FROM "inventory_movements" im
JOIN "store_products" sp ON sp."id" = im."productId"
GROUP BY group_key;

INSERT INTO "inventory_documents" (
  "id", "storeId", "code", "type", "businessType", "orderId",
  "actorId", "actorName", "note", "createdAt", "updatedAt"
)
SELECT
  'doc-' || g.document_id,
  g.store_id,
  (CASE g.movement_type WHEN 'IMPORT' THEN 'PN' WHEN 'ORDER_RETURN' THEN 'HT' ELSE 'PX' END)
    || '-' || TO_CHAR(g.created_at, 'YYYYMMDD') || '-'
    || LPAD(ROW_NUMBER() OVER (
      PARTITION BY (CASE g.movement_type WHEN 'IMPORT' THEN 'PN' WHEN 'ORDER_RETURN' THEN 'HT' ELSE 'PX' END), DATE(g.created_at)
      ORDER BY g.created_at, g.document_id
    )::text, 3, '0'),
  (CASE g.movement_type WHEN 'IMPORT' THEN 'PN' WHEN 'ORDER_RETURN' THEN 'HT' ELSE 'PX' END)::"InventoryDocumentType",
  (CASE g.movement_type
    WHEN 'IMPORT' THEN CASE WHEN g.note ILIKE '%số dư đầu%' THEN 'OPENING_BALANCE' ELSE 'STOCK_REPLENISHMENT' END
    WHEN 'ORDER_SALE' THEN 'SALE_EXPORT'
    WHEN 'ORDER_RETURN' THEN 'CUSTOMER_RETURN'
    ELSE 'DISPOSAL_EXPORT'
  END)::"InventoryBusinessType",
  o."id",
  g.actor_id,
  u."fullName",
  g.note,
  g.created_at,
  g.created_at
FROM "inventory_legacy_groups" g
LEFT JOIN "orders" o ON o."orderCode" = g.reference
LEFT JOIN "User" u ON u."id" = g.actor_id;

UPDATE "inventory_movements" im
SET "documentId" = 'doc-' || g.document_id
FROM "inventory_legacy_groups" g
WHERE (CASE WHEN im."type" IN ('ORDER_SALE', 'ORDER_RETURN') AND im."reference" IS NOT NULL
            THEN im."type"::text || ':' || im."reference"
            ELSE im."id" END) = g.group_key;

ALTER TABLE "inventory_movements" ALTER COLUMN "documentId" SET NOT NULL;
DROP TABLE "inventory_legacy_groups";

CREATE UNIQUE INDEX "inventory_documents_code_key" ON "inventory_documents"("code");
CREATE INDEX "inventory_documents_storeId_createdAt_idx" ON "inventory_documents"("storeId", "createdAt");
CREATE INDEX "inventory_documents_orderId_idx" ON "inventory_documents"("orderId");
CREATE INDEX "inventory_documents_type_businessType_createdAt_idx" ON "inventory_documents"("type", "businessType", "createdAt");
CREATE INDEX "inventory_movements_documentId_idx" ON "inventory_movements"("documentId");

ALTER TABLE "inventory_documents" ADD CONSTRAINT "inventory_documents_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_documents" ADD CONSTRAINT "inventory_documents_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "inventory_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
