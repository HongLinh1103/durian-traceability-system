INSERT INTO "inventory_movements" (
    "id", "productId", "actorId", "type", "quantity", "stockBefore", "stockAfter", "reference", "note", "createdAt"
)
SELECT
    CONCAT('opening-', p."id"),
    p."id",
    NULL,
    'IMPORT'::"InventoryMovementType",
    p."stock",
    0,
    p."stock",
    'OPENING-BALANCE',
    'Ghi nhận số dư tồn kho đầu kỳ khi bắt đầu sử dụng chức năng quản lý kho.',
    CURRENT_TIMESTAMP
FROM "store_products" p
WHERE p."deletedAt" IS NULL
  AND p."stock" > 0
  AND NOT EXISTS (
      SELECT 1 FROM "inventory_movements" m WHERE m."productId" = p."id"
  );
