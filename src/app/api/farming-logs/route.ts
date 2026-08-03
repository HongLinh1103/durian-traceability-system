import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isProhibitedChemical } from "@/lib/workflow";
import { toPrismaActivityType, toPrismaGrowthStage, type PrismaActivityTypeLabel, type PrismaGrowthStageLabel } from "@/lib/mappings";

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
            select: { id: true, farmCode: true, farmName: true },
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
                chemicalName: true,
                dosage: true,
                phiDays: true,
                notes: true,
                images: true,
                isGACCCompliant: true,
                createdAt: true,
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
        const actionDate = String(formData.get("actionDate") ?? "");
        const chemicalName = String(formData.get("chemicalName") ?? "");
        const dosage = String(formData.get("dosage") ?? "");
        const phiDays = Number(formData.get("phiDays") ?? 0);
        const plannedHarvestDate = String(formData.get("plannedHarvestDate") ?? "");
        const notes = String(formData.get("notes") ?? "");
        const isGACCCompliant = toBoolean(formData.get("isGACCCompliant"));
        const uploadedImages = formData.getAll("images").filter((item): item is File => item instanceof File);
        const normalizedActivityType = toPrismaActivityType(activityType);
        const requiresChemicalName = normalizedActivityType === "SPRAY_PESTICIDE" || normalizedActivityType === "FERTILIZE";
        const requiresDosage = normalizedActivityType === "SPRAY_PESTICIDE" || normalizedActivityType === "FERTILIZE";

        if (
            !farmId ||
            !stage ||
            !activityType ||
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
            select: { id: true },
        });
        if (!ownedFarm) {
            return NextResponse.json(
                { ok: false, error: "Vườn không tồn tại, chưa được duyệt hoặc không thuộc tài khoản này." },
                { status: 404 },
            );
        }

        if (normalizedActivityType === "SPRAY_PESTICIDE") {
            const pesticide = await prisma.pesticide.findFirst({
                where: { tradeName: chemicalName, isActive: true, deletedAt: null, gaccStatus: { not: "PROHIBITED" } },
                select: { id: true },
            });
            if (!pesticide) {
                return NextResponse.json({ ok: false, error: "Thuốc BVTV không thuộc danh mục đang được phép sử dụng." }, { status: 400 });
            }
        }
        if (normalizedActivityType === "FERTILIZE") {
            const fertilizer = await prisma.fertilizer.findFirst({
                where: { name: chemicalName, isActive: true, deletedAt: null },
                select: { id: true },
            });
            if (!fertilizer) {
                return NextResponse.json({ ok: false, error: "Phân bón không thuộc danh mục đang hoạt động." }, { status: 400 });
            }
        }

        const images = await Promise.all(
            uploadedImages.map(async (file) => {
                const buffer = Buffer.from(await file.arrayBuffer());
                return `data:${file.type};base64,${buffer.toString("base64")}`;
            }),
        );

        const created = await prisma.farmingLog.create({
            data: {
                farmId,
                stage: toPrismaGrowthStage(stage),
                actionDate: new Date(actionDate),
                activityType: normalizedActivityType,
                chemicalName: requiresChemicalName ? chemicalName : null,
                dosage: requiresDosage ? dosage : null,
                phiDays: requiresDosage ? phiDays : null,
                isGACCCompliant:
                    normalizedActivityType !== "SPRAY_PESTICIDE" ||
                    (isGACCCompliant && !isProhibitedChemical(chemicalName)),
                notes: [notes, plannedHarvestDate ? `Ngày thu hoạch dự kiến: ${plannedHarvestDate}` : ""].filter(Boolean).join("\n"),
                images,
            },
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
