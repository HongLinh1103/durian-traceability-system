-- Backfill traceable PX documents for historical delivered/completed orders.
-- Product stock is intentionally not updated: these historical orders were already
-- reflected in the current stock, and decrementing again would corrupt inventory.
WITH missing_orders AS (
    SELECT orders.*
    FROM "orders" AS orders
    WHERE orders."deletedAt" IS NULL
      AND orders."status" IN ('DELIVERED', 'COMPLETED')
      AND NOT EXISTS (
          SELECT 1
          FROM "inventory_documents" AS document
          WHERE document."orderId" = orders."id"
            AND document."type" = 'PX'
      )
)
INSERT INTO "inventory_documents" (
    "id", "storeId", "code", "type", "businessType", "reason",
    "orderId", "actorName", "createdAt", "updatedAt"
)
SELECT
    'backfill-px-' || orders."id",
    orders."storeId",
    'BACKFILL-' || orders."id",
    'PX',
    'SALE_EXPORT',
    'Bổ sung phiếu xuất cho đơn hàng lịch sử ' || orders."orderCode",
    orders."id",
    'Hệ thống',
    orders."createdAt",
    orders."updatedAt"
FROM missing_orders AS orders;

WITH missing_items AS (
    SELECT
        items."orderId",
        items."productId",
        SUM(items."quantity")::integer AS quantity,
        MIN(items."id") AS "sourceItemId",
        orders."orderCode",
        orders."createdAt",
        products."stock" AS "currentStock"
    FROM "order_items" AS items
    JOIN "orders" AS orders ON orders."id" = items."orderId"
    JOIN "store_products" AS products ON products."id" = items."productId"
    JOIN "inventory_documents" AS document
      ON document."id" = 'backfill-px-' || orders."id"
    WHERE items."productId" IS NOT NULL
    GROUP BY items."orderId", items."productId", orders."orderCode",
             orders."createdAt", products."stock"
), reconstructed AS (
    SELECT
        missing_items.*,
        "currentStock" + COALESCE(
            SUM(quantity) OVER (
                PARTITION BY "productId"
                ORDER BY "createdAt" DESC, "orderId" DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            0
        )::integer AS "stockAfter"
    FROM missing_items
)
INSERT INTO "inventory_movements" (
    "id", "productId", "type", "quantity", "stockBefore", "stockAfter",
    "reference", "note", "createdAt", "documentId"
)
SELECT
    'backfill-movement-' || MD5("orderId" || ':' || "productId"),
    "productId",
    'ORDER_SALE',
    quantity,
    "stockAfter" + quantity,
    "stockAfter",
    "orderCode",
    'Khôi phục lịch sử xuất kho; không trừ lại tồn hiện tại',
    "createdAt",
    'backfill-px-' || "orderId"
FROM reconstructed;

-- Re-number all documents after inserting historical rows. Links use immutable IDs,
-- so changing the display code cannot break order/document navigation.
UPDATE "inventory_documents"
SET "code" = 'RENUMBERING-' || "id";

WITH normalized AS (
    SELECT
        "id",
        "type"::text || '-' ||
        TO_CHAR("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD') || '-' ||
        LPAD(
            ROW_NUMBER() OVER (
                PARTITION BY "type", ("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                ORDER BY "createdAt", "id"
            )::text,
            3,
            '0'
        ) AS "normalizedCode"
    FROM "inventory_documents"
)
UPDATE "inventory_documents" AS document
SET "code" = normalized."normalizedCode"
FROM normalized
WHERE document."id" = normalized."id";
