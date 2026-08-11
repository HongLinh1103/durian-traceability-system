import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ManagedRegionAssignment = { code?: string; name?: string };

function getManagedRegionAssignments(value: unknown): ManagedRegionAssignment[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is ManagedRegionAssignment => Boolean(item && typeof item === "object"));
    }
    return value && typeof value === "object" ? [value as ManagedRegionAssignment] : [];
}

function generateOfficialFarmCode(index: number) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 9000 + 1000);
    return `MSVT-${timestamp}-${index + 1}-${random}`;
}

export const runtime = "nodejs";

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Chưa đăng nhập.", status: 401 } as const;
    if (session.user.role !== "ADMIN") return { error: "Không có quyền truy cập.", status: 403 } as const;
    return null;
}

/**
 * GET /api/admin/accounts
 * List pending accounts for admin approval with search, filter, pagination
 */
export async function GET(request: Request) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));
        const search = url.searchParams.get("search")?.trim() || "";
        const status = url.searchParams.get("status") || "PENDING";
        const role = url.searchParams.get("role") || "";

        const where: Record<string, unknown> = { deletedAt: null };

        // Hiển thị cả tài khoản chủ cửa hàng trong cùng danh sách tài khoản.
        where.role = role ? { equals: role } : { not: "ADMIN" };

        if (status === "all") {
            // show all
        } else if (status === "PENDING") {
            where.accountStatus = "PENDING";
        } else if (status === "APPROVED") {
            where.accountStatus = "APPROVED";
        } else if (status === "REJECTED") {
            where.accountStatus = "REJECTED";
        } else if (status === "NEEDS_SUPPLEMENT") {
            where.accountStatus = "NEEDS_SUPPLEMENT";
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const [data, totalItems] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    phone: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isApproved: true,
                    isLocked: true,
                    accountStatus: true,
                    address: true,
                    province: true,
                    district: true,
                    ward: true,
                    registrationName: true,
                    registeredAreaSize: true,
                    registeredTotalTrees: true,
                    registeredDurianVariety: true,
                    createdAt: true,
                    approvedAt: true,
                    farms: {
                        select: {
                            id: true,
                            farmCode: true,
                            farmName: true,
                            areaSize: true,
                            totalTrees: true,
                            durianVariety: true,
                            address: true,
                            province: true,
                            district: true,
                            ward: true,
                            areaUnit: true,
                            latitude: true,
                            longitude: true,
                            notes: true,
                            growingRegion: true,
                            region: { select: { code: true, name: true } },
                            isActive: true,
                        },
                    },
                    areaManagerApplication: {
                        select: {
                            identityNumber: true,
                            identityIssuedDate: true,
                            identityIssuedPlace: true,
                            organizationName: true,
                            taxCode: true,
                            position: true,
                            officeProvince: true,
                            officeDistrict: true,
                            officeWard: true,
                            officeDetailedAddress: true,
                            managedRegions: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        const areaManagers = await prisma.user.findMany({
            where: {
                role: "AREA_MANAGER",
                accountStatus: "APPROVED",
                isApproved: true,
                deletedAt: null,
                areaManagerApplication: { isNot: null },
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                areaManagerApplication: {
                    select: {
                        organizationName: true,
                        position: true,
                        managedRegions: true,
                    },
                },
            },
        });

        const managerRegionCodes = new Set(
            data
                .filter((account) => account.role === "AREA_MANAGER")
                .flatMap((account) => getManagedRegionAssignments(account.areaManagerApplication?.managedRegions))
                .map((region) => region.code?.trim())
                .filter((code): code is string => Boolean(code)),
        );
        const managedFarms = managerRegionCodes.size > 0
            ? await prisma.farm.findMany({
                where: {
                    isActive: true,
                    region: { code: { in: [...managerRegionCodes] } },
                    farmer: {
                        accountStatus: "APPROVED",
                        isApproved: true,
                        deletedAt: null,
                    },
                },
                orderBy: [{ region: { code: "asc" } }, { farmName: "asc" }],
                select: {
                    id: true,
                    farmCode: true,
                    farmName: true,
                    areaSize: true,
                    totalTrees: true,
                    durianVariety: true,
                    address: true,
                    province: true,
                    district: true,
                    ward: true,
                    areaUnit: true,
                    latitude: true,
                    longitude: true,
                    notes: true,
                    growingRegion: true,
                    isActive: true,
                    region: { select: { code: true, name: true } },
                    farmer: { select: { id: true, fullName: true, phone: true, accountStatus: true } },
                },
            })
            : [];

        const enrichedData = data.map((account) => {
            const farmRegionCodes = new Set(account.farms.map((farm) => farm.region?.code).filter((code): code is string => Boolean(code)));
            const assignedCodes = new Set(
                getManagedRegionAssignments(account.areaManagerApplication?.managedRegions)
                    .map((region) => region.code?.trim())
                    .filter((code): code is string => Boolean(code)),
            );

            return {
                ...account,
                regionManagers: account.role === "FARMER"
                    ? areaManagers
                        .map((manager) => ({
                            id: manager.id,
                            fullName: manager.fullName,
                            phone: manager.phone,
                            email: manager.email,
                            organizationName: manager.areaManagerApplication?.organizationName ?? null,
                            position: manager.areaManagerApplication?.position ?? null,
                            regions: getManagedRegionAssignments(manager.areaManagerApplication?.managedRegions)
                                .filter((region) => Boolean(region.code && farmRegionCodes.has(region.code))),
                        }))
                        .filter((manager) => manager.regions.length > 0)
                    : [],
                managedFarms: account.role === "AREA_MANAGER"
                    ? managedFarms.filter((farm) => Boolean(farm.region?.code && assignedCodes.has(farm.region.code)))
                    : [],
            };
        });

        return NextResponse.json({
            success: true,
            data: enrichedData,
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
            },
        });
    } catch (error) {
        console.error("GET admin accounts error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách tài khoản." }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/accounts
 * Approve or reject a pending account
 */
export async function PATCH(request: Request) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const body = await request.json();
        const { userId, action } = body;

        if (!userId || !action) {
            return NextResponse.json(
                { success: false, message: "Thiếu thông tin userId hoặc action." },
                { status: 400 },
            );
        }

        if (!["approve", "supplement", "reject", "update", "lock", "unlock"].includes(action)) {
            return NextResponse.json(
                { success: false, message: "Thao tác không hợp lệ." },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                accountStatus: true,
                role: true,
                fullName: true,
                isLocked: true,
                farms: {
                    select: {
                        id: true,
                        province: true,
                        district: true,
                        ward: true,
                        durianVariety: true,
                        growingRegionId: true,
                    },
                },
                stores: {
                    where: { deletedAt: null },
                    select: { id: true, name: true, status: true },
                },
                partnerFacility: { select: { id: true, status: true } },
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
        }

        if (["update", "lock", "unlock"].includes(action)) {
            if (action === "update") {
                const fullName = String(body.fullName || "").trim();
                const phone = String(body.phone || "").trim();
                const email = String(body.email || "").trim() || null;
                const address = String(body.address || "").trim() || null;
                if (!fullName || !phone) {
                    return NextResponse.json({ success: false, message: "Họ tên và số điện thoại là bắt buộc." }, { status: 400 });
                }
                await prisma.user.update({ where: { id: userId }, data: { fullName, phone, email, address } });
                return NextResponse.json({ success: true, message: "Đã cập nhật thông tin tài khoản." });
            }

            const isLocked = action === "lock";
            await prisma.$transaction(async tx => {
                await tx.user.update({ where: { id: userId }, data: { isLocked } });
                if (user.partnerFacility) await tx.partnerFacility.update({ where: { id: user.partnerFacility.id }, data: { status: isLocked ? "SUSPENDED" : "APPROVED" } });
            });
            return NextResponse.json({ success: true, message: isLocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản." });
        }

        if (!["PENDING", "NEEDS_SUPPLEMENT"].includes(user.accountStatus)) {
            return NextResponse.json(
                { success: false, message: `Tài khoản này đã được ${user.accountStatus === "APPROVED" ? "phê duyệt" : "từ chối"} trước đó.` },
                { status: 400 },
            );
        }

        const actor = await getServerSession(authOptions);
        if (!actor?.user?.id) return NextResponse.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

        if (action === "approve") {
            const farmRegionAssignments = await Promise.all(
                user.farms.map(async (farm) => {
                    const assignedRegion = farm.growingRegionId
                        ? await prisma.growingRegion.findFirst({
                            where: {
                                id: farm.growingRegionId,
                                isActive: true,
                                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                            },
                        })
                        : null;
                    const matchedRegion = assignedRegion ?? await prisma.growingRegion.findFirst({
                        where: {
                            isActive: true,
                            province: { equals: farm.province ?? "", mode: "insensitive" },
                            OR: [
                                { district: null },
                                { district: { equals: farm.district ?? "", mode: "insensitive" } },
                            ],
                            AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }],
                        },
                        orderBy: [{ district: "desc" }, { ward: "desc" }],
                    });
                    return { farm, region: matchedRegion };
                }),
            );

            if (user.role === "FARMER" && farmRegionAssignments.some((item) => !item.region)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Không thể duyệt: chưa xác định được vùng trồng đang hoạt động cho tất cả vườn.",
                    },
                    { status: 400 },
                );
            }

            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        isApproved: true,
                        accountStatus: "APPROVED",
                        approvedAt: new Date(),
                    },
                });
                await tx.approvalHistory.create({
                    data: {
                        subjectId: userId,
                        actorId: actor.user.id,
                        action: "APPROVED",
                        fromStatus: user.accountStatus,
                        toStatus: "APPROVED",
                    },
                });
                if (user.role === "STORE_OWNER") {
                    await Promise.all(user.stores.map(async (store) => {
                        await tx.store.update({
                            where: { id: store.id },
                            data: { status: "APPROVED", reviewReason: null, approvedAt: new Date() },
                        });
                        await tx.storeAuditLog.create({
                            data: { storeId: store.id, actorId: actor.user.id, action: "STORE_APPROVED", fromStatus: store.status, toStatus: "APPROVED" },
                        });
                    }));
                }
                if (user.partnerFacility) await tx.partnerFacility.update({ where: { id: user.partnerFacility.id }, data: { status: "APPROVED", reviewReason: null, approvedAt: new Date() } });
                await Promise.all(
                    farmRegionAssignments.map(({ farm, region }, index) =>
                        tx.farm.update({
                            where: { id: farm.id },
                            data: {
                                farmCode: generateOfficialFarmCode(index),
                                growingRegionId: region?.id ?? null,
                                growingRegion: region ? `${region.code} - ${region.name}` : null,
                                isActive: true,
                            },
                        }),
                    ),
                );
            });

            // Tạo notification cho user được duyệt
            await prisma.notification.create({
                data: {
                    userId,
                    title: "Tài khoản đã được phê duyệt",
                    message: `Tài khoản ${user.fullName || user.id} đã được phê duyệt. Mã vườn và mã vùng trồng đã được cấp cho hồ sơ đủ điều kiện.`,
                    type: "ACCOUNT_APPROVED",
                },
            });

            return NextResponse.json({
                success: true,
                message: `Đã phê duyệt tài khoản ${user.fullName || ""}.`,
            });
        } else if (action === "reject") {
            const reason = body.reason || "Không đáp ứng yêu cầu đăng ký.";
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { isApproved: false, accountStatus: "REJECTED" },
                });
                await tx.approvalHistory.create({
                    data: { subjectId: userId, actorId: actor.user.id, action: "REJECTED", fromStatus: user.accountStatus, toStatus: "REJECTED", reason },
                });
                if (user.role === "STORE_OWNER") {
                    await Promise.all(user.stores.map(async (store) => {
                        await tx.store.update({ where: { id: store.id }, data: { status: "REJECTED", reviewReason: reason, approvedAt: null } });
                        await tx.storeAuditLog.create({ data: { storeId: store.id, actorId: actor.user.id, action: "STORE_REJECTED", fromStatus: store.status, toStatus: "REJECTED", reason } });
                    }));
                }
                if (user.partnerFacility) await tx.partnerFacility.update({ where: { id: user.partnerFacility.id }, data: { status: "REJECTED", reviewReason: reason, approvedAt: null } });
                await tx.notification.create({
                    data: { userId, title: "Tài khoản bị từ chối", message: `Tài khoản của bạn đã bị từ chối phê duyệt. Lý do: ${reason}`, type: "ACCOUNT_REJECTED" },
                });
            });

            return NextResponse.json({
                success: true,
                message: `Đã từ chối tài khoản ${user.fullName || ""}.`,
            });
        } else {
            const reason = String(body.reason || "").trim();
            if (!reason) return NextResponse.json({ success: false, message: "Vui lòng nhập nội dung cần bổ sung." }, { status: 400 });
            await prisma.$transaction(async (tx) => {
                await tx.user.update({ where: { id: userId }, data: { isApproved: false, accountStatus: "NEEDS_SUPPLEMENT" } });
                await tx.approvalHistory.create({
                    data: { subjectId: userId, actorId: actor.user.id, action: "SUPPLEMENT_REQUESTED", fromStatus: user.accountStatus, toStatus: "NEEDS_SUPPLEMENT", reason },
                });
                if (user.role === "STORE_OWNER") {
                    await Promise.all(user.stores.map(async (store) => {
                        await tx.store.update({ where: { id: store.id }, data: { status: "NEED_SUPPLEMENT", reviewReason: reason, approvedAt: null } });
                        await tx.storeAuditLog.create({ data: { storeId: store.id, actorId: actor.user.id, action: "STORE_NEED_SUPPLEMENT", fromStatus: store.status, toStatus: "NEED_SUPPLEMENT", reason } });
                    }));
                }
                if (user.partnerFacility) await tx.partnerFacility.update({ where: { id: user.partnerFacility.id }, data: { status: "NEED_SUPPLEMENT", reviewReason: reason, approvedAt: null } });
                await tx.notification.create({
                    data: { userId, title: "Hồ sơ cần bổ sung", message: `Hồ sơ đăng ký của bạn cần bổ sung thông tin: ${reason}`, type: "ACCOUNT_SUPPLEMENT_REQUIRED" },
                });
            });
            return NextResponse.json({ success: true, message: `Đã gửi yêu cầu bổ sung cho ${user.fullName || "tài khoản"}.` });
        }
    } catch (error) {
        console.error("PATCH admin accounts error:", error);
        return NextResponse.json({ success: false, message: "Không thể xử lý yêu cầu." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const authError = await checkAdmin();
    if (authError) return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });

    try {
        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ success: false, message: "Thiếu userId." }, { status: 400 });
        const user = await prisma.user.findFirst({ where: { id: userId, role: { not: "ADMIN" }, deletedAt: null } });
        if (!user) return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
        await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), isLocked: true } });
        return NextResponse.json({ success: true, message: "Đã xóa tài khoản." });
    } catch (error) {
        console.error("DELETE admin account error:", error);
        return NextResponse.json({ success: false, message: "Không thể xóa tài khoản." }, { status: 500 });
    }
}
