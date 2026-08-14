CREATE TABLE "weather_observations" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "condition" TEXT NOT NULL,
  "temperature" DOUBLE PRECISION,
  "humidity" DOUBLE PRECISION,
  "soilHumidity" DOUBLE PRECISION,
  "rainLevel" TEXT,
  "rainStartedAt" TEXT,
  "rainfallMm" DOUBLE PRECISION,
  "windLevel" TEXT NOT NULL,
  "windDirection" TEXT,
  "windSpeed" DOUBLE PRECISION,
  "phenomena" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,
  "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weather_observations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "weather_observations_farmerId_observedAt_idx" ON "weather_observations"("farmerId", "observedAt");
CREATE INDEX "weather_observations_farmId_observedAt_idx" ON "weather_observations"("farmId", "observedAt");
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
