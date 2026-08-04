const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ppdSource = "https://sansangxuatkhau.ppd.gov.vn/FileUpload/Documents/211225__quy_trinh_qlsb_sau_riengrevised_3pdf.pdf";
const binhDienSource = "https://binhdien.com/dong-hanh-cung-nha-nong/chuong-trinh-canh-tac-thong-minh/sulphate-kali-doi-voi-chat-luong-sau-rieng.html";
const amistarSource = "https://www.syngenta.com.vn/product/crop-protection/thuoc-tru-benh/amistar-top-325sc";
const confidorSource = "https://www.ppd.gov.vn/FileUpload/Documents/P.%20Ke%20hoach/QD2329_qt%20IPM%20sau%20duc%20cuong%20vai_2012_11_21.pdf";
const binhDienAt2Source = "https://binhdien.com/dong-hanh-cung-nha-nong/chuong-trinh-canh-tac-thong-minh/bon-phan-cho-sau-rieng-thoi-ky-ra-hoa-vung-dong-nam-bo.html";
const binhDienAt1Source = "https://binhdien.com/dong-hanh-cung-nha-nong/chuong-trinh-canh-tac-thong-minh/tai-thiet-vuon-cay-an-trai-dbscl-dung-voi-bon-phan-khi-re-con-ngat-tho.html";
const binhDienQaSource = "https://binhdien.com/hoidap/muc-hoi-dap/?p=60";
const ppdAllowedListSource = "https://ppd.gov.vn/FileUpload/Documents/Thuoc%20BVTV/24.12.16_PL%201%20_25-bnn-kem1.pdf";
const binhDienNpkSource = "https://binhdien.com/sanpham/npk-dau-trau/npk-dau-trau-20-20-15-1.html";
const songGianhOrganicSource = "https://songgianh.com.vn/phan-huu-co-vi-sinh-cao-cap-song-gianh-p265.html";
const southernFertilizerPotassiumSource = "https://phanbonmiennam.com.vn/nha-nong/bai-3-kali-va-vai-tro-phan-kali-trong-canh-tac-nong-nghiep-con-nua/";

