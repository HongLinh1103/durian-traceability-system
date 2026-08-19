import { createHmac, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InventoryDocumentType, Prisma } from "@prisma/client";

export const storeProfileSchema = z.object({
    representativeName: z.string().trim().min(2).max(120), representativePhone: z.string().trim().min(6).max(20),
    representativeEmail: z.string().trim().email().optional().or(z.literal("")), identityNumber: z.string().trim().min(9).max(20),
    name: z.string().trim().min(2).max(160), taxOrBusinessCode: z.string().trim().max(50).optional(), address: z.string().trim().min(5).max(500),
    latitude: z.coerce.number().min(-90).max(90).optional(), longitude: z.coerce.number().min(-180).max(180).optional(),
    phone: z.string().trim().min(6).max(20), openingHours: z.string().trim().max(200).optional(), description: z.string().trim().max(2000).optional(),
});

const productObjectSchema = z.object({
    type: z.enum(["FERTILIZER", "PESTICIDE", "EQUIPMENT"]), name: z.string().trim().min(2).max(200), brand: z.string().trim().max(120).optional(),
    manufacturer: z.string().trim().max(160).optional(), origin: z.string().trim().max(120).optional(), description: z.string().trim().max(3000).optional(),
    usagePurpose: z.string().trim().max(12000).optional(), usageInstructions: z.string().trim().max(12000).optional(), packaging: z.string().trim().max(120).optional(),
    price: z.coerce.number().positive().max(1_000_000_000), salePrice: z.coerce.number().positive().max(1_000_000_000).optional().nullable(),
    unit: z.string().trim().min(1).max(50), imageUrls: z.array(z.string().url()).max(8).default([]),
    composition: z.string().trim().max(2000).optional(), phiDays: z.coerce.number().int().min(0).max(365).optional().nullable(), safetyWarnings: z.string().trim().max(12000).optional(),
    status: z.enum(["APPROVED", "HIDDEN", "OUT_OF_STOCK"]).optional(),
});
export const productSchema = productObjectSchema.refine((v) => v.salePrice == null || v.salePrice <= v.price, { message: "Giá khuyến mãi không được lớn hơn giá bán.", path: ["salePrice"] });
export const productUpdateSchema = productObjectSchema.partial();

export async function requireRole(roles: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !roles.includes(session.user.role)) return null;
    return session;
}

export async function getOwnedStore(userId: string) {
    return prisma.store.findFirst({ where: { ownerId: userId, deletedAt: null } });
}

const signingSecret = () => process.env.STORE_DOCUMENT_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "development-only-secret";
export function signStoreDocument(documentId: string, expiresAt: number) {
    return createHmac("sha256", signingSecret()).update(`${documentId}:${expiresAt}`).digest("hex");
}
export function verifyStoreDocumentSignature(documentId: string, expiresAt: number, signature: string) {
    if (expiresAt < Date.now()) return false;
    const expected = Buffer.from(signStoreDocument(documentId, expiresAt));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
}

function datePart(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(date).replaceAll("-", "");
}

function nextSequence(lastCode?: string | null) {
    const value = Number(lastCode?.split("-").at(-1) || 0) + 1;
    if (value > 999) throw new Error("DAILY_CODE_LIMIT");
    return String(value).padStart(3, "0");
}

export async function orderCode(tx: Prisma.TransactionClient, date = new Date()) {
    const prefix = `DH-${datePart(date)}-`;
    const last = await tx.order.findFirst({ where: { orderCode: { startsWith: prefix } }, select: { orderCode: true }, orderBy: { orderCode: "desc" } });
    return `${prefix}${nextSequence(last?.orderCode)}`;
}

export async function inventoryDocumentCode(tx: Prisma.TransactionClient, type: InventoryDocumentType, date = new Date()) {
    const prefix = `${type}-${datePart(date)}-`;
    const last = await tx.inventoryDocument.findFirst({ where: { code: { startsWith: prefix } }, select: { code: true }, orderBy: { code: "desc" } });
    return `${prefix}${nextSequence(last?.code)}`;
}
