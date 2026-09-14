/**
 * Hệ thống định danh Chuẩn Quốc gia cho Vùng trồng (PUC) & Cơ sở đóng gói (PHC)
 * 
 * Quy định cấu trúc:
 * - Vùng trồng: [Mã tỉnh - PUC - Cây trồng - YYYYY]
 * - Cơ sở đóng gói: [Mã tỉnh - PHC - Cây trồng - YYYYY]
 * - Nước nhập khẩu phê duyệt: Gắn thêm 3 ký tự ISO 3166:
 *   [Mã tỉnh - PUC/PHC - Cây trồng - YYYYY - ISO]
 * 
 * Căn cứ pháp lý:
 * - Quyết định 19/2025/QĐ-TTg ngày 30/6/2025 của Thủ tướng Chính phủ về danh mục và mã số các đơn vị hành chính Việt Nam.
 * - Danh mục mã định danh cây trồng của Bộ Nông nghiệp & Phát triển Nông thôn / Bộ Nông nghiệp & Môi trường.
 * - Bảng mã quốc gia ISO 3166-1 alpha-3.
 */

import { prisma } from "@/lib/prisma";

// =============================================================================
// 1. BẢNG MÃ TỈNH / THÀNH PHỐ THEO QUYẾT ĐỊNH 19/2025/QĐ-TTg
// =============================================================================
export const PROVINCE_ADMIN_CODES: Record<string, string> = {
    "Hà Nội": "01",
    "Hà Giang": "02",
    "Cao Bằng": "04",
    "Bắc Kạn": "06",
    "Tuyên Quang": "08",
    "Lào Cai": "10",
    "Điện Biên": "11",
    "Lai Châu": "12",
    "Sơn La": "14",
    "Yên Bái": "15",
    "Hòa Bình": "17",
    "Thái Nguyên": "19",
    "Lạng Sơn": "20",
    "Quảng Ninh": "22",
    "Bắc Giang": "24",
    "Phú Thọ": "25",
    "Vĩnh Phúc": "26",
    "Bắc Ninh": "27",
    "Hải Dương": "30",
    "Hải Phòng": "31",
    "Hưng Yên": "33",
    "Thái Bình": "34",
    "Hà Nam": "35",
    "Nam Định": "36",
    "Ninh Bình": "37",
    "Thanh Hóa": "38",
    "Nghệ An": "40",
    "Hà Tĩnh": "42",
    "Quảng Bình": "44",
    "Quảng Trị": "45",
    "Thừa Thiên Huế": "46",
    "Đà Nẵng": "48",
    "Quảng Nam": "49",
    "Quảng Ngãi": "51",
    "Bình Định": "52",
    "Phú Yên": "54",
    "Khánh Hòa": "56",
    "Ninh Thuận": "58",
    "Bình Thuận": "60",
    "Kon Tum": "62",
    "Gia Lai": "64",
    "Đắk Lắk": "66",
    "Đắk Nông": "67",
    "Lâm Đồng": "68",
    "Bình Phước": "70",
    "Tây Ninh": "72",
    "Bình Dương": "74",
    "Đồng Nai": "75",
    "Bà Rịa - Vũng Tàu": "77",
    "TP. Hồ Chí Minh": "79",
    "Thành phố Hồ Chí Minh": "79",
    "Hồ Chí Minh": "79",
    "Thành phố Hà Nội": "01",
    "Thành phố Hải Phòng": "31",
    "Thành phố Đà Nẵng": "48",
    "Thành phố Cần Thơ": "92",
    "Long An": "80",
    "Tiền Giang": "82",
    "Bến Tre": "83",
    "Trà Vinh": "84",
    "Vĩnh Long": "86",
    "Đồng Tháp": "87",
    "An Giang": "89",
    "Kiên Giang": "91",
    "Cần Thơ": "92",
    "Hậu Giang": "93",
    "Sóc Trăng": "94",
    "Bạc Liêu": "95",
    "Cà Mau": "96",
};

