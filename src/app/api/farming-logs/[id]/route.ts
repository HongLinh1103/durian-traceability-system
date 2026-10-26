import { canAccessFarmingFarm, canDeleteFarmingLog } from '@/lib/farming-log-access';
import { DiaryMediaError, prepareDiaryFiles, saveDiaryMedia, DIARY_UPLOAD_LIMIT } from '@/lib/diary-media';
import { isValidLogMaterial } from "@/lib/farming-log-stock";
import { selfOwnedMaterial, allowsSelfOwnedMaterials } from "@/lib/self-owned-materials";
import { lockFarmerStock } from "@/lib/farmer-material-fifo";
import { seasonDateBounds } from "@/lib/crop-season";
import { NextResponse } from "next/server";
import { updateLogStock, removeLogStock, createLogMaterials } from "@/lib/farming-log-stock";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { matchProhibitedChemical } from "@/lib/workflow";
import {
    prismaActivityTypeMap,
    prismaGrowthStageMap,
    toPrismaActivityType,
    toPrismaGrowthStage,
    type PrismaActivityTypeLabel,
    type PrismaGrowthStageLabel,
} from "@/lib/mappings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STAGES = new Set([
    "POST_HARVEST_RECOVERY",
    "MAKING_SPROUT",
    "FLOWER_INDUCTION",
    "FLOWERING",
    "FRUIT_SETTING",
    "FRUIT_GROWING",
    "PRE_HARVEST",
    "HARVEST",
]);

const VALID_ACTIVITIES = new Set([
    "BASE_FERTILIZING",
    "PLANTING",
    "MULCHING",
    "IRRIGATE",
    "FERTILIZE",
    "FOLIAR_FERTILIZING",
    "WEEDING",
    "PRUNE",
    "SHOOT_MANAGEMENT",
    "WATER_STRESS",
    "FLOWER_INDUCTION",
    "FLOWER_THINNING",
    "POLLINATION",
    "FRUIT_THINNING",
    "PEST_INSPECTION",
    "TRACK_FRUIT",
    "SPRAY_PESTICIDE",
    "FRUIT_BAGGING",
    "BRANCH_SUPPORT",
    "HARVEST",
    "FRUIT_GRADING",
    "GARDEN_SANITATION",
    "OTHER",
]);

function normalizeGrowthStage(stage: string): string {
    if (VALID_STAGES.has(stage)) return stage;
    if (stage in prismaGrowthStageMap) {
        return toPrismaGrowthStage(stage as PrismaGrowthStageLabel);
    }
    return stage;
}