async function main() {
    const fertilizerEnrichments = [
        { code: "FER-NPK-201515", mainUses: "Cung cấp cân đối đạm, lân và kali, hỗ trợ phát triển rễ, thân cành và phục hồi cây sau thu hoạch.", targetCrops: "Nhiều loại cây trồng; với cây ăn trái dùng theo giai đoạn kiến thiết hoặc sau thu hoạch theo hướng dẫn trên nhãn.", usageInstructions: "Bón theo loại đất, tuổi cây và tình hình sinh trưởng; không áp dụng một liều cố định cho mọi vườn.", sourceReference: binhDienNpkSource },
        { code: "FER-ORG-001", mainUses: "Bổ sung chất hữu cơ và vi sinh vật hữu ích, cải tạo độ phì đất, hỗ trợ bộ rễ phát triển và tăng khả năng hấp thu dinh dưỡng.", targetCrops: "Dùng bón lót hoặc bón bổ sung cho nhiều loại cây trồng theo hướng dẫn trên bao bì.", usageInstructions: "Bón vào đất và phối hợp với chế độ dinh dưỡng phù hợp; liều lượng căn cứ nhãn sản phẩm và tình trạng vườn.", sourceReference: songGianhOrganicSource },
        { code: "FER-KCL-001", mainUses: "Bổ sung kali, hỗ trợ vận chuyển đường và tổng hợp chất hữu cơ, giúp cây cứng khỏe và cải thiện năng suất, chất lượng nông sản.", targetCrops: "Cây trồng có nhu cầu kali và không mẫn cảm với clo; cần thận trọng với sầu riêng và cây nhạy cảm clo.", usageInstructions: "Chỉ bón theo kết quả phân tích đất, nhu cầu cây và hướng dẫn trên bao bì; không dùng thay thế kali sulphate cho cây nhạy cảm clo.", safetyWarnings: "Không bón quá liều hoặc sát gốc; với sầu riêng nên có tư vấn kỹ thuật trước khi sử dụng nguồn kali clorua.", sourceReference: southernFertilizerPotassiumSource },
    ];

    for (const { code, ...data } of fertilizerEnrichments) {
        await prisma.fertilizer.updateMany({ where: { code }, data });
    }

    // Loại bỏ bản ghi demo bị cấm khỏi danh mục; giữ quy trình xóa mềm để không
    // làm mất liên kết lịch sử nếu dữ liệu này từng được sử dụng.
    await prisma.pesticide.updateMany({
        where: { code: "PEST-TRIC-001" },
        data: { isActive: false, deletedAt: new Date() },
    });

    await prisma.pesticide.updateMany({
        where: { code: "PEST-AMIS-001", gaccStatus: "ALLOWED" },
        data: {
            concentration: "200 g/L Azoxystrobin + 125 g/L Difenoconazole",
            category: "Thuốc phòng và trừ bệnh",
            manufacturer: "Syngenta; phân phối bởi VFC",
            targetPests: "Nấm bệnh như rỉ sắt, thán thư, khô vằn và đốm lá trên các cây trồng nằm trong phạm vi đăng ký.",
            usagePurpose: "Thuốc trừ nấm nội hấp, lưu dẫn; hỗ trợ phòng và trị bệnh bằng cơ chế tác động kép.",
            usageInstructions: "Chỉ sử dụng trên cây trồng và bệnh hại ghi trên nhãn đăng ký; phun khi bệnh chớm xuất hiện.",
            safetyWarnings: "Mang đầy đủ bảo hộ, tránh nguồn nước và tuân thủ đúng PHI trên nhãn cho từng cây trồng.",
            storageInstructions: "Giữ trong bao bì gốc, nơi khóa kín, khô thoáng, xa trẻ em và thực phẩm.",
            sourceReference: amistarSource,
        },
    });

    await prisma.pesticide.updateMany({
        where: { code: "PEST-CONF-001", gaccStatus: "ALLOWED" },
        data: {
            concentration: "Imidacloprid 100 g/L",
            category: "Thuốc trừ côn trùng",
            manufacturer: "Bayer",
            targetPests: "Côn trùng chích hút và một số sâu hại theo đúng phạm vi đăng ký trên nhãn sản phẩm.",
            usagePurpose: "Tác động lên hệ thần kinh côn trùng để kiểm soát côn trùng gây hại cây trồng.",
            usageInstructions: "Dùng đúng cây trồng, đối tượng và liều lượng ghi trên nhãn; không tự suy rộng sang cây sầu riêng nếu nhãn không đăng ký.",
            safetyWarnings: "Mang đồ bảo hộ; không phun gần nguồn nước, khi có gió mạnh hoặc trong thời gian ong hoạt động.",
            storageInstructions: "Bảo quản nguyên bao bì, khóa kín, xa trẻ em, thức ăn và nguồn nhiệt.",
            sourceReference: confidorSource,
        },
    });

    const fertilizers = [
        {
            code: "FER-DAUTRAU-NUOITRAI",
            name: "Đầu Trâu chuyên dùng nuôi trái",
            fertilizerType: "NPK",
            brand: "Đầu Trâu",
            manufacturer: "Công ty Cổ phần Phân bón Bình Điền",
            origin: "Việt Nam",
            nutrientComposition: "K₂O 21%, lưu huỳnh 7% từ kali sulphate",
            mainUses: "Bổ sung kali và lưu huỳnh trong giai đoạn trái phát triển, hỗ trợ chất lượng trái.",
            targetCrops: "Cây ăn trái; nguồn Bình Điền đề cập sử dụng cho sầu riêng giai đoạn nuôi trái.",
            usageInstructions: "Liều lượng phải căn cứ tuổi cây, đất, giai đoạn sinh trưởng và hướng dẫn trên bao bì.",
            safetyWarnings: "Không tự tăng liều; đeo bảo hộ khi thao tác và tránh để sản phẩm tiếp xúc thực phẩm.",
            storageInstructions: "Bảo quản khô ráo, bao bì kín, xa trẻ em và nguồn thực phẩm.",
            sourceReference: binhDienSource,
            isActive: true,
        },
        {
            code: "FER-DAUTRAU-AT3",
            name: "Đầu Trâu AT3",
            fertilizerType: "NPK",
            brand: "Đầu Trâu",
            manufacturer: "Công ty Cổ phần Phân bón Bình Điền",
            origin: "Việt Nam",
            nutrientComposition: "K₂O 17%, lưu huỳnh 1,5%",
            mainUses: "Bổ sung dinh dưỡng cho cây ăn trái trong giai đoạn trái phát triển.",
            targetCrops: "Cây ăn trái và sầu riêng; nguồn Bình Điền nêu phù hợp điều kiện đất Đồng bằng sông Cửu Long.",
            usageInstructions: "Tham khảo nhãn sản phẩm và kết quả phân tích đất trước khi xác định liều bón.",
            safetyWarnings: "Thông tin chỉ tham khảo; không thay thế hướng dẫn trên nhãn.",
            storageInstructions: "Bảo quản nơi khô, thoáng và tránh ẩm.",
            sourceReference: binhDienSource,
            isActive: true,
        },
        {
            code: "FER-DAUTRAU-AT1",
            name: "Đầu Trâu AT1",
            fertilizerType: "NPK",
            brand: "Đầu Trâu",
            manufacturer: "Công ty Cổ phần Phân bón Bình Điền",
            origin: "Việt Nam",
            nutrientComposition: "NPK 18-8-12 + TE",
            mainUses: "Cung cấp dinh dưỡng cân đối cho giai đoạn phục hồi và sinh trưởng thân, cành, lá.",
            targetCrops: "Cây ăn trái, bao gồm sầu riêng trong giai đoạn kiến thiết cơ bản hoặc phục hồi vườn.",
            usageInstructions: "Xác định liều bón theo tuổi cây, tình trạng rễ, đất và hướng dẫn hiện hành trên bao bì; không bón khi rễ còn ngập úng.",
            safetyWarnings: "Thông tin chỉ dùng để tham khảo; không tự tăng liều và cần mang bảo hộ khi thao tác.",
            storageInstructions: "Giữ kín bao bì, bảo quản nơi khô thoáng, xa trẻ em và thực phẩm.",
            sourceReference: binhDienAt1Source,
            isActive: true,
        },
        {
            code: "FER-DAUTRAU-AT2",
            name: "Đầu Trâu AT2",
            fertilizerType: "NPK",
            brand: "Đầu Trâu",
            manufacturer: "Công ty Cổ phần Phân bón Bình Điền",
            origin: "Việt Nam",
            nutrientComposition: "N 7%, P₂O₅ 17%, K₂O 12%, bổ sung Zn và B",
            mainUses: "Hỗ trợ phân hóa mầm hoa, ra hoa tập trung và tăng sức sống hạt phấn cho cây sầu riêng.",
            targetCrops: "Cây ăn trái; nguồn Bình Điền hướng dẫn cho sầu riêng ở thời kỳ ra hoa.",
            usageInstructions: "Bón theo hướng dẫn trên nhãn và điều kiện vườn; nguồn tham khảo nêu thời điểm khoảng 1,5–2 tháng trước ra hoa.",
            safetyWarnings: "Không áp dụng máy móc một liều cho mọi vườn; cần căn cứ tuổi cây, đất và tình trạng sinh trưởng.",
            storageInstructions: "Bảo quản khô ráo, bao bì kín, tránh ẩm và xa thực phẩm.",
            sourceReference: binhDienAt2Source,
            isActive: true,
        },
        {
            code: "FER-DAUTRAU-201015TE",
            name: "Đầu Trâu NPK 20-10-15+TE",
            fertilizerType: "NPK",
            brand: "Đầu Trâu",
            manufacturer: "Công ty Cổ phần Phân bón Bình Điền",
            origin: "Việt Nam",
            nutrientComposition: "NPK 20-10-15, bổ sung trung và vi lượng (TE)",
            mainUses: "Bổ sung dinh dưỡng cho cây sầu riêng sinh trưởng, phát triển tán và duy trì sức cây.",
            targetCrops: "Cây ăn trái và sầu riêng; sử dụng theo giai đoạn sinh trưởng và khuyến cáo trên bao bì.",
            usageInstructions: "Tham khảo cán bộ kỹ thuật, kết quả phân tích đất và nhãn sản phẩm trước khi xác định lượng bón.",
            safetyWarnings: "Không bón quá liều hoặc sát gốc; đeo bảo hộ và rửa sạch sau khi thao tác.",
            storageInstructions: "Bảo quản nơi khô thoáng, kê cao, đóng kín bao bì sau khi mở.",
            sourceReference: binhDienQaSource,
            isActive: true,
        },
    ];

    const pesticides = [
        {
            code: "PEST-PENALTY-40WP",
            tradeName: "Penalty 40WP",
            activeIngredient: "Acetamiprid + Buprofezin",
            concentration: "20% + 20%",
            category: "Thuốc trừ sâu",
            targetPests: "Rệp sáp bột hai tua dài, rầy nhảy, sâu đục quả sầu riêng",
            usagePurpose: "Hoạt chất được nêu trong quy trình quản lý tổng hợp sinh vật gây hại sầu riêng của Cục BVTV.",
            usageInstructions: "Chỉ sử dụng khi sản phẩm và phạm vi sử dụng đã được đăng ký; tuân thủ nhãn và nguyên tắc 4 đúng.",
            safetyWarnings: "Dừng phun trước thu hoạch ít nhất 15 ngày theo quy trình tham khảo; sử dụng đầy đủ bảo hộ.",
            storageInstructions: "Để trong bao bì gốc, khóa kín, xa trẻ em, thực phẩm và nguồn nước.",
            sourceReference: ppdSource,
            gaccStatus: "RESTRICTED",
            localStatus: "Sử dụng có điều kiện; Admin phải đối chiếu đăng ký lưu hành và nhãn hiện hành",
            isActive: true,
        },
        {
            code: "PEST-MOVENTO-150OD",
            tradeName: "Movento 150OD",
            activeIngredient: "Spirotetramat",
            concentration: "150 g/L (cần đối chiếu nhãn hiện hành)",
            category: "Thuốc trừ sâu",
            manufacturer: "Bayer",
            targetPests: "Rệp sáp bột hai tua dài, rầy nhảy, sâu đục quả sầu riêng",
            usagePurpose: "Hoạt chất được nêu trong quy trình quản lý tổng hợp sinh vật gây hại sầu riêng của Cục BVTV.",
            usageInstructions: "Chỉ sử dụng đúng phạm vi đăng ký và liều ghi trên nhãn được cơ quan có thẩm quyền phê duyệt.",
            safetyWarnings: "Dừng phun trước thu hoạch ít nhất 15 ngày theo quy trình tham khảo; mang đầy đủ bảo hộ.",
            storageInstructions: "Bảo quản trong bao bì gốc, nơi khóa kín, khô thoáng và xa nguồn nước.",
            sourceReference: ppdSource,
            gaccStatus: "RESTRICTED",
            localStatus: "Sử dụng có điều kiện; Admin phải đối chiếu đăng ký lưu hành và nhãn hiện hành",
            isActive: true,
        },
        {
            code: "PEST-BITADIN-WP",
            tradeName: "Bitadin WP",
            activeIngredient: "Bacillus thuringiensis var. kurstaki + Granulosis virus",
            concentration: "16.000 IU/mg + 10^8 PIB/g",
            category: "Thuốc BVTV",
            manufacturer: "Theo nhãn sản phẩm được lưu hành",
            targetPests: "Một số sâu hại thuộc phạm vi đăng ký trên nhãn hiện hành.",
            usagePurpose: "Chế phẩm sinh học dùng để kiểm soát côn trùng gây hại theo đúng cây trồng và đối tượng đã đăng ký.",
            usageInstructions: "Chỉ dùng đúng cây trồng, sâu hại, liều lượng và cách dùng trên nhãn được phê duyệt; không tự suy rộng phạm vi sử dụng cho sầu riêng.",
            safetyWarnings: "Mang bảo hộ, không ăn uống khi pha phun; quy trình IPM sầu riêng tham khảo yêu cầu dừng phun ít nhất 15 ngày trước thu hoạch.",
            storageInstructions: "Giữ nguyên bao bì, bảo quản nơi khô mát, khóa kín, xa trẻ em, thực phẩm và nguồn nước.",
            sourceReference: `${ppdAllowedListSource}\n${ppdSource}`,
            gaccStatus: "ALLOWED",
            localStatus: "Chỉ sử dụng theo phạm vi đăng ký và nhãn hiện hành",
            isActive: true,
        },
        {
            code: "PEST-TRANGXANH-WP",
            tradeName: "Trắng xanh WP",
            activeIngredient: "Beauveria bassiana + Metarhizium anisopliae",
            concentration: "1 x 10^9 bào tử/g + 0,5 x 10^9 bào tử/g",
            category: "Thuốc BVTV",
            manufacturer: "Theo nhãn sản phẩm được lưu hành",
            targetPests: "Một số côn trùng chích hút và sâu hại thuộc phạm vi đăng ký trên nhãn hiện hành.",
            usagePurpose: "Chế phẩm nấm sinh học hỗ trợ kiểm soát côn trùng gây hại theo phạm vi đăng ký.",
            usageInstructions: "Đọc nhãn trước khi dùng; chỉ áp dụng cho cây trồng, đối tượng và liều lượng đã được đăng ký, ưu tiên điều kiện phun phù hợp với chế phẩm sinh học.",
            safetyWarnings: "Mang bảo hộ và tránh hít bụi thuốc; không làm nhiễm nguồn nước; tuân thủ thời gian cách ly trên nhãn hiện hành.",
            storageInstructions: "Bảo quản kín tại nơi khô mát, tránh nắng và nhiệt độ cao, xa trẻ em và thực phẩm.",
            sourceReference: `${ppdAllowedListSource}\n${ppdSource}`,
            gaccStatus: "ALLOWED",
            localStatus: "Chỉ sử dụng theo phạm vi đăng ký và nhãn hiện hành",
            isActive: true,
        },
    ];

    for (const data of fertilizers) await prisma.fertilizer.upsert({ where: { code: data.code }, update: data, create: data });
    for (const data of pesticides) await prisma.pesticide.upsert({ where: { code: data.code }, update: data, create: data });
    console.log(`Imported ${fertilizers.length} fertilizers and ${pesticides.length} pesticides from referenced sources.`);
}

main().finally(() => prisma.$disconnect());
