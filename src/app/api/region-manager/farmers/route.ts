import { AccountStatus, Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedRegionScope } from "@/lib/region-manager-scope";

export const runtime = "nodejs";

function officialFarmCode(index: number) {
    return `MSVT-${Date.now().toString(36).toUpperCase()}-${index + 1}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function managerContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Chưa đăng nhập.", status: 401 } as const;
    if (session.user.role !== "AREA_MANAGER") return { error: "Không có quyền truy cập.", status: 403 } as const;
    const scope = await getManagedRegionScope(session.user.id, session.user.role);
    if (!scope?.codes.length) return { error: "Tài khoản chưa được phân công vùng trồng.", status: 403 } as const;
    return { session, scope } as const;
}

function scopedFarmerWhere(codes: string[], regionCode?: string): Prisma.UserWhereInput {
    const selectedCodes = regionCode && codes.includes(regionCode) ? [regionCode] : codes;
    return {
        role: "FARMER",
        farms: { some: { region: { code: { in: selectedCodes } } } },
    };
}

async function getScopedFarmer(userId: string, codes: string[]) {
    const farmer = await prisma.user.findFirst({
        where: { id: userId, role: "FARMER", farms: { some: { region: { code: { in: codes } } } } },
        include: {
            farms: { include: { region: { select: { id: true, code: true, name: true } } } },
        },
    });
    if (!farmer) return null;
    if (farmer.farms.some((farm) => !farm.region || !codes.includes(farm.region.code))) return null;
    return farmer;
}

export async function GET(request: Request) {
    const context = await managerContext();
    if ("error" in context) return NextResponse.json({ success: false, message: context.error }, { status: context.status });

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const status = url.searchParams.get("status") ?? "all";
    const regionCode = url.searchParams.get("regionCode") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));
    const baseWhere = scopedFarmerWhere(context.scope.codes, regionCode);
    const where: Prisma.UserWhereInput = {
        ...baseWhere,
        ...(status === "deleted"
            ? { deletedAt: { not: null } }
            : { deletedAt: null, ...(status !== "all" ? { accountStatus: status as AccountStatus } : {}) }),
        ...(search ? {
            OR: [
                { id: { contains: search, mode: "insensitive" } },
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
                { farms: { some: { farmName: { contains: search, mode: "insensitive" } } } },
            ],
        } : {}),
    };

    const [data, totalItems, total, pending, supplement, rejected, locked] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true, fullName: true, phone: true, email: true, address: true, province: true,
                district: true, ward: true, accountStatus: true, isApproved: true, isLocked: true,
                deletedAt: true, createdAt: true, approvedAt: true,
                farms: {
                    where: { region: { code: { in: context.scope.codes } } },
                    select: {
                        id: true, farmCode: true, farmName: true, areaSize: true, totalTrees: true,
                        durianVariety: true, address: true, province: true, district: true, ward: true,
                        latitude: true, longitude: true, isActive: true,
                        region: { select: { id: true, code: true, name: true } },
                    },
                },
                approvalHistories: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true, action: true, fromStatus: true, toStatus: true, reason: true,
                        details: true, createdAt: true,
                        actor: { select: { fullName: true, role: true } },
                    },
                },
            },
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: { ...baseWhere, deletedAt: null, accountStatus: "APPROVED" } }),
        prisma.user.count({ where: { ...baseWhere, deletedAt: null, accountStatus: "PENDING" } }),
        prisma.user.count({ where: { ...baseWhere, deletedAt: null, accountStatus: "NEEDS_SUPPLEMENT" } }),
        prisma.user.count({ where: { ...baseWhere, deletedAt: null, accountStatus: "REJECTED" } }),
        prisma.user.count({ where: { ...baseWhere, deletedAt: null, isLocked: true } }),
    ]);

    return NextResponse.json({
        success: true,
        data,
        regions: context.scope.regions,
        stats: { total, pending, supplement, rejected, locked },
        pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    });
}

export async function POST(request: Request) {
    const context = await managerContext();
    if ("error" in context) return NextResponse.json({ success: false, message: context.error }, { status: context.status });
    const body = await request.json();
    const farms = Array.isArray(body.farms) ? body.farms : [];
    if (!body.fullName?.trim() || !body.phone?.trim() || !body.password || farms.length === 0) {
        return NextResponse.json({ success: false, message: "Cần nhập họ tên, số điện thoại, mật khẩu và ít nhất một vườn." }, { status: 400 });
    }
    if (String(body.password).length < 6) {
        return NextResponse.json({ success: false, message: "Mật khẩu cần có ít nhất 6 ký tự." }, { status: 400 });
    }
    const invalidFarm = farms.some((farm: Record<string, unknown>) =>
        !String(farm.farmName || "").trim()
        || !String(farm.growingRegionId || "").trim()
        || !String(farm.durianVariety || "").trim()
        || !String(farm.address || "").trim()
        || !Number.isFinite(Number(farm.areaSize))
        || Number(farm.areaSize) <= 0
        || !Number.isInteger(Number(farm.totalTrees))
        || Number(farm.totalTrees) <= 0,
    );
    if (invalidFarm) {
        return NextResponse.json({ success: false, message: "Thông tin của mỗi vườn chưa đầy đủ hoặc không hợp lệ." }, { status: 400 });
    }
    const regionIds = Array.from(new Set<string>(
        farms.map((farm: Record<string, unknown>) => String(farm.growingRegionId || "").trim()).filter(Boolean),
    ));
    const allowedRegions = await prisma.growingRegion.findMany({
        where: { id: { in: regionIds }, code: { in: context.scope.codes }, isActive: true },
    });
    const allowedRegionIds = new Set(allowedRegions.map((region) => region.id));
    if (farms.some((farm: { growingRegionId?: string }) => !farm.growingRegionId || !allowedRegionIds.has(farm.growingRegionId))) {
        return NextResponse.json({ success: false, message: "Mỗi vườn phải thuộc một vùng bạn đang phụ trách." }, { status: 400 });
    }
    const email = body.email?.trim().toLowerCase() || null;
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ phone: body.phone.trim() }, ...(email ? [{ email }] : [])] } });
    if (duplicate) return NextResponse.json({ success: false, message: "Số điện thoại hoặc email đã tồn tại." }, { status: 409 });

    const password = await bcryptjs.hash(body.password, 10);
    const farmer = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: {
                fullName: body.fullName.trim(), phone: body.phone.trim(), email, password, role: "FARMER",
                address: body.address?.trim() || null, province: body.province?.trim() || null,
                district: body.district?.trim() || null, ward: body.ward?.trim() || null,
                accountStatus: "APPROVED", isApproved: true, approvedAt: new Date(),
                farms: {
                    create: farms.map((farm: Record<string, unknown>, index: number) => {
                        const region = allowedRegions.find((item) => item.id === farm.growingRegionId)!;
                        return {
                            farmCode: officialFarmCode(index), farmName: String(farm.farmName || "").trim(),
                            areaSize: Number(farm.areaSize), totalTrees: Number(farm.totalTrees),
                            durianVariety: String(farm.durianVariety || ""), address: String(farm.address || ""),
                            province: String(farm.province || region.province), district: String(farm.district || region.district || ""),
                            ward: String(farm.ward || region.ward || ""), growingRegionId: region.id,
                            growingRegion: `${region.code} - ${region.name}`, isActive: true, isInSeason: false,
                        };
                    }),
                },
            },
        });
        await tx.approvalHistory.create({
            data: { subjectId: created.id, actorId: context.session.user.id, action: "CREATED_MANUALLY", toStatus: "APPROVED" },
        });
        await tx.notification.create({
            data: { userId: created.id, title: "Tài khoản đã được tạo", message: "Trưởng ban quản lý vùng trồng đã tạo và kích hoạt tài khoản của bạn.", type: "ACCOUNT_CREATED" },
        });
        return created;
    });
    return NextResponse.json({ success: true, message: "Đã tạo tài khoản nông dân.", data: { id: farmer.id } }, { status: 201 });
}

export async function PATCH(request: Request) {
    const context = await managerContext();
    if ("error" in context) return NextResponse.json({ success: false, message: context.error }, { status: context.status });
    const body = await request.json();
    if (!body.userId || !body.action) return NextResponse.json({ success: false, message: "Thiếu tài khoản hoặc thao tác." }, { status: 400 });
    const farmer = await getScopedFarmer(body.userId, context.scope.codes);
    if (!farmer) return NextResponse.json({ success: false, message: "Không tìm thấy nông dân trong phạm vi phụ trách." }, { status: 404 });

    const reason = String(body.reason || "").trim();
    const previousStatus = farmer.accountStatus;
    const notifications: Record<string, { title: string; message: string; type: string }> = {
        approve: {
            title: "Hồ sơ đã được phê duyệt",
            message: "Hồ sơ đăng ký của bạn đã được Trưởng ban quản lý vùng trồng phê duyệt. Tài khoản hiện đã được kích hoạt.",
            type: "ACCOUNT_APPROVED",
        },
        supplement: {
            title: "Hồ sơ cần bổ sung",
            message: `Hồ sơ đăng ký của bạn cần bổ sung thông tin trước khi được phê duyệt.${reason ? ` Nội dung: ${reason}` : ""}`,
            type: "ACCOUNT_SUPPLEMENT_REQUIRED",
        },
        reject: {
            title: "Hồ sơ bị từ chối",
            message: `Hồ sơ đăng ký của bạn đã bị từ chối. Lý do: ${reason}`,
            type: "ACCOUNT_REJECTED",
        },
    };

    if (["supplement", "reject"].includes(body.action) && !reason) {
        return NextResponse.json({ success: false, message: "Vui lòng nhập nội dung hoặc lý do xử lý." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        let toStatus: AccountStatus | undefined;
        let action = String(body.action).toUpperCase();
        if (body.action === "approve") {
            if (!["PENDING", "NEEDS_SUPPLEMENT"].includes(previousStatus)) throw new Error("INVALID_STATUS");
            toStatus = "APPROVED";
            await tx.user.update({ where: { id: farmer.id }, data: { accountStatus: toStatus, isApproved: true, approvedAt: new Date(), isLocked: false } });
            await Promise.all(farmer.farms.map((farm, index) => tx.farm.update({
                where: { id: farm.id },
                data: { farmCode: farm.farmCode.startsWith("PENDING-") ? officialFarmCode(index) : farm.farmCode, isActive: true },
            })));
        } else if (body.action === "supplement") {
            toStatus = "NEEDS_SUPPLEMENT";
            await tx.user.update({ where: { id: farmer.id }, data: { accountStatus: toStatus, isApproved: false } });
        } else if (body.action === "reject") {
            toStatus = "REJECTED";
            await tx.user.update({ where: { id: farmer.id }, data: { accountStatus: toStatus, isApproved: false } });
        } else if (body.action === "lock" || body.action === "unlock") {
            const isLocked = body.action === "lock";
            await tx.user.update({ where: { id: farmer.id }, data: { isLocked } });
            action = isLocked ? "LOCKED" : "UNLOCKED";
        } else if (body.action === "restore") {
            await tx.user.update({ where: { id: farmer.id }, data: { deletedAt: null } });
            action = "RESTORED";
        } else if (body.action === "update") {
            await tx.user.update({
                where: { id: farmer.id },
                data: {
                    fullName: body.fullName?.trim() || farmer.fullName,
                    phone: body.phone?.trim() || farmer.phone,
                    email: body.email?.trim().toLowerCase() || null,
                    address: body.address?.trim() || null,
                    province: body.province?.trim() || null,
                    district: body.district?.trim() || null,
                    ward: body.ward?.trim() || null,
                },
            });
            action = "UPDATED";
        } else {
            throw new Error("INVALID_ACTION");
        }
        await tx.approvalHistory.create({
            data: {
                subjectId: farmer.id, actorId: context.session.user.id, action,
                fromStatus: previousStatus, toStatus, reason: reason || null,
                details: Array.isArray(body.items) ? { supplementItems: body.items } : undefined,
            },
        });
        if (notifications[body.action]) await tx.notification.create({ data: { userId: farmer.id, ...notifications[body.action] } });
    }).catch((error) => {
        if (error instanceof Error && ["INVALID_STATUS", "INVALID_ACTION"].includes(error.message)) throw error;
        throw error;
    });

    return NextResponse.json({ success: true, message: "Đã cập nhật hồ sơ nông dân." });
}

export async function DELETE(request: Request) {
    const context = await managerContext();
    if ("error" in context) return NextResponse.json({ success: false, message: context.error }, { status: context.status });
    const body = await request.json();
    const farmer = await getScopedFarmer(body.userId, context.scope.codes);
    if (!farmer) return NextResponse.json({ success: false, message: "Không tìm thấy nông dân trong phạm vi phụ trách." }, { status: 404 });
    await prisma.$transaction([
        prisma.user.update({ where: { id: farmer.id }, data: { deletedAt: new Date(), isLocked: true } }),
        prisma.approvalHistory.create({
            data: { subjectId: farmer.id, actorId: context.session.user.id, action: "SOFT_DELETED", fromStatus: farmer.accountStatus, reason: body.reason?.trim() || null },
        }),
    ]);
    return NextResponse.json({ success: true, message: "Đã xóa mềm tài khoản nông dân. Dữ liệu lịch sử được giữ nguyên." });
}