// Chuẩn hóa tên tỉnh để tra cứu mã (bỏ dấu cách, chuyển thường, xử lý alias)
const PROVINCE_ALIAS_MAP: Record<string, string> = {
    "hanoi": "01",
    "tp hanoi": "01",
    "tp. hanoi": "01",
    "thanh pho ha noi": "01",
    "thanhphohanoi": "01",
    "hagiang": "02",
    "caobang": "04",
    "backan": "06",
    "bac kan": "06",
    "tuyenquang": "08",
    "laocai": "10",
    "dienbien": "11",
    "laichau": "12",
    "sonla": "14",
    "yenbai": "15",
    "hoabinh": "17",
    "thainguyen": "19",
    "langson": "20",
    "quangninh": "22",
    "bacgiang": "24",
    "phutho": "25",
    "vinhphuc": "26",
    "bacninh": "27",
    "haiduong": "30",
    "haiphong": "31",
    "tp haiphong": "31",
    "hungyen": "33",
    "thaibinh": "34",
    "hanam": "35",
    "namdinh": "36",
    "ninhbinh": "37",
    "thanhhoa": "38",
    "nghean": "40",
    "hatinh": "42",
    "quangbinh": "44",
    "quangtri": "45",
    "thuathienhue": "46",
    "thua thien hue": "46",
    "hue": "46",
    "danang": "48",
    "tp danang": "48",
    "quangnam": "49",
    "quangngai": "51",
    "binhdinh": "52",
    "phuyen": "54",
    "khanhhoa": "56",
    "ninhthuan": "58",
    "binhthuan": "60",
    "kontum": "62",
    "gialai": "64",
    "daklak": "66",
    "dac lac": "66",
    "dak lak": "66",
    "daknong": "67",
    "dac nong": "67",
    "dak nong": "67",
    "lamdong": "68",
    "lam dong": "68",
    "binhphuoc": "70",
    "binh phuoc": "70",
    "tayninh": "72",
    "tay ninh": "72",
    "binhduong": "74",
    "binh duong": "74",
    "dongnai": "75",
    "dong nai": "75",
    "bariavungtau": "77",
    "ba ria - vung tau": "77",
    "ba ria vung tau": "77",
    "vung tau": "77",
    "tphochiminh": "79",
    "thanhphohochiminh": "79",
    "thanh pho ho chi minh": "79",
    "tp. ho chi minh": "79",
    "tp ho chi minh": "79",
    "ho chi minh": "79",
    "tphcm": "79",
    "hcm": "79",
    "sai gon": "79",
    "saigon": "79",
    "longan": "80",
    "long an": "80",
    "tiengiang": "82",
    "tien giang": "82",
    "bentre": "83",
    "ben tre": "83",
    "travinh": "84",
    "tra vinh": "84",
    "vinhlong": "86",
    "vinh long": "86",
    "dongthap": "87",
    "dong thap": "87",
    "angiang": "89",
    "an giang": "89",
    "kiengiang": "91",
    "kien giang": "91",
    "cantho": "92",
    "tp can tho": "92",
    "can tho": "92",
    "haugiang": "93",
    "hau giang": "93",
    "soctrang": "94",
    "soc trang": "94",
    "baclieu": "95",
    "bac lieu": "95",
    "camau": "96",
    "ca mau": "96",
};

// Map ngược từ mã tỉnh (2 số) sang tên tỉnh chính thức
export const ADMIN_CODE_TO_PROVINCE: Record<string, string> = Object.entries(
    PROVINCE_ADMIN_CODES,
).reduce<Record<string, string>>((acc, [province, code]) => {
    acc[code] = province;
    return acc;
}, {});

/**
 * Lấy mã số 2 chữ số của tỉnh theo QĐ 19/2025/QĐ-TTg.
 */
