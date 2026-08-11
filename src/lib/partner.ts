import { z } from "zod";

export const partnerRegistrationSchema = z.object({
    type: z.enum(["COLLECTOR", "PROCESSING_FACILITY"]),
    representativeName: z.string().trim().min(2), representativePhone: z.string().trim().min(9),
    representativeEmail: z.string().trim().email().optional().or(z.literal("")), password: z.string().min(6),
    identityNumber: z.string().trim().min(9), identityIssuedDate: z.string().optional(), identityIssuedPlace: z.string().trim().optional(),
    name: z.string().trim().min(2), organizationType: z.string().trim().min(2), taxCode: z.string().trim().optional(), businessCode: z.string().trim().optional(),
    phone: z.string().trim().min(9), email: z.string().trim().email().optional().or(z.literal("")), website: z.string().trim().optional(),
    address: z.string().trim().min(5), province: z.string().trim().min(2), ward: z.string().trim().optional(),
    contactPerson: z.string().trim().optional(), purchasingAreas: z.array(z.string()).default([]), processingTypes: z.array(z.string()).default([]),
    expectedCapacity: z.coerce.number().positive().optional(), capacityUnit: z.string().trim().optional(), description: z.string().trim().optional(),
});

export const partnerStatusLabels: Record<string, string> = {
    DRAFT: "Nháp", PENDING: "Chờ duyệt", NEED_SUPPLEMENT: "Cần bổ sung", APPROVED: "Đã duyệt",
    REJECTED: "Từ chối", SUSPENDED: "Tạm khóa",
};
