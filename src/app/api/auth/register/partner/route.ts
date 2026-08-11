import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { partnerRegistrationSchema } from "@/lib/partner";

export async function POST(request: Request) {
    const limit = checkRateLimit(`partner-register:${getClientIp(request)}`, 5, 60_000);
    if (!limit.allowed) return NextResponse.json({ success: false, message: "Thao tác quá nhanh." }, { status: 429 });
    const parsed = partnerRegistrationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    const data = parsed.data;
    const exists = await prisma.user.findFirst({ where: { OR: [{ phone: data.representativePhone }, ...(data.representativeEmail ? [{ email: data.representativeEmail }] : [])] } });
    if (exists) return NextResponse.json({ success: false, message: "Số điện thoại hoặc email đã tồn tại." }, { status: 409 });
    const user = await prisma.user.create({ data: {
        phone: data.representativePhone, email: data.representativeEmail || null, fullName: data.representativeName,
        password: await hashPassword(data.password), role: data.type, accountStatus: "PENDING", isApproved: false,
        partnerFacility: { create: {
            type: data.type, representativeName: data.representativeName, representativePhone: data.representativePhone,
            representativeEmail: data.representativeEmail || null, identityNumber: data.identityNumber,
            identityIssuedDate: data.identityIssuedDate ? new Date(data.identityIssuedDate) : null, identityIssuedPlace: data.identityIssuedPlace || null,
            name: data.name, organizationType: data.organizationType, taxCode: data.taxCode || null, businessCode: data.businessCode || null,
            phone: data.phone, email: data.email || null, website: data.website || null, address: data.address, province: data.province,
            ward: data.ward || null, contactPerson: data.contactPerson || null, purchasingAreas: data.purchasingAreas,
            processingTypes: data.type === "PROCESSING_FACILITY" ? data.processingTypes : [], expectedCapacity: data.expectedCapacity,
            capacityUnit: data.capacityUnit || null, description: data.description || null, status: "PENDING",
        } },
    } });
    return NextResponse.json({ success: true, userId: user.id, message: "Hồ sơ đã được gửi đến Admin." }, { status: 201 });
}