export function getProvinceCode(provinceNameOrCode?: string | null): string {
    if (!provinceNameOrCode) return "75"; // Mặc định Đồng Nai (nơi triển khai chính)
    const trimmed = provinceNameOrCode.trim();

    // Nếu người dùng đã nhập mã 2 số hợp lệ (ví dụ: "75", "66", "82")
    if (/^\d{2}$/.test(trimmed) && ADMIN_CODE_TO_PROVINCE[trimmed]) {
        return trimmed;
    }

    if (PROVINCE_ADMIN_CODES[trimmed]) {
        return PROVINCE_ADMIN_CODES[trimmed];
    }

    const normalized = trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    return PROVINCE_ALIAS_MAP[normalized] || "75";
}

/**
 * Lấy tên tỉnh chính thức từ mã số tỉnh 2 chữ số.
 */
export function getProvinceNameByCode(code: string): string | null {
    return ADMIN_CODE_TO_PROVINCE[code] || null;
}

// =============================================================================
// 2. BẢNG MÃ CÂY TRỒNG (BỘ NÔNG NGHIỆP & PHÁT TRIỂN NÔNG THÔN / CỤC BVTV)
// =============================================================================
export const CROP_CODES: Record<string, { code: string; name: string }> = {
    "SR": { code: "SR", name: "Sầu riêng" },
    "CH": { code: "CH", name: "Chuối" },
    "TL": { code: "TL", name: "Thanh long" },
    "XO": { code: "XO", name: "Xoài" },
    "MI": { code: "MI", name: "Mít" },
    "BU": { code: "BU", name: "Bưởi" },
    "NH": { code: "NH", name: "Nhãn" },
    "VB": { code: "VB", name: "Vải" },
    "CC": { code: "CC", name: "Chôm chôm" },
    "CL": { code: "CL", name: "Chanh leo" },
    "DH": { code: "DH", name: "Dưa hấu" },
    "DU": { code: "DU", name: "Dừa" },
    "MC": { code: "MC", name: "Măng cụt" },
    "OT": { code: "OT", name: "Ớt" },
    "KL": { code: "KL", name: "Khoai lang" },
    "TD": { code: "TD", name: "Thạch đen" },
    "CA": { code: "CA", name: "Chanh" },
    "CM": { code: "CM", name: "Cam" },
    "NA": { code: "NA", name: "Mãng cầu" },
    "BO": { code: "BO", name: "Bơ" },
};

/**
 * Chuẩn hóa và lấy mã cây trồng (mặc định "SR" - Sầu riêng).
 */
export function getCropCode(cropTypeOrName?: string | null): string {
    if (!cropTypeOrName) return "SR";
    const trimmed = cropTypeOrName.trim().toUpperCase();

    // Nếu đã là mã cây trồng hợp lệ (ví dụ: "SR", "CH", "TL")
    if (CROP_CODES[trimmed]) return trimmed;

    const normalized = cropTypeOrName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    if (normalized.includes("saurien") || normalized.includes("durian") || normalized.includes("sau rieng")) return "SR";
    if (normalized.includes("chuoi") || normalized.includes("banana")) return "CH";
    if (normalized.includes("thanhlong") || normalized.includes("dragon")) return "TL";
    if (normalized.includes("xoai") || normalized.includes("mango")) return "XO";
    if (normalized.includes("mit") || normalized.includes("jackfruit")) return "MI";
    if (normalized.includes("buoi") || normalized.includes("pomelo")) return "BU";
    if (normalized.includes("nhan") || normalized.includes("longan")) return "NH";
    if (normalized.includes("vai") || normalized.includes("lychee")) return "VB";
    if (normalized.includes("chomchom") || normalized.includes("rambutan")) return "CC";
    if (normalized.includes("chanhleo") || normalized.includes("passion")) return "CL";
    if (normalized.includes("duahau") || normalized.includes("watermelon")) return "DH";
    if (normalized.includes("dua") || normalized.includes("coconut")) return "DU";
    if (normalized.includes("mangcut") || normalized.includes("mangosteen")) return "MC";
    if (normalized.includes("ot") || normalized.includes("chili")) return "OT";
    if (normalized.includes("khoailang") || normalized.includes("sweetpotato")) return "KL";

    // Nếu có mã dạng 2-4 ký tự in hoa, sử dụng trực tiếp
    if (/^[A-Z0-9]{2,5}$/.test(trimmed)) return trimmed;

    return "SR";
}

