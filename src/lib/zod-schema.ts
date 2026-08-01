import { z } from "zod";
import { activityTypes, growthStages, qualityGrades } from "@/lib/constants";
import { isValidVietnameseDate } from "@/lib/date-format";

const passwordPolicy = z
    .string()
    .min(4, "Mật khẩu phải có ít nhất 4 ký tự");

// Số điện thoại Việt Nam: 10-11 số, bắt đầu bằng 0
const vietnamPhoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})\b$/;

export const loginSchema = z.object({
    identifier: z.string().trim().min(1, "Nhập số điện thoại hoặc email"),
    password: z.string().min(1, "Nhập mật khẩu"),
    rememberMe: z.boolean().default(false),
});

const optionalCoordinate = z.preprocess(
    (value) =>
        value === "" || value === null || value === undefined
            ? undefined
            : Number(value),
    z.number().finite().optional(),
);

export const farmRegistrationSchema = z.object({
    farmName: z.string().trim().min(2, "Vui lòng nhập tên vườn"),
    province: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
    district: z.string().trim().min(2, "Vui lòng nhập quận/huyện"),
    ward: z.string().trim().min(2, "Vui lòng nhập xã/phường"),
    detailedAddress: z.string().trim().min(2, "Vui lòng nhập địa chỉ chi tiết"),
    areaSize: z.coerce.number().positive("Diện tích phải lớn hơn 0"),
    areaUnit: z.enum(["HECTARE", "SQUARE_METER"]),
    totalTrees: z.coerce.number().int().nonnegative("Số cây không được âm"),
    durianVarieties: z
        .array(z.string().trim().min(1))
        .min(1, "Chọn ít nhất một giống sầu riêng"),
    latitude: optionalCoordinate.refine(
        (value) => value === undefined || (value >= -90 && value <= 90),
        "Vĩ độ không hợp lệ",
    ),
    longitude: optionalCoordinate.refine(
        (value) => value === undefined || (value >= -180 && value <= 180),
        "Kinh độ không hợp lệ",
    ),
    notes: z.string().trim().max(1000).optional().default(""),
    growingRegionCode: z.string().trim().min(1, "Vui lòng nhập mã vùng trồng"),
    growingRegionId: z.string().trim().optional().default(""),
    growingRegionLabel: z.string().trim().optional().default(""),
});

export const farmerRegisterSchema = z
    .object({
        role: z.literal("FARMER").default("FARMER"),
        fullName: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
        phone: z
            .string()
            .trim()
            .regex(vietnamPhoneRegex, "Số điện thoại không hợp lệ (VD: 0912345678)"),
        email: z
            .string()
            .trim()
            .refine(
                (value) =>
                    value === "" || z.string().email().safeParse(value).success,
                "Email không đúng định dạng",
            )
            .optional()
            .default(""),
        password: z
            .string()
            .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
            .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất một chữ cái")
            .regex(/[0-9]/, "Mật khẩu phải có ít nhất một chữ số"),
        confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
        province: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
        district: z.string().trim().min(2, "Vui lòng nhập quận/huyện"),
        ward: z.string().trim().min(2, "Vui lòng nhập xã/phường"),
        detailedAddress: z
            .string()
            .trim()
            .min(2, "Vui lòng nhập địa chỉ cư trú chi tiết"),
        farms: z.array(farmRegistrationSchema).min(1, "Cần khai báo ít nhất một vườn"),
        confirmation: z.boolean().refine(Boolean, "Bạn cần xác nhận thông tin trước khi gửi hồ sơ"),
    })
    .superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mật khẩu xác nhận không khớp",
                path: ["confirmPassword"],
            });
        }
    });

