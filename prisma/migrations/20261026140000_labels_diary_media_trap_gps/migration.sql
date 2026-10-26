ALTER TABLE "FarmingLog" ADD COLUMN "voiceUrl" TEXT, ADD COLUMN "createdById" TEXT, ADD COLUMN "updatedById" TEXT;
CREATE TABLE "farming_log_media" (
  "id" TEXT NOT NULL, "logId" TEXT NOT NULL, "uploaderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL, "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farming_log_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "farming_log_media_logId_fkey" FOREIGN KEY ("logId") REFERENCES "FarmingLog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "farming_log_media_logId_idx" ON "farming_log_media"("logId");
ALTER TABLE "pest_traps" ADD COLUMN "accuracyMeters" DOUBLE PRECISION, ADD COLUMN "locationCapturedAt" TIMESTAMP(3);
ALTER TABLE "processing_qr_publications" ADD COLUMN "labelConfig" JSONB;
