import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import bcryptjs from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const documentTypes = new Set([...imageTypes, "application/pdf"]);

const regionSchema = z.object({
    code: z.string().trim().min(2, "Vui lòng nhập mã số vùng trồng"),
    name: z.string().trim().min(2, "Vui lòng nhập tên vùng trồng"),
    province: z.string().trim().min(2),
    district: z.string().trim().min(2),
    ward: z.string().trim().min(2),
    areaSize: z.coerce.number().positive(),
    farmerCount: z.coerce.number().int().nonnegative(),
    durianVarieties: z.array(z.string().trim().min(1)).min(1),
});

const applicationSchema = z
    .object({
        fullName: z.string().trim().min(2),
        phone: z.string().trim().regex(/^(0[35789])\d{8}$/, "Số điện thoại không hợp lệ"),
        email: z.string().trim().email("Email không hợp lệ"),
        identityNumber: z.string().trim().regex(/^\d{9}(\d{3})?$/, "CCCD/CMND phải có 9 hoặc 12 số"),
        identityIssuedDate: z.coerce.date().max(new Date(), "Ngày cấp không hợp lệ"),
        identityIssuedPlace: z.string().trim().min(2),
        password: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
        confirmPassword: z.string(),
        organizationName: z.string().trim().min(2),
        taxCode: z.string().trim().optional(),
        position: z.string().trim().min(2),
        officeProvince: z.string().trim().min(2),
        officeDistrict: z.string().trim().min(2),
        officeWard: z.string().trim().min(2),
        officeDetailedAddress: z.string().trim().min(2),
        region: regionSchema,
        confirmation: z.literal("true"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp",
    });

function requiredFile(form: FormData, key: string): File | null {
    const value = form.get(key);
    return value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
    const form = await request.formData();
    let region: unknown;
    try {
        region = JSON.parse(String(form.get("region") ?? ""));
    } catch {
        return NextResponse.json({ success: false, message: "Thông tin vùng trồng không hợp lệ." }, { status: 400 });
    }

    const parsed = applicationSchema.safeParse({
        fullName: form.get("fullName"),
        phone: form.get("phone"),
        email: form.get("email"),
        identityNumber: form.get("identityNumber"),
        identityIssuedDate: form.get("identityIssuedDate"),
        identityIssuedPlace: form.get("identityIssuedPlace"),
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
        organizationName: form.get("organizationName"),
        taxCode: form.get("taxCode"),
        position: form.get("position"),
        officeProvince: form.get("officeProvince"),
        officeDistrict: form.get("officeDistrict"),
        officeWard: form.get("officeWard"),
        officeDetailedAddress: form.get("officeDetailedAddress"),
        region,
        confirmation: form.get("confirmation"),
    });
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message ?? "Hồ sơ không hợp lệ." },
            { status: 400 },
        );
    }

    const identityFront = requiredFile(form, "identityFront");
    const identityBack = requiredFile(form, "identityBack");
    const authorityDocument = requiredFile(form, "authorityDocument");
    if (!identityFront || !identityBack || !authorityDocument) {
        return NextResponse.json({ success: false, message: "Vui lòng tải đủ hai mặt CCCD và giấy tờ chứng minh thẩm quyền." }, { status: 400 });
    }
    if (
        !imageTypes.has(identityFront.type) ||
        !imageTypes.has(identityBack.type) ||
        !documentTypes.has(authorityDocument.type) ||
        [identityFront, identityBack, authorityDocument].some((file) => file.size > MAX_FILE_SIZE)
    ) {
        return NextResponse.json({ success: false, message: "Tệp không hợp lệ. Ảnh dùng JPG/PNG/WEBP; giấy tờ dùng ảnh hoặc PDF, tối đa 10 MB/tệp." }, { status: 400 });
    }

    const data = parsed.data;
    const duplicate = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: data.phone },
                { email: data.email.toLowerCase() },
                { areaManagerApplication: { identityNumber: data.identityNumber } },
            ],
        },
        select: { id: true },
    });
    if (duplicate) {
        return NextResponse.json({ success: false, message: "Số điện thoại, email hoặc CCCD đã được đăng ký." }, { status: 409 });
    }

    const uploadDirectory = path.join(process.cwd(), ".storage", "area-manager-applications");
    await mkdir(uploadDirectory, { recursive: true });
    const storedFiles = [
        { file: identityFront, key: `${randomUUID()}${path.extname(identityFront.name).toLowerCase() || ".jpg"}` },
        { file: identityBack, key: `${randomUUID()}${path.extname(identityBack.name).toLowerCase() || ".jpg"}` },
        { file: authorityDocument, key: `${randomUUID()}${path.extname(authorityDocument.name).toLowerCase() || ".bin"}` },
    ];

    try {
        await Promise.all(
            storedFiles.map(async ({ file, key }) =>
                writeFile(path.join(uploadDirectory, key), Buffer.from(await file.arrayBuffer())),
            ),
        );
        const password = await bcryptjs.hash(data.password, 10);
        const user = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    fullName: data.fullName,
                    phone: data.phone,
                    email: data.email.toLowerCase(),
                    password,
                    role: "AREA_MANAGER",
                    address: data.officeDetailedAddress,
                    province: data.officeProvince,
                    district: data.officeDistrict,
                    ward: data.officeWard,
                    accountStatus: "PENDING",
                    isApproved: false,
                    areaManagerApplication: {
                        create: {
                            identityNumber: data.identityNumber,
                            identityIssuedDate: data.identityIssuedDate,
                            identityIssuedPlace: data.identityIssuedPlace,
                            identityFrontKey: storedFiles[0].key,
                            identityBackKey: storedFiles[1].key,
                            organizationName: data.organizationName,
                            taxCode: data.taxCode || null,
                            position: data.position,
                            officeProvince: data.officeProvince,
                            officeDistrict: data.officeDistrict,
                            officeWard: data.officeWard,
                            officeDetailedAddress: data.officeDetailedAddress,
                            authorityDocumentKey: storedFiles[2].key,
                            managedRegions: data.region,
                        },
                    },
                },
                select: { id: true, fullName: true },
            });
            const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
            await tx.approvalHistory.create({
                data: { subjectId: created.id, actorId: created.id, action: "SUBMITTED", toStatus: "PENDING" },
            });
            if (admins.length) {
                await tx.notification.createMany({
                    data: admins.map((admin) => ({
                        userId: admin.id,
                        title: "Hồ sơ Trưởng BQL vùng trồng mới",
                        message: `${created.fullName} đã gửi hồ sơ đăng ký Trưởng ban quản lý vùng trồng.`,
                        type: "ACCOUNT_APPROVAL",
                    })),
                });
            }
            return created;
        });
        return NextResponse.json({ success: true, message: "Gửi hồ sơ đăng ký thành công.", data: user }, { status: 201 });
    } catch (error) {
        await Promise.all(storedFiles.map(({ key }) => rm(path.join(uploadDirectory, key), { force: true })));
        console.error("Area manager registration failed:", error);
        return NextResponse.json({ success: false, message: "Không thể lưu hồ sơ. Vui lòng thử lại." }, { status: 500 });
    }
}
