ALTER TABLE "durian_varieties"
ADD COLUMN "alternativeName" TEXT;

CREATE TABLE "cultivation_stage_catalogs" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cultivation_stage_catalogs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cultivation_activity_catalogs" (
  "id" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cultivation_activity_catalogs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cultivation_stage_catalogs_code_key" ON "cultivation_stage_catalogs"("code");
CREATE INDEX "cultivation_stage_catalogs_isActive_sortOrder_idx" ON "cultivation_stage_catalogs"("isActive", "sortOrder");
CREATE UNIQUE INDEX "cultivation_activity_catalogs_stageId_code_key" ON "cultivation_activity_catalogs"("stageId", "code");
CREATE INDEX "cultivation_activity_catalogs_stageId_isActive_sortOrder_idx" ON "cultivation_activity_catalogs"("stageId", "isActive", "sortOrder");
ALTER TABLE "cultivation_activity_catalogs" ADD CONSTRAINT "cultivation_activity_catalogs_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "cultivation_stage_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "durian_varieties" ("id", "code", "name", "alternativeName", "description", "isActive", "createdAt", "updatedAt") VALUES
('seed-variety-dona', 'DONA', 'Dona', 'Monthong', 'Giống sầu riêng phổ biến, cơm vàng và hạt lép.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed-variety-ri6', 'RI6', 'Ri6', NULL, 'Giống sầu riêng được trồng phổ biến tại Việt Nam.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed-variety-musang-king', 'MUSANG_KING', 'Musang King', NULL, 'Giống sầu riêng có nguồn gốc Malaysia.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
