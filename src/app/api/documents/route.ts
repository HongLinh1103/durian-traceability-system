import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    return NextResponse.json({
        success: true,
        data: documents,
        categories: categories.map((item) => item.category),
    });
}
