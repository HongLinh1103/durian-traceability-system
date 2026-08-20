-- Normalize every existing inventory document to PREFIX-YYYYMMDD-SEQ.
-- The temporary value prevents unique-key collisions while old and new codes overlap.
UPDATE "inventory_documents"
SET "code" = 'MIGRATING-' || "id";

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
