CREATE TYPE "PlanStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "farming_plans" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "GrowthStage" NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "otherActivity" TEXT,
    "notes" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "farming_plans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FarmingLog" ADD COLUMN "planId" TEXT;
CREATE UNIQUE INDEX "FarmingLog_planId_key" ON "FarmingLog"("planId");
CREATE INDEX "farming_plans_farmerId_plannedDate_status_idx" ON "farming_plans"("farmerId", "plannedDate", "status");
CREATE INDEX "farming_plans_farmId_plannedDate_idx" ON "farming_plans"("farmId", "plannedDate");
ALTER TABLE "farming_plans" ADD CONSTRAINT "farming_plans_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "farming_plans" ADD CONSTRAINT "farming_plans_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmingLog" ADD CONSTRAINT "FarmingLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "farming_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
