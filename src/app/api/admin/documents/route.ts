import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPublishedContent } from "@/lib/content-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"]);
const MIME_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain; charset=utf-8",
};

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN" ? session : null;
}

function createSlug(title: string) {
    const base = title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLowerCase()
        .replace(/đ/gu, "d")
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")
        .slice(0, 80);
    return `${base || "tai-lieu"}-${Date.now().toString(36)}`;
}

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            status: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            createdAt: true,
            deletedAt: true,
        },
    });
    return NextResponse.json({ success: true, data: documents });
}

export async function POST(request: Request) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ success: false, message: "Chỉ ADMIN được tải tài liệu." }, { status: 403 });
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "Tài liệu").trim() || "Tài liệu";
    const publishValue = formData.get("publish");
    const publish = publishValue === null || publishValue === "true";
    const file = formData.get("file");

    if (!title || !(file instanceof File)) {
        return NextResponse.json({ success: false, message: "Vui lòng nhập tiêu đề và chọn tệp." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, message: "Tệp phải có dung lượng từ 1 byte đến 20 MB." }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
        return NextResponse.json({ success: false, message: "Chỉ hỗ trợ PDF, Word, Excel, PowerPoint và TXT." }, { status: 400 });
    }

    const storageName = `${randomUUID()}${extension}`;
    const slug = createSlug(title);
    const uploadDirectory = path.join(process.cwd(), ".storage", "documents");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storageName), Buffer.from(await file.arrayBuffer()));

    const document = await prisma.document.create({
        data: {
            title,
            slug,
            category,
            status: publish ? "PUBLISHED" : "DRAFT",
            fileName: path.basename(file.name),
            fileUrl: `/api/documents/${encodeURIComponent(slug)}/download`,
            storageKey: storageName,
            mimeType: MIME_TYPES[extension] || file.type || "application/octet-stream",
            fileSize: file.size,
            uploaderId: session.user.id,
            publishedAt: publish ? new Date() : null,
        },
    });

    if (publish) await notifyPublishedContent("document", document);

    return NextResponse.json({ success: true, data: document }, { status: 201 });
}
