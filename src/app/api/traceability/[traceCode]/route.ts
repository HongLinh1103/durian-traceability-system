import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicTrace } from "@/lib/traceability";

export const dynamic = "force-dynamic";

/**
 * GET /api/traceability/[traceCode]
 * Unified Traceability Timeline Aggregator (ƯU TIÊN 7 & Điểm 9).
 * Một nguồn dữ liệu truy vết duy nhất cho mọi actor và người tiêu dùng công khai.
 * Tự động phân tích và truy ngược chuỗi hành trình từ bất kỳ mã nào:
 * Tem QR, Lô xuất hàng, Lô thành phẩm, Lô chế biến, Lô nguyên liệu hoặc Phiếu thu hoạch.
 */
export async function GET(
    _: Request,
    props: { params: Promise<{ traceCode: string }> | { traceCode: string } },
) {
    try {
        const params = await Promise.resolve(props.params);
        const code = decodeURIComponent(params.traceCode).trim();

        if (!code) {
            return NextResponse.json(
                { success: false, message: "Vui lòng cung cấp mã truy vết hợp lệ." },
                { status: 400 },
            );
        }

        // 1. Thử tìm qua token tem truy xuất QR trực tiếp
        let traceData = await getPublicTrace(code).catch(() => null);

        // 2. Nếu chưa thấy, thử tìm qua các thực thể nguồn để lấy publicToken
        if (!traceData) {
            // A. Tìm qua mã Lô xuất hàng (Shipment)
            const shipment = await prisma.shipment.findFirst({
                where: { shipmentCode: code },
                include: {
                    items: {
                        include: {
                            commercialLot: {
                                include: {
                                    traceabilityCode: true,
                                },
                            },
                        },
                    },
                },
            });

            const foundToken = shipment?.items?.[0]?.commercialLot?.traceabilityCode?.publicToken;
            if (foundToken) {
                traceData = await getPublicTrace(foundToken).catch(() => null);
            }
        }

        if (!traceData) {
            // B. Tìm qua mã Lô thương phẩm / Tem (CommercialLot / TraceabilityCode)
            const traceCodeRecord = await prisma.traceabilityCode.findFirst({
                where: { OR: [{ code }, { publicToken: code }] },
            });
            if (traceCodeRecord?.publicToken) {
                traceData = await getPublicTrace(traceCodeRecord.publicToken).catch(() => null);
            }
        }

        if (!traceData) {
            // C. Tìm qua mã Lô nguyên liệu (RawMaterialLot) hoặc Phiếu thu hoạch (HarvestRecord)
            const harvest = await prisma.harvestRecord.findFirst({
                where: { OR: [{ code }, { code: code.replace(/^RM-|^HL-/, "") }] },
                include: {
                    farm: { include: { region: true } },
                    farmer: true,
                    buyerFacility: true,
                },
            });

            if (harvest) {
                // Tạo fallback trace data cho phiếu thu hoạch nếu chưa có tem xuất khẩu
                return NextResponse.json({
                    success: true,
                    data: {
                        traceCode: harvest.code,
                        productName: `Sầu riêng ${harvest.durianVariety}`,
                        variety: harvest.durianVariety,
                        status: harvest.status,
                        weight: Number(harvest.receivedWeight || harvest.deliveredWeight || harvest.expectedWeight),
                        weightUnit: harvest.weightUnit,
                        farm: {
                            name: harvest.farm.farmName,
                            code: harvest.farm.farmCode,
                            address: harvest.farm.address,
                            regionCode: harvest.farm.region?.code || "Chưa có MSVT",
                        },
                        farmer: {
                            name: harvest.farmer.fullName,
                        },
                        reception: harvest.buyerFacility ? {
                            name: harvest.buyerFacility.name,
                            type: harvest.buyerFacility.type,
                            receivedAt: harvest.buyerReceivedAt?.toISOString() || null,
                        } : null,
                        timeline: [
                            {
                                step: 1,
                                title: "Canh tác tại Vườn",
                                time: harvest.createdAt.toISOString(),
                                description: `Vườn ${harvest.farm.farmName} canh tác theo quy trình VietGAP.`,
                            },
                            {
                                step: 2,
                                title: "Thu hoạch",
                                time: (harvest.actualHarvestedAt || harvest.expectedHarvestDate).toISOString(),
                                description: `Thu hoạch sầu riêng ${harvest.durianVariety}, khối lượng: ${harvest.actualWeight || harvest.expectedWeight} ${harvest.weightUnit}.`,
                            },
                            ...(harvest.buyerReceivedAt ? [{
                                step: 3,
                                title: "Tiếp nhận tại Cơ sở / Vựa",
                                time: harvest.buyerReceivedAt.toISOString(),
                                description: `Đã tiếp nhận thực tế tại ${harvest.buyerFacility?.name || "Cơ sở đối tác"}. Khối lượng: ${harvest.receivedWeight} kg.`,
                            }] : []),
                        ],
                    },
                });
            }
        }

        if (!traceData) {
            return NextResponse.json(
                { success: false, message: `Không tìm thấy thông tin truy xuất cho mã '${code}'.` },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            data: traceData,
        });
    } catch (error: any) {
        console.error("GET /api/traceability/[traceCode] error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi truy xuất nguồn gốc." },
            { status: 500 },
        );
    }
}
