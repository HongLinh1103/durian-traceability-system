/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { durianVarietySchema, masterDataQuerySchema } from "@/lib/validations/master-data";

export const runtime = "nodejs";

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: "Chưa đăng nhập.", status: 401 } as const;
    }
    if (session.user.role !== "ADMIN") {
        return { error: "Không có quyền truy cập. Chỉ Admin mới được thực hiện thao tác này.", status: 403 } as const;
    }
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

        const where: any = { deletedAt: null };

        if (query.search) {
            where.OR = [
                { code: { contains: query.search, mode: "insensitive" } },
                { name: { contains: query.search, mode: "insensitive" } },
            ];
        }

        if (query.status === "active") where.isActive = true;
        else if (query.status === "inactive") where.isActive = false;

        const orderBy: any = {};
        orderBy[query.sortBy] = query.sortOrder;

        const [data, totalItems] = await Promise.all([
            prisma.durianVariety.findMany({
                where,
                orderBy,
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.durianVariety.count({ where }),
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
                { success: false, message: "Tham số truy vấn không hợp lệ", errors: error.flatten?.()?.fieldErrors },
                { status: 400 },
            );
        }
        console.error("GET durian-varieties error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách giống sầu riêng." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const body = await request.json();
        const parsed = durianVarietySchema.safeParse(body);

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

        const created = await prisma.durianVariety.create({ data: parsed.data });

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") {
            const target = error.meta?.target as string[] | undefined;
            if (target?.includes("code")) {
                return NextResponse.json(
                    { success: false, message: "Mã giống đã tồn tại", errors: { code: "Mã giống đã được sử dụng" } },
                    { status: 409 },
                );
            }
            if (target?.includes("name")) {
                return NextResponse.json(
                    { success: false, message: "Tên giống đã tồn tại", errors: { name: "Tên giống đã được sử dụng" } },
                    { status: 409 },
                );
            }
        }
        console.error("POST durian-varieties error:", error);
        return NextResponse.json({ success: false, message: "Không thể tạo giống sầu riêng." }, { status: 500 });
    }
}