export function getCropNameByCode(code: string): string {
    return CROP_CODES[code.toUpperCase()]?.name || code;
}

// =============================================================================
// 3. BẢNG MÃ NƯỚC NHẬP KHẨU ISO 3166-1 ALPHA-3
// =============================================================================
export const ISO_3166_COUNTRIES: Record<string, string> = {
    "CHN": "Trung Quốc",
    "USA": "Hoa Kỳ",
    "AUS": "Úc",
    "JPN": "Nhật Bản",
    "KOR": "Hàn Quốc",
    "NZL": "New Zealand",
    "SGP": "Singapore",
    "MYS": "Malaysia",
    "THA": "Thái Lan",
    "GBR": "Vương quốc Anh",
    "DEU": "Đức",
    "FRA": "Pháp",
    "RUS": "Nga",
    "CAN": "Canada",
    "TWN": "Đài Loan",
    "EUU": "Liên minh Châu Âu (EU)",
};

/**
 * Tra cứu mã ISO 3166-1 alpha-3 từ tên nước hoặc mã.
 */
export function getCountryIsoCode(countryNameOrCode?: string | null): string | null {
    if (!countryNameOrCode) return null;
    const trimmed = countryNameOrCode.trim().toUpperCase();

    if (/^[A-Z]{3}$/.test(trimmed) && ISO_3166_COUNTRIES[trimmed]) {
        return trimmed;
    }

    const normalized = countryNameOrCode
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    if (normalized.includes("trungquoc") || normalized.includes("china") || normalized.includes("gacc")) return "CHN";
    if (normalized.includes("hoaky") || normalized.includes("my") || normalized.includes("usa") || normalized.includes("unitedstates")) return "USA";
    if (normalized.includes("uc") || normalized.includes("australia")) return "AUS";
    if (normalized.includes("nhatban") || normalized.includes("nhat") || normalized.includes("japan")) return "JPN";
    if (normalized.includes("hanquoc") || normalized.includes("han") || normalized.includes("korea")) return "KOR";
    if (normalized.includes("newzealand")) return "NZL";
    if (normalized.includes("singapore")) return "SGP";
    if (normalized.includes("malaysia")) return "MYS";
    if (normalized.includes("thailan") || normalized.includes("thai")) return "THA";
    if (normalized.includes("anh") || normalized.includes("uk") || normalized.includes("britain")) return "GBR";
    if (normalized.includes("duc") || normalized.includes("germany")) return "DEU";
    if (normalized.includes("phap") || normalized.includes("france")) return "FRA";
    if (normalized.includes("nga") || normalized.includes("russia")) return "RUS";
    if (normalized.includes("canada")) return "CAN";
    if (normalized.includes("dailoan") || normalized.includes("taiwan")) return "TWN";
    if (normalized.includes("eu") || normalized.includes("chauau")) return "EUU";

    if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;

    return null;
}

export function getCountryNameByIso(isoCode: string): string | null {
    return ISO_3166_COUNTRIES[isoCode.toUpperCase()] || null;
}

// =============================================================================
// 4. REGEX & CẤU TRÚC ĐỊNH DANH CHUẨN
// =============================================================================
// Định dạng: [Mã tỉnh - PUC/PHC - Cây trồng - YYYYY] hoặc có thêm [- ISO]
// Ví dụ hợp lệ: 75-PUC-SR-00001, 75-PUC-SR-00001-CHN, 75-PHC-SR-00001, 75-PHC-SR-00001-CHN
export const PUC_PHC_REGEX = /^(\d{2})-(PUC|PHC)-([A-Z0-9]{2,5})-(\d{5})(?:-([A-Z]{3}))?$/i;

export type CodeUnitType = "PUC" | "PHC";

