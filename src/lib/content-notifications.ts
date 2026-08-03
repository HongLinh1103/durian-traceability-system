import { prisma } from "@/lib/prisma";

export const NEW_DOCUMENT_TYPE = "NEW_DOCUMENT:";
export const NEW_NEWS_TYPE = "NEW_NEWS:";

export async function notifyPublishedContent(
    kind: "document" | "news",
    content: { id: string; title: string },
) {
    const recipients = await prisma.user.findMany({
        where: {
            role: { in: ["FARMER", "AREA_MANAGER"] },
            accountStatus: "APPROVED",
            isApproved: true,
            isLocked: false,
            deletedAt: null,
        },
        select: { id: true },
    });

    if (recipients.length === 0) return;

    const isDocument = kind === "document";
    await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
            userId: recipient.id,
            title: isDocument ? "Có tài liệu mới" : "Có tin tức mới",
            message: `${isDocument ? "Tài liệu" : "Tin tức"} mới được đăng tải: ${content.title}`,
            type: `${isDocument ? NEW_DOCUMENT_TYPE : NEW_NEWS_TYPE}${content.id}`,
        })),
    });
}

export function getContentId(type: string, prefix: string) {
    return type.startsWith(prefix) ? type.slice(prefix.length) : null;
}

export async function markContentAsRead(userId: string, kind: "document" | "news", contentId: string) {
    const prefix = kind === "document" ? NEW_DOCUMENT_TYPE : NEW_NEWS_TYPE;
    return prisma.notification.updateMany({
        where: { userId, isRead: false, type: `${prefix}${contentId}` },
        data: { isRead: true },
    });
}
