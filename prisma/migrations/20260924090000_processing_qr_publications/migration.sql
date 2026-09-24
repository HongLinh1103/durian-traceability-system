CREATE TABLE "processing_qr_publications" (
  "token" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "processing_qr_publications_ownerId_saleId_key" ON "processing_qr_publications"("ownerId", "saleId");
