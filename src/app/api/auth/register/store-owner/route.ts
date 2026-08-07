import path from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { storeProfileSchema } from "@/lib/store-marketplace";

export const runtime = "nodejs";
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
    const limit = checkRateLimit(`store-register:${getClientIp(request)}`, 5, 60_000);
    if (!limit.allowed) return NextResponse.json({ success: false, message: "Thao tác quá nhanh, vui lòng thử lại sau." }, { status: 429 });
    const form = await request.formData();
    const profile = storeProfileSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
    const password = String(form.get("password") || "");
    if (!profile.success || password.length < 6) return NextResponse.json({ success: false, message: profile.error?.issues[0]?.message || "Mật khẩu tối thiểu 6 ký tự." }, { status: 400 });
    const required = form.get("businessRegistration");
    if (!(required instanceof File) || !required.size) return NextResponse.json({ success: false, message: "Cần tải giấy đăng ký kinh doanh." }, { status: 400 });
    const signboard = form.get("signboardImage");
    if (!(signboard instanceof File) || !signboard.size || !["image/jpeg", "image/png"].includes(signboard.type) || signboard.size > 10 * 1024 * 1024) return NextResponse.json({ success: false, message: "Cần tải ảnh biển hiệu JPG/PNG, tối đa 10 MB." }, { status: 400 });
    const files = [
        { file: required, type: "BUSINESS_REGISTRATION" as const },
        { file: form.get("pesticideLicense"), type: "PESTICIDE_TRADING_LICENSE" as const },
        { file: form.get("specializedDocument"), type: "SPECIALIZED_DOCUMENT" as const },
    ].filter((x): x is { file: File; type: "BUSINESS_REGISTRATION" | "PESTICIDE_TRADING_LICENSE" | "SPECIALIZED_DOCUMENT" } => x.file instanceof File && x.file.size > 0);
    if (files.some(({ file }) => file.size > 10 * 1024 * 1024 || !allowedTypes.has(file.type))) return NextResponse.json({ success: false, message: "Giấy tờ chỉ nhận PDF/JPG/PNG, tối đa 10 MB mỗi file." }, { status: 400 });
    const directory = path.join(process.cwd(), ".storage", "store-documents");
    await mkdir(directory, { recursive: true });
    const stored: { key: string; file: File; type: typeof files[number]["type"] }[] = [];
    let signboardKey = "";
    try {
        signboardKey = `${Date.now()}-${crypto.randomUUID()}${path.extname(signboard.name).toLowerCase()}`;
        await writeFile(path.join(directory, signboardKey), Buffer.from(await signboard.arrayBuffer()));
        for (const item of files) {
            const key = `${Date.now()}-${crypto.randomUUID()}${path.extname(item.file.name).toLowerCase()}`;
            await writeFile(path.join(directory, key), Buffer.from(await item.file.arrayBuffer()));
            stored.push({ ...item, key });
        }
        const user = await prisma.$transaction(async (tx) => {
            const existing = await tx.user.findFirst({ where: { OR: [{ phone: profile.data.representativePhone }, ...(profile.data.representativeEmail ? [{ email: profile.data.representativeEmail }] : [])] } });
            if (existing) throw new Error("PHONE_OR_EMAIL_EXISTS");
            return tx.user.create({ data: {
                phone: profile.data.representativePhone, email: profile.data.representativeEmail || null, fullName: profile.data.representativeName,
                password: await hashPassword(password), role: "STORE_OWNER", accountStatus: "PENDING", isApproved: false,
                stores: { create: { ...profile.data, representativeEmail: profile.data.representativeEmail || null, signboardImageKey: signboardKey, status: "PENDING_REVIEW", submittedAt: new Date(), documents: { create: stored.map(({ key, file, type }) => ({ type, name: file.name, storageKey: key, mimeType: file.type, fileSize: file.size, issuedAt: form.get("issuedAt") ? new Date(String(form.get("issuedAt"))) : null, expiresAt: form.get("expiresAt") ? new Date(String(form.get("expiresAt"))) : null, issuingAuthority: String(form.get("issuingAuthority") || "") || null })) } } },
            } });
        });
        return NextResponse.json({ success: true, userId: user.id, message: "Hồ sơ cửa hàng đã được gửi đến Admin." }, { status: 201 });
    } catch (error) {
        await Promise.all([...stored.map(({ key }) => key), signboardKey].filter(Boolean).map((key) => rm(path.join(directory, key), { force: true })));
        return NextResponse.json({ success: false, message: error instanceof Error && error.message === "PHONE_OR_EMAIL_EXISTS" ? "Số điện thoại hoặc email đã tồn tại." : "Không thể tạo hồ sơ cửa hàng." }, { status: 400 });
    }
}
