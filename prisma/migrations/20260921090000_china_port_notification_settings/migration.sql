CREATE TABLE "china_port_notification_settings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL DEFAULT '704',
    "events" TEXT[] NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emails" TEXT[] NOT NULL,
    "phones" TEXT[] NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