export interface ParsedCodeResult {
    raw: string;
    normalized: string;
    provinceCode: string;
    provinceName: string | null;
    type: CodeUnitType;
    cropCode: string;
    cropName: string;
    sequence: number;
    sequenceStr: string;
    exportMarketIso: string | null;
    exportMarketName: string | null;
    isExportApproved: boolean;
}

/**
 * Chuẩn hóa chuỗi mã (loại bỏ ngoặc vuông, khoảng trắng dư thừa quanh dấu gạch ngang).
 * Ví dụ: "[ 75 - PUC - SR - 00001 ]" -> "75-PUC-SR-00001"
 */
export function normalizeUnitCode(code: string): string {
    return code
        .trim()
        .replace(/^\[\s*/, "")
        .replace(/\s*\]$/, "")
        .replace(/\s*-\s*/g, "-")
        .toUpperCase();
}

/**
 * Kiểm tra xem một chuỗi có tuân thủ đúng định dạng mã Vùng trồng (PUC) hay không.
 */
export function isValidPUCCode(code: string): boolean {
    const clean = normalizeUnitCode(code);
    const match = clean.match(PUC_PHC_REGEX);
    return Boolean(match && match[2].toUpperCase() === "PUC");
}

/**
 * Kiểm tra xem một chuỗi có tuân thủ đúng định dạng mã Cơ sở đóng gói (PHC) hay không.
 */
export function isValidPHCCode(code: string): boolean {
    const clean = normalizeUnitCode(code);
    const match = clean.match(PUC_PHC_REGEX);
    return Boolean(match && match[2].toUpperCase() === "PHC");
}

/**
 * Kiểm tra xem một chuỗi có tuân thủ định dạng chuẩn PUC hoặc PHC.
 */
export function isValidUnitCode(code: string): boolean {
    const clean = normalizeUnitCode(code);
    return PUC_PHC_REGEX.test(clean);
}

/**
 * Phân tích và trích xuất đầy đủ các thành phần của mã PUC / PHC.
 */
export function parseUnitCode(code: string): ParsedCodeResult | null {
    if (!code) return null;
    const normalized = normalizeUnitCode(code);
    const match = normalized.match(PUC_PHC_REGEX);
    if (!match) return null;

    const provinceCode = match[1];
    const type = match[2].toUpperCase() as CodeUnitType;
    const cropCode = match[3].toUpperCase();
    const sequenceStr = match[4];
    const sequence = parseInt(sequenceStr, 10);
    const exportMarketIso = match[5] ? match[5].toUpperCase() : null;

    return {
        raw: code,
        normalized,
        provinceCode,
        provinceName: getProvinceNameByCode(provinceCode),
        type,
        cropCode,
        cropName: getCropNameByCode(cropCode),
        sequence,
        sequenceStr,
        exportMarketIso,
        exportMarketName: exportMarketIso ? getCountryNameByIso(exportMarketIso) : null,
        isExportApproved: Boolean(exportMarketIso),
    };
}

// =============================================================================
// 5. TẠO MÃ ĐỊNH DANH (FORMATTER & GENERATOR)
// =============================================================================

export interface FormatUnitCodeParams {
    province?: string;
    provinceCode?: string;
    cropType?: string | null;
    cropCode?: string | null;
    sequence: number;
    exportMarketIso?: string | null;
    countryIso?: string | null;
}

/**
 * Tạo mã Vùng trồng theo định dạng: [Mã tỉnh - PUC - Cây trồng - YYYYY] hoặc kèm [- ISO]
 * Ví dụ: 75-PUC-SR-00001 hoặc 75-PUC-SR-00001-CHN
 */
export function formatPUCCode({
    province,
    provinceCode,
    cropType = "Sầu riêng",
    cropCode,
    sequence,
    exportMarketIso,
    countryIso,
}: FormatUnitCodeParams): string {
    const pCode = getProvinceCode(provinceCode || province);
    const cCode = getCropCode(cropCode || cropType);
    const seqStr = String(Math.max(1, Math.floor(sequence))).padStart(5, "0");
    const iso = getCountryIsoCode(countryIso || exportMarketIso);

    if (iso) {
        return `${pCode}-PUC-${cCode}-${seqStr}-${iso}`;
    }
    return `${pCode}-PUC-${cCode}-${seqStr}`;
}

