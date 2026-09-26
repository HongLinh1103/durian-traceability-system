CREATE TABLE "farmer_harvest_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "harvestId" TEXT NOT NULL REFERENCES "harvest_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" > 0),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "farmer_harvest_receipts_harvestId_idx" ON "farmer_harvest_receipts"("harvestId");
