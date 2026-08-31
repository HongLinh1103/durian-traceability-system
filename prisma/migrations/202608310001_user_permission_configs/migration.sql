CREATE TABLE "user_permission_configs" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "permissions" TEXT[],
    "updatedById" TEXT, "updatedByName" TEXT DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_permission_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_permission_configs_userId_key" ON "user_permission_configs"("userId");
CREATE INDEX "user_permission_configs_userId_idx" ON "user_permission_configs"("userId");
ALTER TABLE "user_permission_configs" ADD CONSTRAINT "user_permission_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
