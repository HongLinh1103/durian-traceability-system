import { NextResponse } from "next/server";
import { sendChinaPortNewRecordsEmail, getAdminEmailRecipients, ChinaPortRecordEmailItem } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { recipient, sampleCount = 3 } = body;

        const targetRecipients = recipient ? [recipient] : await getAdminEmailRecipients();

        // Sample Vietnam GACC records for preview
        const sampleRecords: ChinaPortRecordEmailItem[] = [
            {
                countryCode: "704",
                countryNameEn: "Viet Nam",
                countryNameCn: "越南",
                provinceNameEn: "Dong Thap, Viet Nam",
                provinceNameCn: "同塔（越南）",
                prodTypeNameEn: "Fresh fruits",
                prodTypeNameCn: "新鲜水果",
                prodCategoryNameEn: "Fresh fruits",
                corpTypeNameEn: "Production",
                corpTypeNameCn: "生产型",
                prodNameEn: "Durian",
                prodNameCn: "榴莲",
                prodNameLa: "Durio zibethinus",
                chinaRegNo: "QVNM1425052000371",
                overseasOfficialRegNo: "VN - DTOR - 0574",
                corpNameEn: "Tan Huu Durian growing area No. 1",
                validFrom: "2025-05-20",
                validTo: "2999-12-31",
                regState: "1",
            },
            {
                countryCode: "704",
                countryNameEn: "Viet Nam",
                countryNameCn: "越南",
                provinceNameEn: "Tien Giang, Viet Nam",
                provinceNameCn: "前江（越南）",
                prodTypeNameEn: "Fresh fruits",
                prodTypeNameCn: "新鲜水果",
                prodCategoryNameEn: "Fresh fruits",
                corpTypeNameEn: "Packaging and processing",
                corpTypeNameCn: "包装加工型",
                prodNameEn: "Durian",
                prodNameCn: "榴莲",
                chinaRegNo: "QVNM1425052000372",
                overseasOfficialRegNo: "VN - TGPH - 0219",
                corpNameEn: "Tien Giang Tropical Fruits Export Packaging Facility",
                validFrom: "2025-06-01",
                validTo: "2030-06-01",
                regState: "1",
            },
            {
                countryCode: "704",
                countryNameEn: "Viet Nam",
                countryNameCn: "越南",
                provinceNameEn: "Dak Lak, Viet Nam",
                provinceNameCn: "多乐（越南）",
                prodTypeNameEn: "Fresh fruits",
                prodTypeNameCn: "新鲜水果",
                prodCategoryNameEn: "Fresh fruits",
                corpTypeNameEn: "Production",
                corpTypeNameCn: "生产型",
                prodNameEn: "Durian",
                prodNameCn: "榴莲",
                chinaRegNo: "QVNM1425052000373",
                overseasOfficialRegNo: "VN - DLOR - 0188",
                corpNameEn: "Krong Pac Durian Cooperative Area 3",
                validFrom: "2025-07-15",
                validTo: "2030-07-15",
                regState: "1",
            },
        ].slice(0, Math.max(1, Math.min(10, sampleCount)));

        const result = await sendChinaPortNewRecordsEmail(sampleRecords, targetRecipients);

        return NextResponse.json({
            code: result.success ? 200 : 500,
            message: result.success
                ? `Đã gửi thử nghiệm email thành công tới: ${targetRecipients.join(", ")}`
                : result.error || "Gửi email thất bại",
            data: result,
        });
    } catch (error: any) {
        console.error("Test email error:", error);
        return NextResponse.json(
            { code: 500, message: error.message || "Lỗi khi gửi email thử nghiệm" },
            { status: 500 }
        );
    }
}
