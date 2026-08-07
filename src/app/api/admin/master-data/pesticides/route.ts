/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pesticideSchema, masterDataQuerySchema } from "@/lib/validations/master-data";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Chưa đăng nhập.", status: 401 } as const;
    if (session.user.role !== "ADMIN") return { error: "Không có quyền truy cập.", status: 403 } as const;
    return null;
}

export async function GET(request: Request) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const url = new URL(request.url);
        const query = masterDataQuerySchema.parse(Object.fromEntries(url.searchParams));
        const gaccStatus = url.searchParams.get("gaccStatus");
        const category = url.searchParams.get("category");

        const where: Prisma.PesticideWhereInput = { deletedAt: null, gaccStatus: "PROHIBITED" };

        if (query.search) {
            where.OR = [
                { code: { contains: query.search, mode: "insensitive" } },
                { pesticideName: { contains: query.search, mode: "insensitive" } },
                { tradeName: { contains: query.search, mode: "insensitive" } },
                { activeIngredient: { contains: query.search, mode: "insensitive" } },
                { manufacturer: { contains: query.search, mode: "insensitive" } },
                { usagePurpose: { contains: query.search, mode: "insensitive" } },
                { targetPests: { contains: query.search, mode: "insensitive" } },
            ];
        }

        if (query.status === "active") where.isActive = true;
        else if (query.status === "inactive") where.isActive = false;

        if (gaccStatus && gaccStatus !== "PROHIBITED") where.gaccStatus = "PROHIBITED";

        if (category) {
            where.category = category;
        }

        const orderBy: any = {};
        orderBy[query.sortBy] = query.sortOrder;

        const [data, totalItems] = await Promise.all([
            prisma.pesticide.findMany({
                where,
                orderBy,
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.pesticide.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / query.pageSize),
            },
        });
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return NextResponse.json(
                { success: false, message: "Tham số truy vấn không hợp lệ" },
                { status: 400 },
            );
        }
        console.error("GET pesticides error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách thuốc BVTV." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const body = await request.json();
        const parsed = pesticideSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Dữ liệu không hợp lệ",
                    errors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const data = { ...parsed.data, gaccStatus: "PROHIBITED" as const };
        if (data.effectiveFrom === "") data.effectiveFrom = undefined as any;
        if (data.effectiveTo === "") data.effectiveTo = undefined as any;

        const created = await prisma.pesticide.create({ data });

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json(
                { success: false, message: "Mã thuốc đã tồn tại", errors: { code: "Mã thuốc đã được sử dụng" } },
                { status: 409 },
            );
        }
        console.error("POST pesticides error:", error);
        return NextResponse.json({ success: false, message: "Không thể tạo thuốc BVTV." }, { status: 500 });
    }
}