/**
 * Tạo mã Cơ sở đóng gói theo định dạng: [Mã tỉnh - PHC - Cây trồng - YYYYY] hoặc kèm [- ISO]
 * Ví dụ: 75-PHC-SR-00001 hoặc 75-PHC-SR-00001-CHN
 */
export function formatPHCCode({
    province,
    provinceCode,
    cropType = "Sầu riêng",
    cropCode,
    sequence,
    exportMarketIso,
    countryIso,
}: FormatUnitCodeParams): string {
    const pCode = getProvinceCode(provinceCode || province);
    const cCode = getCropCode(cropCode || cropType);
    const seqStr = String(Math.max(1, Math.floor(sequence))).padStart(5, "0");
    const iso = getCountryIsoCode(countryIso || exportMarketIso);

    if (iso) {
        return `${pCode}-PHC-${cCode}-${seqStr}-${iso}`;
    }
    return `${pCode}-PHC-${cCode}-${seqStr}`;
}

// =============================================================================
// 6. TRUY VẤN VÀ TÍNH SỐ THỨ TỰ TIẾP THEO TRONG DATABASE (YYYYY)
// =============================================================================

/**
 * Lấy số thứ tự kế tiếp cho mã vùng trồng (PUC) của một tỉnh và loại cây trồng.
 */
export async function getNextPUCSequence(province: string, cropType: string = "Sầu riêng"): Promise<number> {
    const pCode = getProvinceCode(province);
    const cCode = getCropCode(cropType);
    const prefix = `${pCode}-PUC-${cCode}-`;

    try {
        const regions = await prisma.growingRegion.findMany({
            where: {
                code: {
                    startsWith: prefix,
                },
            },
            select: { code: true },
        });

        let maxSeq = 0;
        for (const r of regions) {
            const parsed = parseUnitCode(r.code);
            if (parsed && parsed.sequence > maxSeq) {
                maxSeq = parsed.sequence;
            }
        }
        return maxSeq + 1;
    } catch {
        return 1;
    }
}

/**
 * Lấy số thứ tự kế tiếp cho mã cơ sở đóng gói (PHC) của một tỉnh và loại cây trồng.
 */
export async function getNextPHCSequence(province: string, cropType: string = "Sầu riêng"): Promise<number> {
    const pCode = getProvinceCode(province);
    const cCode = getCropCode(cropType);
    const prefix = `${pCode}-PHC-${cCode}-`;

    try {
        const facilities = await prisma.partnerFacility.findMany({
            where: {
                code: {
                    startsWith: prefix,
                },
            },
            select: { code: true },
        });

        let maxSeq = 0;
        for (const f of facilities) {
            if (!f.code) continue;
            const parsed = parseUnitCode(f.code);
            if (parsed && parsed.sequence > maxSeq) {
                maxSeq = parsed.sequence;
            }
        }
        return maxSeq + 1;
    } catch {
        return 1;
    }
}

/**
 * Gợi ý hoặc chuẩn hóa mã vùng trồng tự động khi tạo mới.
 */
export async function generateNewPUCCode(
    province: string,
    cropType: string = "Sầu riêng",
    exportMarketIso?: string | null,
): Promise<string> {
    const sequence = await getNextPUCSequence(province, cropType);
    return formatPUCCode({ province, cropType, sequence, exportMarketIso });
}

/**
 * Gợi ý hoặc chuẩn hóa mã cơ sở đóng gói tự động khi tạo mới.
 */
export async function generateNewPHCCode(
    province: string,
    cropType: string = "Sầu riêng",
    exportMarketIso?: string | null,
): Promise<string> {
    const sequence = await getNextPHCSequence(province, cropType);
    return formatPHCCode({ province, cropType, sequence, exportMarketIso });
}
