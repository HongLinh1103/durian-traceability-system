import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== BẮT ĐẦU SEED DỮ LIỆU NHẬT KÝ CANH TÁC CHO CÁC VỤ MÙA ĐÃ ĐÓNG (CLOSED) ===");

    // Tìm tất cả các vụ mùa đã đóng
    const closedSeasons = await prisma.cropSeason.findMany({
        where: { status: "CLOSED" },
        include: {
            farm: true,
            farmingLogs: true,
        },
    });

    console.log(`Tìm thấy ${closedSeasons.length} vụ mùa đã đóng.`);

    for (const season of closedSeasons) {
        // Nếu đã có log, xóa để seed lại dữ liệu chuẩn đẹp
        if (season.farmingLogs.length > 0) {
            await prisma.farmingLog.deleteMany({
                where: { cropSeasonId: season.id },
            });
        }

        const year = season.year || 2025;
        const prevYear = year - 1;

        const logsToCreate = [
            // 1. Phục hồi sau thu hoạch (Tháng 8 - 9 năm trước)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "POST_HARVEST_RECOVERY" as const,
                actionDate: new Date(`${prevYear}-08-15T08:30:00Z`),
                activityType: "PRUNE" as const,
                otherActivity: null,
                chemicalName: "Vôi tôi + Đồng Sunfat Bordeaux",
                dosage: "Quét thân cây và vết cắt cành",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Cắt tỉa toàn bộ cành khô, cành sâu bệnh, cành tăm trong tán. Quét gốc phòng ngừa xì mủ nấm Phytophthora.",
                images: ["https://images.unsplash.com/photo-1592417817098-8f3d6ef23a67?w=600&auto=format&fit=crop&q=80"],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "POST_HARVEST_RECOVERY" as const,
                actionDate: new Date(`${prevYear}-08-25T07:00:00Z`),
                activityType: "BASE_FERTILIZING" as const,
                otherActivity: null,
                chemicalName: "Phân hữu cơ vi sinh Quế Lâm 01 + Trichoderma",
                dosage: "20 kg / gốc",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Bón rải đều quanh tán cây kết hợp tưới vi sinh đối kháng Trichoderma kích thích phục hồi hệ rễ non sau thu hoạch.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "POST_HARVEST_RECOVERY" as const,
                actionDate: new Date(`${prevYear}-09-05T09:00:00Z`),
                activityType: "IRRIGATE" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Tưới đẫm nước toàn vườn bằng hệ thống béc tưới tự động, duy trì ẩm độ đất 70-80% để cây hấp thụ phân bón.",
                images: [],
            },

            // 2. Nuôi đọt - Làm cơi đọt (Tháng 9 - 10)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "MAKING_SPROUT" as const,
                actionDate: new Date(`${prevYear}-09-20T08:00:00Z`),
                activityType: "SHOOT_MANAGEMENT" as const,
                otherActivity: null,
                chemicalName: "Phân bón lá Humic Acid + Rong biển Seaweed",
                dosage: "500ml / 400 lít nước",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Phun ướt đều tán lá kích cơi đọt thứ nhất phát triển đồng loạt, lá dày bóng khỏe.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "MAKING_SPROUT" as const,
                actionDate: new Date(`${prevYear}-10-02T07:30:00Z`),
                activityType: "FERTILIZE" as const,
                otherActivity: null,
                chemicalName: "NPK YaraMila Complex 12-11-18",
                dosage: "1.5 kg / cây",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Bón gốc bổ sung dinh dưỡng đa lượng thúc đẩy cơi đọt thành thục nhanh và chuẩn bị cơi đọt 2.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "MAKING_SPROUT" as const,
                actionDate: new Date(`${prevYear}-10-18T16:30:00Z`),
                activityType: "SPRAY_PESTICIDE" as const,
                otherActivity: null,
                chemicalName: "Sinh học Radiant 60SC (Spinetoram)",
                dosage: "15ml / bình 16 lít",
                phiDays: 3,
                isGACCCompliant: true,
                notes: "Phun phòng ngừa rầy xanh và bọ trĩ gây xoăn lá đọt non. Đọt ra đều, sạch sâu bệnh.",
                images: [],
            },

            // 3. Xử lý ra hoa (Tháng 11 - 12)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FLOWER_INDUCTION" as const,
                actionDate: new Date(`${prevYear}-11-10T08:00:00Z`),
                activityType: "WATER_STRESS" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Dọn sạch cỏ rác trong bồn gốc, ngừng tưới nước (xiết nước tạo hạn) 20 ngày để cây phân hóa mầm hoa.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FLOWER_INDUCTION" as const,
                actionDate: new Date(`${prevYear}-11-28T07:30:00Z`),
                activityType: "FLOWER_INDUCTION" as const,
                otherActivity: null,
                chemicalName: "Phân bón lá MKP 0-52-34 Haifa",
                dosage: "1 kg / 200 lít nước",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Phun ức chế ngọn non, già hóa bộ lá và thúc đẩy mầm hoa dạng 'mắt cua' nhú đều dưới dạ cành.",
                images: [],
            },

            // 4. Giai đoạn ra hoa - Thụ phấn (Tháng 1)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FLOWERING" as const,
                actionDate: new Date(`${year}-01-05T09:00:00Z`),
                activityType: "IRRIGATE" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Mắt cua đã nhú sáng 3cm khắp các cành mang trái. Bắt đầu tưới nhấp nước nhẹ 1/3 lượng nước bình thường để nuôi hoa.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FLOWERING" as const,
                actionDate: new Date(`${year}-01-18T08:00:00Z`),
                activityType: "FLOWER_THINNING" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Tỉa bớt các chùm hoa ở đầu cành, chùm hoa sát thân và chùm hoa dị dạng. Giữ lại 4-6 chùm hoa khỏe cách nhau 20-25cm trên mỗi cành cấp 1.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FLOWERING" as const,
                actionDate: new Date(`${year}-01-26T19:00:00Z`),
                activityType: "POLLINATION" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Thụ phấn bổ sung nhân tạo lúc 18h30 - 20h30 khi hoa nở rộ. Dùng chổi mềm quét phấn đều giúp trái nở hộc đều, tròn trái và không bị méo.",
                images: [],
            },

            // 5. Đậu trái - Nuôi trái non (Tháng 2 - 3)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FRUIT_SETTING" as const,
                actionDate: new Date(`${year}-02-12T07:30:00Z`),
                activityType: "FRUIT_THINNING" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Tỉa trái non đợt 1 sau khi đậu trái 3 tuần: Cắt bỏ các trái dị dạng, trái méo mó, trái bị sâu đục và trái cuống nhỏ.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FRUIT_SETTING" as const,
                actionDate: new Date(`${year}-02-22T08:00:00Z`),
                activityType: "FOLIAR_FERTILIZING" as const,
                otherActivity: null,
                chemicalName: "Canxi Bo Chelate + Amino Acid Hữu Cơ",
                dosage: "250ml / 200 lít nước",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Phun dưỡng trái non chống rụng trái sinh lý và giúp dai cuống.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FRUIT_GROWING" as const,
                actionDate: new Date(`${year}-03-10T08:00:00Z`),
                activityType: "FRUIT_THINNING" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Tỉa trái non đợt 2: Định hình số lượng trái ổn định trên cây (chọn giữ khoảng 70-90 trái đều đẹp trên mỗi cây trưởng thành).",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FRUIT_GROWING" as const,
                actionDate: new Date(`${year}-03-25T07:30:00Z`),
                activityType: "BRANCH_SUPPORT" as const,
                otherActivity: null,
                chemicalName: "Dây nilon đan chịu lực",
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Cột dây neo chống đỡ cành mang nhiều trái lớn vào thân chính, tránh gãy đổ cành khi có gió lốc và dông mưa.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "FRUIT_GROWING" as const,
                actionDate: new Date(`${year}-04-08T07:00:00Z`),
                activityType: "FERTILIZE" as const,
                otherActivity: null,
                chemicalName: "NPK Kali Sunfat YaraMila Winner 15-09-20 (SOP)",
                dosage: "2 kg / cây",
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Bón gốc thúc nuôi cơm dày, hạn chế sượng cơm và tăng phẩm chất ngọt béo thơm đặc trưng của sầu riêng.",
                images: [],
            },

            // 6. Trước thu hoạch & Thu hoạch (Tháng 5)
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "PRE_HARVEST" as const,
                actionDate: new Date(`${year}-05-02T08:30:00Z`),
                activityType: "PEST_INSPECTION" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Kiểm tra dư lượng an toàn PHI trước thu hoạch 21 ngày. Không sử dụng bất kỳ loại hóa chất BVTV nào trong giai đoạn này.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "HARVEST" as const,
                actionDate: new Date(`${year}-05-22T06:00:00Z`),
                activityType: "HARVEST" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Thu hoạch đợt chính vụ: Cắt các trái sầu riêng đạt độ chín 8.5 tuổi (gai nở đều, cuống thơm, gõ vang chắc). Tổng sản lượng thu hoạch đợt 1 đạt 12.5 tấn.",
                images: ["https://images.unsplash.com/photo-1546470427-e26264be0b11?w=600&auto=format&fit=crop&q=80"],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "HARVEST" as const,
                actionDate: new Date(`${year}-05-23T10:00:00Z`),
                activityType: "FRUIT_GRADING" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Phân loại chất lượng xuất khẩu: Trái loại A (2.7 - 4.5kg) đạt 82%, Loại B đạt 15%, Dạt loại C 3%. Toàn bộ đã bàn giao cho HTX xuất khẩu sang Trung Quốc theo mã MSVT.",
                images: [],
            },
            {
                farmId: season.farmId,
                cropSeasonId: season.id,
                stage: "HARVEST" as const,
                actionDate: new Date(`${year}-05-28T08:00:00Z`),
                activityType: "GARDEN_SANITATION" as const,
                otherActivity: null,
                chemicalName: null,
                dosage: null,
                phiDays: 0,
                isGACCCompliant: true,
                notes: "Thu dọn tàn dư sau thu hoạch, dọn sạch dây neo, khép lại vụ mùa 2025 thành công.",
                images: [],
            },
        ];

        await prisma.farmingLog.createMany({
            data: logsToCreate,
        });

        console.log(`✓ Đã tạo ${logsToCreate.length} nhật ký canh tác cho vườn ${season.farm.farmName} (${season.name} - ${year})`);
    }

    console.log("=== HOÀN TẤT SEED NHẬT KÝ CANH TÁC CHO CÁC VỤ MÙA CŨ ===");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
