import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    normalizeUnitCode,
    isValidPUCCode,
    generateNewPUCCode,
    parseUnitCode,
    getCountryIsoCode,
} from "@/lib/puc-phc";

const regionSchema = z.object({
    code: z.string().trim().optional(),
    name: z.string().trim().min(2, "Tên vùng tối thiểu 2 ký tự"),
    address: z.string().trim().optional(),
    province: z.string().trim().min(2, "Vui lòng chọn hoặc nhập tỉnh/thành"),
    district: z.string().trim().optional(),
    ward: z.string().trim().optional(),
    areaSize: z.coerce.number().positive().optional(),
    cropType: z.string().trim().default("Sầu riêng"),
    cropVarieties: z.array(z.string().trim()).default([]),
    approvalCode: z.string().trim().optional(),
    exportMarkets: z.array(z.string().trim()).default([]),
    managingOrganization: z.string().trim().optional(),
    managerId: z.string().trim().optional(),
});

const updateSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]),
    reason: z.string().trim().min(3).max(500),
});

async function check() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN" ? session : null;
}

export async function GET() {
    if (!(await check())) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });

    const regions = await prisma.growingRegion.findMany({
        orderBy: [{ status: "asc" }, { code: "asc" }],
        include: {
            farms: {
                where: { isActive: true, farmer: { accountStatus: "APPROVED", isApproved: true, deletedAt: null } },
                select: { farmerId: true, areaSize: true, areaUnit: true },
            },
            managerAssignments: {
                orderBy: { assignedAt: "desc" },
                select: {
                    id: true,
                    assignedAt: true,
                    endedAt: true,
                    isActive: true,
                    note: true,
                    areaManager: { select: { id: true, fullName: true, phone: true } },
                },
            },
        },
    });

    const data = regions.map((region) => ({
        ...region,
        parsedCode: parseUnitCode(region.code),
        farmCount: region.farms.length,
        farmerCount: new Set(region.farms.map((farm) => farm.farmerId)).size,
    }));

    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    const session = await check();
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });

    const parsed = regionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu vùng không hợp lệ." },
            { status: 400 },
        );
    }

    const { province, cropType, exportMarkets } = parsed.data;
    // Giữ nguyên cách trình bày mã do người dùng/nguồn dữ liệu cung cấp.
    // normalizeUnitCode chỉ được dùng bên trong hàm kiểm tra tính hợp lệ.
    let finalCode = parsed.data.code?.trim() || "";

    // Xác định mã thị trường xuất khẩu nếu có
    const primaryExportIso = exportMarkets.length > 0 ? getCountryIsoCode(exportMarkets[0]) : null;

    // Nếu mã không được cung cấp hoặc không hợp lệ theo chuẩn PUC [Mã tỉnh - PUC - Cây trồng - YYYYY], tự động sinh mã chuẩn
    if (!finalCode || finalCode === "AUTO" || !isValidPUCCode(finalCode)) {
        finalCode = await generateNewPUCCode(province, cropType, primaryExportIso);
    }

    // Kiểm tra trùng mã
    const existing = await prisma.growingRegion.findUnique({
        where: { code: finalCode },
    });
    if (existing) {
        return NextResponse.json(
            { success: false, message: `Mã vùng trồng [${finalCode}] đã tồn tại trên hệ thống.` },
            { status: 409 },
        );
    }

    const { managerId, ...regionData } = parsed.data;
    const data = await prisma.growingRegion.create({
        data: {
            ...regionData,
            code: finalCode,
            address: regionData.address || null,
            district: regionData.district || null,
            ward: regionData.ward || null,
            approvalCode: regionData.approvalCode || (primaryExportIso ? finalCode : null),
            managingOrganization: regionData.managingOrganization || null,
            status: "DRAFT",
            isActive: false,
        },
    });

    if (managerId && session.user?.id) {
        await prisma.areaManagerRegionAssignment.create({
            data: {
                areaManagerId: managerId,
                growingRegionId: data.id,
                assignedById: session.user.id,
                isActive: true,
                note: "Phân công khi cấp mã vùng trồng mới",
            },
        });
    }

    return NextResponse.json(
        {
            success: true,
            data,
            message: `Đã tạo vùng trồng [${finalCode}] ở trạng thái nháp.`,
        },
        { status: 201 },
    );
}

export async function PATCH(request: Request) {
    if (!(await check())) return NextResponse.json({ success: false, message: "Không có quyền." }, { status: 403 });

    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
    }

    const data = await prisma.growingRegion.update({
        where: { id: parsed.data.id },
        data: {
            status: parsed.data.status,
            isActive: parsed.data.status === "ACTIVE",
            validUntil: parsed.data.status === "EXPIRED" ? new Date() : undefined,
        },
    });

    return NextResponse.json({
        success: true,
        data,
        message: `Đã chuyển trạng thái vùng thành ${parsed.data.status}.`,
    });
}
