import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getContentId, NEW_DOCUMENT_TYPE } from "@/lib/content-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const category = url.searchParams.get("category")?.trim() ?? "";

    const documents = await prisma.document.findMany({
        where: {
            status: "PUBLISHED",
            deletedAt: null,
            ...(category ? { category } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { summary: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            category: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            publishedAt: true,
        },
    });

    const categories = await prisma.document.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
    });

    const unreadNotifications = session?.user?.id && ["FARMER", "AREA_MANAGER"].includes(session.user.role)
        ? await prisma.notification.findMany({
            where: { userId: session.user.id, isRead: false, type: { startsWith: NEW_DOCUMENT_TYPE } },
            select: { id: true, type: true },
        })
        : [];
    const visibleDocumentIds = new Set(documents.map((document) => document.id));
    const newIds = unreadNotifications
        .map((notification) => getContentId(notification.type, NEW_DOCUMENT_TYPE))
        .filter((id): id is string => Boolean(id && visibleDocumentIds.has(id)));
    return NextResponse.json({
        success: true,
        data: documents,
        newIds,
        categories: categories.map((item) => item.category),
    });
}
