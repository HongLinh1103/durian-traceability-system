import { z } from "zod";

// ─── Constants ─────────────────────────────────────────

export const GACC_STATUS_OPTIONS = [
    { value: "ALLOWED", label: "Được phép" },
    { value: "RESTRICTED", label: "Hạn chế" },
    { value: "PROHIBITED", label: "Bị cấm" },
    { value: "UNKNOWN", label: "Chưa xác định" },
] as const;

export const FERTILIZER_TYPES = [
    "Hữu cơ",
    "Vô cơ",
    "NPK",
    "Vi sinh",
    "Phân bón lá",
    "Trung lượng",
    "Vi lượng",
    "Cải tạo đất",
    "Khác",
] as const;

export const PESTICIDE_CATEGORIES = [
    "Thuốc trừ sâu",
    "Thuốc trừ bệnh",
    "Thuốc trừ cỏ",
    "Thuốc điều hòa sinh trưởng",
    "Thuốc trừ ốc",
    "Thuốc trừ tuyến trùng",
    "Chất hỗ trợ",
    "Khác",
] as const;

// ─── Master Code Pattern ───────────────────────────────

export const masterCodeSchema = z
    .string({ required_error: "Mã không được để trống" })
    .trim()
    .min(1, "Mã không được để trống")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ được chứa chữ cái, số, dấu gạch ngang (-) và gạch dưới (_)");

const imageUrlsSchema = z.preprocess(
    (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [],
    z.array(z.string().url("URL ảnh không hợp lệ")).max(6, "Tối đa 6 ảnh"),
);

// ─── Durian Variety Schema ─────────────────────────────

export const durianVarietySchema = z.object({
    code: masterCodeSchema,
    name: z
        .string({ required_error: "Tên giống không được để trống" })
        .trim()
        .min(1, "Tên giống không được để trống"),
    scientificName: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    description: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    origin: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    averageHarvestDays: z.preprocess(
        (value) => {
            if (value === "" || value === null || value === undefined) return undefined;
            const num = Number(value);
            return Number.isNaN(num) ? undefined : num;
        },
        z
            .number({ invalid_type_error: "Số ngày thu hoạch phải là số" })
            .int("Số ngày thu hoạch phải là số nguyên")
            .positive("Số ngày thu hoạch phải lớn hơn 0")
            .optional(),
    ),
    isActive: z.boolean().default(true),
});

export const durianVarietyUpdateSchema = durianVarietySchema.partial();

export type DurianVarietyInput = z.infer<typeof durianVarietySchema>;
export type DurianVarietyUpdateInput = z.infer<typeof durianVarietyUpdateSchema>;

// ─── Pesticide Schema ──────────────────────────────────

export const gaccStatusSchema = z.enum(["ALLOWED", "RESTRICTED", "PROHIBITED", "UNKNOWN"], {
    required_error: "Vui lòng chọn trạng thái GACC",
    invalid_type_error: "Trạng thái GACC không hợp lệ",
});

export const pesticideBaseSchema = z.object({
    code: masterCodeSchema,
    pesticideName: z.string().trim().optional().or(z.literal("")),
    tradeName: z
        .string({ required_error: "Tên thương mại không được để trống" })
        .trim()
        .min(1, "Tên thương mại không được để trống"),
    activeIngredient: z
        .string({ required_error: "Hoạt chất không được để trống" })
        .trim()
        .min(1, "Hoạt chất không được để trống"),
    concentration: z.string().trim().optional().or(z.literal("")),
    category: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    manufacturer: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    origin: z.string().trim().optional().or(z.literal("")),
    imageUrls: imageUrlsSchema,
    registrationNumber: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    gaccStatus: gaccStatusSchema.default("UNKNOWN"),
    localStatus: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    usagePurpose: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    targetPests: z.string().trim().optional().or(z.literal("")),
    usageInstructions: z.string().trim().optional().or(z.literal("")),
    recommendedDosage: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    safetyWarnings: z.string().trim().optional().or(z.literal("")),
    storageInstructions: z.string().trim().optional().or(z.literal("")),
    phiDays: z.preprocess(
        (value) => {
            if (value === "" || value === null || value === undefined) return undefined;
            const num = Number(value);
            return Number.isNaN(num) ? undefined : num;
        },
        z
            .number({ invalid_type_error: "PHI phải là số" })
            .int("PHI phải là số nguyên")
            .min(0, "PHI không được âm")
            .optional(),
    ),
    notes: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    sourceReference: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    effectiveFrom: z.string().optional().or(z.literal("")),
    effectiveTo: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
});

export const pesticideSchema = pesticideBaseSchema.superRefine((data, ctx) => {
    // Kiểm tra effectiveTo không nhỏ hơn effectiveFrom
    if (data.effectiveFrom && data.effectiveTo) {
        const from = new Date(data.effectiveFrom);
        const to = new Date(data.effectiveTo);
        if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Ngày hết hiệu lực không được nhỏ hơn ngày bắt đầu hiệu lực",
                path: ["effectiveTo"],
            });
        }
    }
});

export const pesticideUpdateSchema = pesticideBaseSchema.partial();

export type PesticideInput = z.infer<typeof pesticideSchema>;
export type PesticideUpdateInput = z.infer<typeof pesticideUpdateSchema>;

// ─── Fertilizer Schema ─────────────────────────────────

export const fertilizerSchema = z.object({
    code: masterCodeSchema,
    name: z
        .string({ required_error: "Tên phân bón không được để trống" })
        .trim()
        .min(1, "Tên phân bón không được để trống"),
    fertilizerType: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    brand: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    manufacturer: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    origin: z.string().trim().optional().or(z.literal("")),
    imageUrls: imageUrlsSchema,
    nutrientComposition: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    mainUses: z.string().trim().optional().or(z.literal("")),
    targetCrops: z.string().trim().optional().or(z.literal("")),
    usageInstructions: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    recommendedDosage: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    applicationMethod: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    safetyWarnings: z.string().trim().optional().or(z.literal("")),
    storageInstructions: z.string().trim().optional().or(z.literal("")),
    sourceReference: z.string().trim().optional().or(z.literal("")),
    notes: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),
    isActive: z.boolean().default(true),
});

export const fertilizerUpdateSchema = fertilizerSchema.partial();

export type FertilizerInput = z.infer<typeof fertilizerSchema>;
export type FertilizerUpdateInput = z.infer<typeof fertilizerUpdateSchema>;

// ─── Query Params Schema ───────────────────────────────

export const masterDataQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "all"]).default("all"),
    sortBy: z.string().default("updatedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

