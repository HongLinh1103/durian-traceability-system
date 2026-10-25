CREATE TABLE "processing_drying_times" (
  "ownerId" TEXT NOT NULL REFERENCES "processing_gmp_workspaces"("ownerId") ON DELETE CASCADE ON UPDATE CASCADE,
  "recordId" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ(3),
  "endedAt" TIMESTAMPTZ(3),
  "needsDateReview" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("ownerId", "recordId"),
  CHECK ("endedAt" IS NULL OR ("startedAt" IS NOT NULL AND "endedAt" > "startedAt"))
);

-- Historical time-only values have no confirmed date. Preserve the original JSON
-- verbatim and flag them for review; never infer dates from the register date.
INSERT INTO "processing_drying_times" ("ownerId", "recordId", "needsDateReview")
SELECT w."ownerId", r->>'id', true
FROM "processing_gmp_workspaces" w,
LATERAL jsonb_array_elements(COALESCE(w.data->'records'->'preprocessing', '[]'::jsonb)) r
WHERE r->>'id' IS NOT NULL;
