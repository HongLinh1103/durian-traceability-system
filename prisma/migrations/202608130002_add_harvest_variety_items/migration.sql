CREATE TABLE "harvest_variety_items" (
  "id" TEXT NOT NULL,
  "harvestId" TEXT NOT NULL,
  "durianVariety" TEXT NOT NULL,
  "expectedWeight" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "harvest_variety_items_pkey" PRIMARY KEY ("id")
);

INSERT INTO "harvest_variety_items" ("id", "harvestId", "durianVariety", "expectedWeight", "updatedAt")
SELECT 'legacy-' || "id", "id", "durianVariety", "expectedWeight", CURRENT_TIMESTAMP
FROM "harvest_records";

CREATE UNIQUE INDEX "harvest_variety_items_harvestId_durianVariety_key"
ON "harvest_variety_items"("harvestId", "durianVariety");
CREATE INDEX "harvest_variety_items_harvestId_idx"
ON "harvest_variety_items"("harvestId");
ALTER TABLE "harvest_variety_items"
ADD CONSTRAINT "harvest_variety_items_harvestId_fkey"
FOREIGN KEY ("harvestId") REFERENCES "harvest_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
