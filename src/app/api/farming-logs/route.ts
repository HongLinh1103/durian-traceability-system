import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { matchProhibitedChemical } from "@/lib/workflow";
import { prismaActivityTypeMap, prismaGrowthStageMap, toPrismaActivityType, toPrismaGrowthStage, type PrismaActivityTypeLabel, type PrismaGrowthStageLabel } from "@/lib/mappings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toBoolean(value: FormDataEntryValue | null) {
    return String(value) === "true";
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    const [farms, logs] = await Promise.all([
        prisma.farm.findMany({
            where: {
                farmerId: session.user.id,
                isActive: true,
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true, farmCode: true, farmName: true, durianVariety: true,
                cropSeasons: { where: { status: "ACTIVE" }, take: 1, select: { id: true, name: true, year: true } },
            },
        }),
        prisma.farmingLog.findMany({
            where: { farm: { farmerId: session.user.id } },
            orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
            take: 30,
            select: {
                id: true,
                actionDate: true,
                stage: true,
                activityType: true,
                otherActivity: true,
                chemicalName: true,
                dosage: true,
                phiDays: true,
                notes: true,
                images: true,
                isGACCCompliant: true,
                createdAt: true,
                cropSeason: { select: { id: true, name: true, year: true, status: true } },
                farm: { select: { farmCode: true, farmName: true } },
            },
        }),
    ]);
    return NextResponse.json({ ok: true, data: { farms, logs } });
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
        }
        const formData = await request.formData();
        const farmId = String(formData.get("farmId") ?? "");
        const stage = String(formData.get("stage") ?? "") as PrismaGrowthStageLabel;
        const activityType = String(formData.get("activityType") ?? "") as PrismaActivityTypeLabel;
        const otherActivity = String(formData.get("otherActivity") ?? "").trim();
        const actionDate = String(formData.get("actionDate") ?? "");
        const chemicalName = String(formData.get("chemicalName") ?? "");
        const dosage = String(formData.get("dosage") ?? "");
        const phiDays = Number(formData.get("phiDays") ?? 0);
        const plannedHarvestDate = String(formData.get("plannedHarvestDate") ?? "");
        const notes = String(formData.get("notes") ?? "");
        const isGACCCompliant = toBoolean(formData.get("isGACCCompliant"));
        const planId = String(formData.get("planId") ?? "").trim();
        const uploadedImages = formData.getAll("images").filter((item): item is File => item instanceof File);
        if (!(stage in prismaGrowthStageMap) || !(activityType in prismaActivityTypeMap)) {
            return NextResponse.json({ ok: false, error: "Giai đoạn hoặc hoạt động không hợp lệ." }, { status: 400 });
        }
        const parsedActionDate = new Date(actionDate);
        if (Number.isNaN(parsedActionDate.getTime())) {
            return NextResponse.json({ ok: false, error: "Ngày thực hiện không hợp lệ." }, { status: 400 });
        }
        const normalizedActivityType = toPrismaActivityType(activityType);
        const requiresChemicalName = ["SPRAY_PESTICIDE", "FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(normalizedActivityType);
        const requiresDosage = requiresChemicalName;

        if (
            !farmId ||
            !stage ||
            !activityType ||
            (activityType === "Khác" && !otherActivity) ||
            !actionDate ||
            (requiresChemicalName && !chemicalName) ||
            (requiresDosage && !dosage)
        ) {
            return NextResponse.json({ ok: false, error: "Thiếu dữ liệu nhật ký" }, { status: 400 });
        }

        const ownedFarm = await prisma.farm.findFirst({
            where: {
                id: farmId,
                farmerId: session.user.id,
                isActive: true,
            },
            select: { id: true, cropSeasons: { where: { status: "ACTIVE" }, take: 1, select: { id: true } } },
        });
        if (!ownedFarm) {
            return NextResponse.json(
                { ok: false, error: "Vườn không tồn tại, chưa được duyệt hoặc không thuộc tài khoản này." },
                { status: 404 },
            );
        }
        const activeSeason = ownedFarm.cropSeasons[0];
        if (!activeSeason) {
            return NextResponse.json(
                { ok: false, error: "Vườn chưa có vụ mùa đang hoạt động. Hãy bắt đầu vụ mùa mới trước khi ghi nhật ký." },
                { status: 409 },
            );
        }

        const prohibitedEntries = normalizedActivityType === "SPRAY_PESTICIDE"
            ? await prisma.pesticide.findMany({
                where: { isActive: true, deletedAt: null, gaccStatus: "PROHIBITED" },
                select: { pesticideName: true, tradeName: true, activeIngredient: true },
            })
            : [];
        const prohibitedMatch = matchProhibitedChemical(chemicalName, prohibitedEntries);
        const images = await Promise.all(
            uploadedImages.map(async (file) => {
                const buffer = Buffer.from(await file.arrayBuffer());
                return `data:${file.type};base64,${buffer.toString("base64")}`;
            }),
        );

        const plan = planId ? await prisma.farmingPlan.findFirst({ where: { id: planId, farmerId: session.user.id, farmId, status: { not: "COMPLETED" } }, select: { id: true } }) : null;
        if (planId && !plan) return NextResponse.json({ ok: false, error: "Kế hoạch không hợp lệ hoặc đã hoàn thành." }, { status: 400 });

        const supplyId = String(formData.get("supplyId") ?? "").trim();
        const supplyQuantity = Number(formData.get("supplyQuantity") ?? 0);

        const created = await prisma.$transaction(async (tx) => {
            const logStage = toPrismaGrowthStage(stage);
            const log = await tx.farmingLog.create({ data: {
                farmId,
                cropSeasonId: activeSeason.id,
                stage: logStage,
                actionDate: parsedActionDate,
                activityType: normalizedActivityType,
                otherActivity: normalizedActivityType === "OTHER" ? otherActivity : null,
                chemicalName: requiresChemicalName ? chemicalName : null,
                dosage: requiresDosage ? dosage : null,
                phiDays: requiresDosage ? phiDays : null,
                isGACCCompliant:
                    normalizedActivityType !== "SPRAY_PESTICIDE" ||
                    (isGACCCompliant && prohibitedMatch.status === "none"),
                notes: [notes, plannedHarvestDate ? `Ngày thu hoạch dự kiến: ${plannedHarvestDate}` : ""].filter(Boolean).join("\n"),
                images,
                planId: plan?.id ?? null,
            } });

            if (plan) await tx.farmingPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED", completedAt: new Date() } });

            // Tự động trừ kho vật tư nếu có chọn vật tư
            if (supplyId && supplyQuantity > 0) {
                const supply = await tx.farmerSupply.findFirst({
                    where: { id: supplyId, farmerId: session.user.id },
                });
                if (supply) {
                    const newQty = Math.max(0, supply.quantity - supplyQuantity);
                    await tx.farmerSupply.update({
                        where: { id: supply.id },
                        data: { quantity: newQty },
                    });

                    const totalAmount = Number(supply.unitPrice) * supplyQuantity;
                    const txRecord = await tx.farmerSupplyTransaction.create({
                        data: {
                            supplyId: supply.id,
                            farmerId: session.user.id,
                            farmId,
                            cropSeasonId: activeSeason.id,
                            farmingLogId: log.id,
                            type: "OUT",
                            quantity: supplyQuantity,
                            unitPrice: supply.unitPrice,
                            totalAmount,
                            stage: logStage,
                            activityType: normalizedActivityType,
                            purpose: `Sử dụng cho nhật ký: ${activityType}`,
                            actionDate: parsedActionDate,
                            notes: notes || null,
                        },
                    });

                    await tx.farmingLogMaterial.create({
                        data: {
                            farmingLogId: log.id,
                            supplyId: supply.id,
                            supplyName: supply.name,
                            supplyType: supply.type,
                            quantity: supplyQuantity,
                            unit: supply.unit,
                            unitPrice: supply.unitPrice,
                            totalCost: totalAmount,
                            transactionId: txRecord.id,
                        },
                    });
                }
            }

            return log;
        });

        return NextResponse.json({ ok: true, id: created.id });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Không thể lưu nhật ký",
            },
            { status: 500 },
        );
    }
}