export const legacyRegisterSchema = z
    .object({
        role: z.enum(["FARMER", "AREA_MANAGER", "EXPORTER", "PACKHOUSE_MANAGER"], {
            required_error: "Vui lòng chọn vai trò",
            invalid_type_error: "Vai trò không hợp lệ",
        }),
        fullName: z
            .string({ required_error: "Vui lòng nhập họ và tên" })
            .trim()
            .min(2, "Họ và tên phải có ít nhất 2 ký tự"),
        phone: z
            .string({ required_error: "Vui lòng nhập số điện thoại" })
            .trim()
            .min(10, "Số điện thoại phải có ít nhất 10 số")
            .regex(vietnamPhoneRegex, "Số điện thoại không hợp lệ (VD: 0912345678)"),
        email: z
            .string({ required_error: "Vui lòng nhập email" })
            .trim()
            .email("Email không hợp lệ (VD: ten@domain.com)"),
        address: z
            .string({ required_error: "Vui lòng nhập địa chỉ" })
            .trim()
            .min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
        farmOrPackhouseName: z
            .string({ required_error: "Vui lòng nhập tên vườn/vựa" })
            .trim()
            .min(2, "Tên vườn/vựa phải có ít nhất 2 ký tự"),
        areaSize: z.preprocess(
            (value) => {
                if (value === "" || value === null || value === undefined) {
                    return undefined;
                }
                const num = Number(value);
                return Number.isNaN(num) ? undefined : num;
            },
            z
                .number({
                    required_error: "Vui lòng nhập diện tích",
                    invalid_type_error: "Diện tích phải là một số",
                })
                .positive("Diện tích phải lớn hơn 0"),
        ),
        totalTrees: z.preprocess(
            (value) => {
                if (value === "" || value === null || value === undefined) {
                    return undefined;
                }
                const num = Number(value);
                return Number.isNaN(num) ? undefined : num;
            },
            z
                .number({
                    required_error: "Vui lòng nhập tổng số cây",
                    invalid_type_error: "Số cây phải là một số",
                })
                .int("Số cây phải là số nguyên")
                .nonnegative("Số cây không được âm"),
        ),
        durianVariety: z
            .string({ required_error: "Vui lòng chọn giống sầu riêng" })
            .trim()
            .min(1, "Vui lòng chọn giống sầu riêng"),
        password: passwordPolicy,
        confirmPassword: z.string({ required_error: "Vui lòng xác nhận mật khẩu" }).min(1, "Vui lòng xác nhận mật khẩu"),
    })
    .superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Xác nhận mật khẩu phải trùng khớp với mật khẩu",
                path: ["confirmPassword"],
            });
        }
    });

export const registerSchema = farmerRegisterSchema;

export const resetPasswordSchema = z
    .object({
        password: passwordPolicy,
        confirmPassword: z.string().min(1, "Xác nhận mật khẩu"),
    })
    .superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Xác nhận mật khẩu phải trùng khớp với mật khẩu",
                path: ["confirmPassword"],
            });
        }
    });

export const farmingLogSchema = z.object({
    farmId: z.string().min(1, "Chọn mã MSVT"),
    stage: z.enum(growthStages),
    actionDate: z.string().min(1, "Chọn ngày thực hiện").refine(isValidVietnameseDate, "Ngày phải có định dạng dd/MM/yyyy"),
    actionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có định dạng HH:mm"),
    activityType: z.enum(activityTypes),
    chemicalName: z.string().trim().optional().default(""),
    dosage: z.string().trim().optional().default(""),
    phiDays: z.coerce.number().int().min(0, "PHI không hợp lệ").default(0),
    plannedHarvestDate: z.string().refine(
        (value) => !value || isValidVietnameseDate(value),
        "Ngày phải có định dạng dd/MM/yyyy",
    ).optional(),
    notes: z.string().optional(),
    isGACCCompliant: z.boolean().default(true),
}).superRefine((data, ctx) => {
    if (data.activityType === activityTypes[0]) {
        if (!data.chemicalName) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["chemicalName"], message: "Nhập tên thuốc" });
        }
        if (!data.dosage) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dosage"], message: "Nhập liều lượng" });
        }
    }
    if (data.activityType === activityTypes[1]) {
        if (!data.chemicalName) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["chemicalName"], message: "Nhập tên phân bón" });
        }
        if (!data.dosage) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dosage"], message: "Nhập liều lượng" });
        }
    }
});

export const batchSchema = z.object({
    farmId: z.string().min(1, "Chọn mã MSVT"),
    packhouseId: z.string().min(1, "Chọn cơ sở đóng gói"),
    harvestDate: z.string().min(1, "Chọn ngày thu hoạch"),
    totalWeightKg: z.coerce.number().positive("Khối lượng phải lớn hơn 0"),
    qualityGrade: z.enum(qualityGrades),
    status: z.enum(["DRAFT", "APPROVED", "PACKED", "SHIPPED"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type FarmingLogInput = z.infer<typeof farmingLogSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
