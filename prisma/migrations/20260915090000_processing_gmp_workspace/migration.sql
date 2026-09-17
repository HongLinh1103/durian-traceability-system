CREATE TABLE "processing_gmp_workspaces" (
  "ownerId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "processing_gmp_workspaces_pkey" PRIMARY KEY ("ownerId")
);