function normalizeActivityType(activity: string): string {
    if (VALID_ACTIVITIES.has(activity)) return activity;
    if (activity in prismaActivityTypeMap) {
        return toPrismaActivityType(activity as PrismaActivityTypeLabel);
    }
    return activity;
}

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
        }

        const log = await prisma.farmingLog.findUnique({
            where: { id: params.id },
            include: {
                farm: { select: { id: true, farmCode: true, farmName: true, farmerId: true } },
                cropSeason: { select: { id: true, name: true, year: true, status: true } },
                materialsUsed: true,
            },
        });

        if (!log) {
            return NextResponse.json({ ok: false, error: "Nhật ký không tồn tại." }, { status: 404 });
        }

        if (!await canAccessFarmingFarm(session.user.id,session.user.role,log.farmId)) {
            return NextResponse.json({ ok: false, error: "Bạn không có quyền xem nhật ký này." }, { status: 403 });
        }

        return NextResponse.json({ ok: true, data: log });
    } catch (error) {
        console.error("Lỗi khi tải chi tiết nhật ký:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Lỗi hệ thống" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    return handleUpdate(request, params.id);
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    return handleUpdate(request, params.id);
}

async function handleUpdate(request: Request, id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
        }

        const log = await prisma.farmingLog.findUnique({
            where: { id },
            include: {
                farm: { select: { id: true, farmerId: true, areaSize: true, areaUnit: true } },
                cropSeason: { select: { id: true, name: true, status: true, startedAt: true, expectedEndAt: true, closedAt: true, year: true } },
                supplyTransactions: { where: { type: "OUT" }, include: { supply: true } },
            },
        });

        if (!log) {
            return NextResponse.json({ ok: false, error: "Nhật ký không tồn tại." }, { status: 404 });
        }

        const isAdminOrManager = session.user.role === "ADMIN" || session.user.role === "AREA_MANAGER";
        if (!await canAccessFarmingFarm(session.user.id,session.user.role,log.farmId)) {
            return NextResponse.json({ ok: false, error: "Bạn không có quyền sửa nhật ký này." }, { status: 403 });
        }

        if (log.cropSeason?.status === "CLOSED" && !isAdminOrManager) {
            return NextResponse.json(
                { ok: false, error: "Vụ mùa đã đóng, không thể sửa nhật ký." },
                { status: 400 }
            );
        }

        if (Number(request.headers.get('content-length') || 0) > DIARY_UPLOAD_LIMIT + 100000) return NextResponse.json({ok:false,error:'Tổng file tải lên tối đa 3,5 MB.'},{status:413});
        const multipart = request.headers.get('content-type')?.includes('multipart/form-data') ? await request.formData() : null;
        const body = multipart ? JSON.parse(String(multipart.get('data') || '{}')) : await request.json().catch(() => null);
        const uploaded = multipart ? multipart.getAll('newImages').filter((file): file is File => file instanceof File) : [];
        const voice = multipart?.get('voice');
        const mediaFiles = await prepareDiaryFiles(uploaded, voice instanceof File ? voice : null);
        if (!body) {
            return NextResponse.json({ ok: false, error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
        }

        const {
            stage,
            activityType,
            otherActivity,
            actionDate,
            chemicalName,
            dosage,
            phiDays,
            pestsDetected,
            notes,
            images,
            isGACCCompliant,
        } = body;

        const normalizedStage = stage ? normalizeGrowthStage(stage) : log.stage;
        const normalizedActivity = activityType ? normalizeActivityType(activityType) : log.activityType;

        if (!VALID_STAGES.has(normalizedStage)) {
            return NextResponse.json({ ok: false, error: "Giai đoạn sinh trưởng không hợp lệ." }, { status: 400 });
        }
        if (!VALID_ACTIVITIES.has(normalizedActivity)) {
            return NextResponse.json({ ok: false, error: "Hoạt động canh tác không hợp lệ." }, { status: 400 });
        }

        let parsedActionDate = log.actionDate;
        if (actionDate) {
            const d = new Date(actionDate);
            if (Number.isNaN(d.getTime())) {
                return NextResponse.json({ ok: false, error: "Ngày thực hiện không hợp lệ." }, { status: 400 });
            }
            parsedActionDate = d;
        }

        if (log.cropSeason) { const bounds = seasonDateBounds(log.cropSeason); const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsedActionDate); if (day < bounds.min || day > bounds.max) return NextResponse.json({ ok: false, error: "Ngày nhật ký phải nằm trong niên vụ" }, { status: 400 }); }
        const usesMaterials = ["SPRAY_PESTICIDE", "FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(normalizedActivity) || (normalizedActivity === "PEST_INSPECTION" && (body.materials !== undefined ? body.materials.length > 0 : log.supplyTransactions.length > 0));
        if (body.materials !== undefined && (!Array.isArray(body.materials) || body.materials.length > 50 || body.materials.some((m: any) => !isValidLogMaterial(m)))) return NextResponse.json({ ok: false, error: "Vật tư, số lượng, nội dung hoặc PHI không hợp lệ" }, { status: 400 });
        if (usesMaterials && body.materials !== undefined && !body.materials.length) return NextResponse.json({ ok: false, error: "Chọn ít nhất một vật tư" }, { status: 400 });
        const requestedSupplies = body.materials ? await prisma.farmerSupply.findMany({ where: { farmerId: log.farm.farmerId, id: { in: body.materials.map((m: any) => m.supplyId) } } }) : [];
        if (body.materials?.some((m: any) => (m.appliedArea ?? log.farm.areaSize) <= 0 || (m.appliedArea ?? log.farm.areaSize) > log.farm.areaSize)) return NextResponse.json({ ok: false, error: "Diện tích áp dụng phải lớn hơn 0 và không vượt diện tích vườn" }, { status: 400 });
        if (body.materials?.some((m: any) => !(selfOwnedMaterial(m.supplyId) && allowsSelfOwnedMaterials(normalizedActivity)) && !requestedSupplies.some(s => s.id === m.supplyId))) return NextResponse.json({ ok: false, error: "Vật tư không thuộc kho của chủ nhật ký" }, { status: 400 });
        const finalChemicalName = body.materials ? body.materials.map((m: any) => (selfOwnedMaterial(m.supplyId) || requestedSupplies.find(s => s.id === m.supplyId))!.name).join(" + ") : log.supplyTransactions.length ? log.supplyTransactions.map(t => t.supply.name).join(" + ") : chemicalName !== undefined ? (chemicalName?.trim() || null) : log.chemicalName;
        const finalDosage = dosage !== undefined ? (dosage?.trim() || null) : log.dosage;
        const finalPhiDays = phiDays !== undefined && phiDays !== null && phiDays !== ""
            ? Number(phiDays)
            : (phiDays === null || phiDays === "" ? null : log.phiDays);
        const finalPestsDetected = pestsDetected !== undefined ? (pestsDetected?.trim() || "Không phát hiện") : log.pestsDetected;
        const finalNotes = notes !== undefined ? (notes?.trim() || null) : log.notes;
        const finalOtherActivity = normalizedActivity === "OTHER"
            ? (otherActivity?.trim() || log.otherActivity)
            : null;

        if (finalPhiDays !== null && (!Number.isInteger(finalPhiDays) || finalPhiDays < 0)) return NextResponse.json({ ok: false, error: "PHI phải là số ngày nguyên không âm" }, { status: 400 });
        let finalGaccCompliant = log.isGACCCompliant;
        if (normalizedActivity === "SPRAY_PESTICIDE") {
            const prohibitedEntries = await prisma.pesticide.findMany({
                where: { isActive: true, deletedAt: null, gaccStatus: "PROHIBITED" },
                select: { pesticideName: true, tradeName: true, activeIngredient: true },
            });
            const prohibitedMatch = matchProhibitedChemical(finalChemicalName || "", prohibitedEntries);
            const userCompliantCheck = isGACCCompliant !== undefined ? Boolean(isGACCCompliant) : log.isGACCCompliant;
            finalGaccCompliant = userCompliantCheck && prohibitedMatch.status === "none";
        } else if (isGACCCompliant !== undefined) {
            finalGaccCompliant = Boolean(isGACCCompliant);
        }

        const updatedLog = await prisma.$transaction(async tx => {
            await lockFarmerStock(tx, log.farm.farmerId);
            await tx.$queryRaw`SELECT id FROM "FarmingLog" WHERE id = ${id} FOR UPDATE`;
            const current = await tx.farmingLog.findUniqueOrThrow({where:{id}});
            if (body.updatedAt && new Date(body.updatedAt).getTime() !== current.updatedAt.getTime()) throw new DiaryMediaError('Nhật ký đã được người khác cập nhật. Mở lại bản mới nhất trước khi lưu.');
            const links = await saveDiaryMedia(tx,{logId:id,uploaderId:session.user.id,existingImages:current.images,existingVoice:current.voiceUrl,retainedImages:images,retainedVoice:body.voiceUrl,files:mediaFiles});
            await tx.traceAuditLog.create({data:{actorId:session.user.id,action:'UPDATE_FARMING_LOG',entityType:'FarmingLog',entityId:id,metadata:{farmId:log.farmId,originalFarmerId:log.farm.farmerId,before:{notes:current.notes,images:current.images.filter(url=>!url.startsWith('data:')),voiceUrl:current.voiceUrl,actionDate:current.actionDate.toISOString()},changedFields:Object.keys(body)}}});
            if (body.materialQuantities !== undefined && (!Array.isArray(body.materialQuantities) || body.materialQuantities.some((q: any) => !q || typeof q.transactionId !== "string" || typeof q.quantity !== "number"))) throw new Error("Dữ liệu vật tư không hợp lệ");
            if (!usesMaterials) await removeLogStock(tx, id);
            let summary = null;
            if (usesMaterials && body.materials !== undefined) {
                if (!log.cropSeasonId) throw new Error("Nhật ký chưa có niên vụ");
                const removedMovements = await removeLogStock(tx, id, false);
                summary = await createLogMaterials(tx, { logId: id, farmerId: log.farm.farmerId, farmId: log.farmId, cropSeasonId: log.cropSeasonId, actionDate: parsedActionDate, stage: normalizedStage as any, activityType: normalizedActivity as any, materials: body.materials, rebuildStock: removedMovements > 0 });
            } else summary = usesMaterials ? await updateLogStock(tx, { logId: id, farmerId: log.farm.farmerId, actionDate: parsedActionDate, stage: normalizedStage as any, activityType: normalizedActivity as any, quantities: body.materialQuantities }) : null;
            return tx.farmingLog.update({
            where: { id },
            data: {
                stage: normalizedStage as any,
                activityType: normalizedActivity as any,
                otherActivity: finalOtherActivity,
                actionDate: parsedActionDate,
                chemicalName: usesMaterials ? summary?.chemicalName ?? finalChemicalName : null,
                dosage: usesMaterials ? summary?.dosage ?? finalDosage : null,
                phiDays: normalizedActivity === "SPRAY_PESTICIDE" ? body.materials?.length ? Math.max(...body.materials.map((m: any) => m.phiDays ?? finalPhiDays ?? 0)) : finalPhiDays : null,
                pestsDetected: finalPestsDetected,
                notes: finalNotes,
                ...links,
                updatedById: session.user.id,
                isGACCCompliant: finalGaccCompliant,
            },
            });
        }, { timeout: 30000 });

        return NextResponse.json({
            ok: true,
            data: updatedLog,
            message: "Cập nhật nhật ký canh tác thành công.",
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật nhật ký canh tác:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Lỗi khi cập nhật nhật ký" },
            { status: error instanceof DiaryMediaError ? 400 : 500 }
        );
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
        }

        const log = await prisma.farmingLog.findUnique({
            where: { id: params.id },
            include: {
                farm: { select: { id: true, farmerId: true } },
                cropSeason: { select: { id: true, status: true } },
                supplyTransactions: true,
            },
        });

        if (!log) {
            return NextResponse.json({ ok: false, error: "Nhật ký không tồn tại." }, { status: 404 });
        }

        const isAdminOrManager = session.user.role === "ADMIN" || session.user.role === "AREA_MANAGER";
        if (!canDeleteFarmingLog(session.user.id,session.user.role,log.farm.farmerId)) {
            return NextResponse.json({ ok: false, error: "Bạn không có quyền xóa nhật ký này." }, { status: 403 });
        }

        if (log.cropSeason?.status === "CLOSED" && !isAdminOrManager) {
            return NextResponse.json(
                { ok: false, error: "Vụ mùa đã đóng, không thể xóa nhật ký." },
                { status: 400 }
            );
        }

        await prisma.$transaction(async (tx) => {
            await removeLogStock(tx, log.id);

            await tx.pestMonitoringBook.updateMany({
                where: { discoveryLogId: log.id },
                data: { discoveryLogId: null },
            });
            await tx.pestTreatment.updateMany({
                where: { farmingLogId: log.id },
                data: { farmingLogId: null },
            });

            // Nếu log liên kết với kế hoạch canh tác, mở lại trạng thái kế hoạch
            if (log.planId) {
                await tx.farmingPlan.update({
                    where: { id: log.planId },
                    data: { status: "PLANNED", completedAt: null },
                }).catch(() => null);
            }

            // Xóa bản ghi nhật ký
            await tx.farmingLog.delete({
                where: { id: log.id },
            });
        }, { timeout: 30000 });

        return NextResponse.json({
            ok: true,
            message: "Đã xóa nhật ký canh tác thành công.",
        });
    } catch (error) {
        console.error("Lỗi khi xóa nhật ký canh tác:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Lỗi khi xóa nhật ký" },
            { status: 500 }
        );
    }
}
