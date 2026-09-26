import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function resolveDatabaseUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    try {
        const url = new URL(raw);
        if (url.protocol === "postgres:" || url.protocol === "postgresql:") {
            if (!url.searchParams.has("connection_limit")) {
                url.searchParams.set("connection_limit", "1");
            }
            if (!url.searchParams.has("connect_timeout")) {
                url.searchParams.set("connect_timeout", "15");
            }
            if (!url.searchParams.has("pool_timeout")) {
                url.searchParams.set("pool_timeout", "15");
            }
            return url.toString();
        }
    } catch {
        // Fall back to original url
    }
    return raw;
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasources: process.env.DATABASE_URL
            ? { db: { url: resolveDatabaseUrl(process.env.DATABASE_URL) } }
            : undefined,
        log: ["error", "warn"],
    });

globalForPrisma.prisma = prisma;
