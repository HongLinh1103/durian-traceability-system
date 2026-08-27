import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/zod-schema";

export const runtime = "nodejs";

function generatePendingFarmCode(index: number): string {
    return `PENDING-${Date.now().toString(36).toUpperCase()}-${index + 1}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function POST(request: Request) {
    try {
        const parsed = registerSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: parsed.error.issues[0]?.message ?? "Dữ liệu đăng ký không hợp lệ.",
                    errors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const data = parsed.data;
        const phone = data.phone.trim();
        const email = data.email?.trim().toLowerCase() || null;

        const duplicate = await prisma.user.findFirst({
            where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
            select: { phone: true, email: true },
        });
        if (duplicate) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        duplicate.phone === phone
                            ? "Số điện thoại đã được đăng ký."
                            : "Email đã được đăng ký.",
                },
                { status: 409 },
            );
        }

        const resolvedRegions = await Promise.all(data.farms.map(async (farm) => {
            if (farm.growingRegionCode) {
                return prisma.growingRegion.findFirst({
                    where: {
                        code: { equals: farm.growingRegionCode.trim(), mode: "insensitive" },
                        isActive: true,
                        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                    },
                });
            }
            if (farm.growingRegionId) {
                const selected = await prisma.growingRegion.findFirst({
                    where: { id: farm.growingRegionId, isActive: true },
                });
                if (selected) return selected;
            }
            return prisma.growingRegion.findFirst({
                where: {
                    isActive: true,
                    province: { equals: farm.province.trim(), mode: "insensitive" },
                    OR: [
                        { district: null },
                        { district: { equals: farm.district.trim(), mode: "insensitive" } },
                    ],
                },
                orderBy: [{ district: "desc" }, { ward: "desc" }],
            });
        }));
        if (resolvedRegions.some((region) => !region)) {
            return NextResponse.json(
                { success: false, message: "Mã vùng trồng không tồn tại, không hoạt động hoặc đã hết hiệu lực. Vui lòng kiểm tra lại mã đã nhập." },
                { status: 400 },
            );
        }

        const password = await bcryptjs.hash(data.password, 10);
        const firstFarm = data.farms[0];
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    phone,
                    email,
                    password,
                    fullName: data.fullName.trim(),
                    role: "FARMER",
                    province: data.province.trim(),
                    district: data.district.trim(),
                    ward: data.ward.trim(),
                    address: data.detailedAddress.trim(),
                    registrationName: firstFarm.farmName.trim(),
                    registeredAreaSize: firstFarm.areaSize,
                    registeredTotalTrees: firstFarm.totalTrees,
                    registeredDurianVariety: firstFarm.durianVarieties.join(", "),
                    isApproved: false,
                    accountStatus: "PENDING",
                    farms: {
                        create: data.farms.map((farm, index) => ({
                            farmCode: generatePendingFarmCode(index),
                            farmName: farm.farmName.trim(),
                            province: farm.province.trim(),
                            district: farm.district.trim(),
                            ward: farm.ward.trim(),
                            address: farm.detailedAddress.trim(),
                            areaSize:
                                farm.areaUnit === "SQUARE_METER"
                                    ? farm.areaSize / 10_000
                                    : farm.areaSize,
                            areaUnit: farm.areaUnit,
                            declaredArea:
                                farm.declaredArea ??
                                (farm.areaUnit === "SQUARE_METER"
                                    ? farm.areaSize / 10_000
                                    : farm.areaSize),
                            mappedArea: farm.mappedArea ?? null,
                            totalTrees: farm.totalTrees,
                            durianVariety: farm.durianVarieties.join(", "),
                            latitude: farm.latitude ?? farm.centerLatitude ?? null,
                            longitude: farm.longitude ?? farm.centerLongitude ?? null,
                            centerLatitude: farm.centerLatitude ?? farm.latitude ?? null,
                            centerLongitude: farm.centerLongitude ?? farm.longitude ?? null,
                            boundary: farm.boundary ? (farm.boundary as Prisma.InputJsonValue) : Prisma.JsonNull,
                            notes: farm.notes || null,
                            growingRegionId: resolvedRegions[index]!.id,
                            growingRegion: `${resolvedRegions[index]!.code} - ${resolvedRegions[index]!.name}`,
                            // Hồ sơ chưa duyệt không được tính là vườn đang hoạt động.
                            isActive: false,
                            isInSeason: false,
                        })),
                    },
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    accountStatus: true,
                    farms: { select: { id: true, farmCode: true, farmName: true } },
                },
            });

            await tx.approvalHistory.create({
                data: {
                    subjectId: user.id,
                    actorId: user.id,
                    action: "SUBMITTED",
                    toStatus: "PENDING",
                },
            });

            const selectedRegionIds = resolvedRegions.map((region) => region!.id);
            const managerIds = (await tx.areaManagerRegionAssignment.findMany({
                where: {
                    growingRegionId: { in: selectedRegionIds }, isActive: true, endedAt: null,
                    areaManager: { accountStatus: "APPROVED", isLocked: false, deletedAt: null },
                },
                select: { areaManagerId: true },
                distinct: ["areaManagerId"],
            })).map((assignment) => assignment.areaManagerId);

            if (managerIds.length) {
                await tx.notification.createMany({
                    data: managerIds.map((managerId) => ({
                        userId: managerId,
                        title: "Hồ sơ nông dân mới cần phê duyệt",
                        message: `${user.fullName} đã gửi hồ sơ đăng ký với ${user.farms.length} vườn trồng.`,
                        type: "ACCOUNT_APPROVAL",
                    })),
                });
            }
            return user;
        });

        return NextResponse.json(
            {
                success: true,
                message: "Gửi hồ sơ đăng ký thành công.",
                data: result,
            },
            { status: 201 },
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { success: false, message: "Số điện thoại hoặc email đã được sử dụng." },
                { status: 409 },
            );
        }
        console.error("Register route failed:", error);
        return NextResponse.json(
            { success: false, message: "Không thể gửi hồ sơ lúc này. Vui lòng thử lại." },
            { status: 500 },
        );
    }
}
