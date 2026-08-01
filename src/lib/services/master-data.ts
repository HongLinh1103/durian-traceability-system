/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────

export type PaginationParams = {
    page: number;
    pageSize: number;
    search?: string;
    status?: "active" | "inactive" | "all";
    sortBy?: string;
    sortOrder?: "asc" | "desc";
};

export type PaginatedResult<T> = {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
};

// ─── Helpers ───────────────────────────────────────────

function buildWhereClause(
    search?: string,
    status?: "active" | "inactive" | "all",
): Prisma.DurianVarietyWhereInput {
    const where: Prisma.DurianVarietyWhereInput = {
        deletedAt: null,
    };

    if (search) {
        where.OR = [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
        ];
    }

    if (status === "active") {
        where.isActive = true;
    } else if (status === "inactive") {
        where.isActive = false;
    }

    return where;
}

function buildPesticideWhereClause(
    search?: string,
    status?: "active" | "inactive" | "all",
    gaccStatus?: string,
    category?: string,
): Prisma.PesticideWhereInput {
    const where: Prisma.PesticideWhereInput = {
        deletedAt: null,
    };

    if (search) {
        where.OR = [
            { code: { contains: search, mode: "insensitive" } },
            { tradeName: { contains: search, mode: "insensitive" } },
            { activeIngredient: { contains: search, mode: "insensitive" } },
        ];
    }

    if (status === "active") {
        where.isActive = true;
    } else if (status === "inactive") {
        where.isActive = false;
    }

    if (gaccStatus) {
        where.gaccStatus = gaccStatus as any;
    }

    if (category) {
        where.category = category;
    }

    return where;
}

function buildFertilizerWhereClause(
    search?: string,
    status?: "active" | "inactive" | "all",
    fertilizerType?: string,
    brand?: string,
): Prisma.FertilizerWhereInput {
    const where: Prisma.FertilizerWhereInput = {
        deletedAt: null,
    };

    if (search) {
        where.OR = [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { brand: { contains: search, mode: "insensitive" } },
        ];
    }

    if (status === "active") {
        where.isActive = true;
    } else if (status === "inactive") {
        where.isActive = false;
    }

    if (fertilizerType) {
        where.fertilizerType = fertilizerType;
    }

    if (brand) {
        where.brand = { contains: brand, mode: "insensitive" };
    }

    return where;
}

function buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc") {
    const field = ["code", "name", "isActive", "createdAt", "updatedAt"].includes(sortBy ?? "")
        ? sortBy!
        : "updatedAt";
    return { [field]: sortOrder ?? "desc" };
}

// ─── Durian Variety Service ────────────────────────────

export async function listDurianVarieties(params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, pageSize, search, status } = params;
    const where = buildWhereClause(search, status);
    const orderBy = buildOrderBy(params.sortBy, params.sortOrder);

    const [data, totalItems] = await Promise.all([
        prisma.durianVariety.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.durianVariety.count({ where }),
    ]);

    return {
        data,
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };
}

export async function getDurianVarietyById(id: string) {
    return prisma.durianVariety.findFirst({
        where: { id, deletedAt: null },
    });
}

export async function createDurianVariety(data: any) {
    return prisma.durianVariety.create({ data });
}

export async function updateDurianVariety(id: string, data: any) {
    return prisma.durianVariety.update({
        where: { id },
        data,
    });
}

export async function softDeleteDurianVariety(id: string) {
    return prisma.durianVariety.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
    });
}

export async function restoreDurianVariety(id: string) {
    return prisma.durianVariety.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
    });
}

export async function getActiveDurianVarieties() {
    return prisma.durianVariety.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { name: "asc" },
        select: {
            id: true,
            code: true,
            name: true,
            scientificName: true,
            origin: true,
            averageHarvestDays: true,
        },
    });
}

// ─── Pesticide Service ─────────────────────────────────

export async function listPesticides(
    params: PaginationParams & { gaccStatus?: string; category?: string },
): Promise<PaginatedResult<any>> {
    const { page, pageSize, search, status, gaccStatus, category } = params;
    const where = buildPesticideWhereClause(search, status, gaccStatus, category);
    const orderBy = buildOrderBy(params.sortBy, params.sortOrder);

    const [data, totalItems] = await Promise.all([
        prisma.pesticide.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.pesticide.count({ where }),
    ]);

    return {
        data,
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };
}

export async function getPesticideById(id: string) {
    return prisma.pesticide.findFirst({
        where: { id, deletedAt: null },
    });
}

export async function createPesticide(data: any) {
    return prisma.pesticide.create({ data });
}

export async function updatePesticide(id: string, data: any) {
    return prisma.pesticide.update({
        where: { id },
        data,
    });
}

export async function softDeletePesticide(id: string) {
    return prisma.pesticide.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
    });
}

export async function restorePesticide(id: string) {
    return prisma.pesticide.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
    });
}

export async function getActivePesticides() {
    return prisma.pesticide.findMany({
        where: { isActive: true, deletedAt: null, gaccStatus: { not: "PROHIBITED" } },
        orderBy: { tradeName: "asc" },
        select: {
            id: true,
            code: true,
            tradeName: true,
            activeIngredient: true,
            category: true,
            gaccStatus: true,
            phiDays: true,
            recommendedDosage: true,
        },
    });
}

// ─── Fertilizer Service ────────────────────────────────

export async function listFertilizers(
    params: PaginationParams & { fertilizerType?: string; brand?: string },
): Promise<PaginatedResult<any>> {
    const { page, pageSize, search, status, fertilizerType, brand } = params;
    const where = buildFertilizerWhereClause(search, status, fertilizerType, brand);
    const orderBy = buildOrderBy(params.sortBy, params.sortOrder);

    const [data, totalItems] = await Promise.all([
        prisma.fertilizer.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.fertilizer.count({ where }),
    ]);

    return {
        data,
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
        },
    };
}

export async function getFertilizerById(id: string) {
    return prisma.fertilizer.findFirst({
        where: { id, deletedAt: null },
    });
}

export async function createFertilizer(data: any) {
    return prisma.fertilizer.create({ data });
}

export async function updateFertilizer(id: string, data: any) {
    return prisma.fertilizer.update({
        where: { id },
        data,
    });
}

export async function softDeleteFertilizer(id: string) {
    return prisma.fertilizer.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
    });
}

export async function restoreFertilizer(id: string) {
    return prisma.fertilizer.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
    });
}

export async function getActiveFertilizers() {
    return prisma.fertilizer.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { name: "asc" },
        select: {
            id: true,
            code: true,
            name: true,
            fertilizerType: true,
            brand: true,
            nutrientComposition: true,
            recommendedDosage: true,
        },
    });
}

