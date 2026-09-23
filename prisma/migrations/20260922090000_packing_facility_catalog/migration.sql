CREATE TABLE "packing_facility_catalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "fruitType" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "packing_facility_catalog_normalizedCode_key" ON "packing_facility_catalog"("normalizedCode");
CREATE INDEX "packing_facility_catalog_province_name_idx" ON "packing_facility_catalog"("province", "name");
