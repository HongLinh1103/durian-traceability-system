const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("=== B?T Ð?U XÓA D? LI?U TIN T?C VÀ TÀI LI?U C?A ADMIN ===");

    // 1. Xóa thông báo liên quan d?n tin t?c và tài li?u
    try {
        const deletedNotifs = await prisma.notification.deleteMany({
            where: {
                OR: [
                    { type: { startsWith: "new_news" } },
                    { type: { startsWith: "new_document" } },
                    { type: { startsWith: "NEWS" } },
                    { type: { startsWith: "DOCUMENT" } }
                ]
            }
        });
        console.log(`[1/3] Ðã xóa ${deletedNotifs.count} thông báo liên quan d?n tin t?c và tài li?u.`);
    } catch (err) {
        console.warn(`[1/3] Luu ý khi xóa notifications: ${err.message}`);
    }

    // 2. Xóa toàn b? bài vi?t tin t?c (NewsArticle)
    try {
        const deletedNews = await prisma.newsArticle.deleteMany({});
        console.log(`[2/3] Ðã xóa ${deletedNews.count} bài vi?t tin t?c trong b?ng news_articles.`);
    } catch (err) {
        console.warn(`[2/3] Luu ý khi xóa news_articles: ${err.message}`);
    }

    // 3. Xóa toàn b? tài li?u (Document) và các t?p dính kèm v?t lý
    try {
        const deletedDocs = await prisma.document.deleteMany({});
        console.log(`[3/3] Ðã xóa ${deletedDocs.count} tài li?u trong b?ng documents.`);
    } catch (err) {
        console.warn(`[3/3] Luu ý khi xóa documents: ${err.message}`);
    }

    // 4. D?n d?p t?p luu tr? v?t lý trong .storage/documents
    const storageDir = path.join(process.cwd(), ".storage", "documents");
    if (fs.existsSync(storageDir)) {
        const files = fs.readdirSync(storageDir);
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(storageDir, file));
                console.log(`  - Ðã xóa t?p v?t lý: ${file}`);
            } catch (fileErr) {
                console.warn(`  - Không th? xóa t?p ${file}: ${fileErr.message}`);
            }
        }
        console.log(`[OK] Ðã d?n d?p thu m?c luu tr? .storage/documents.`);
    }

    console.log("=== HOÀN T?T XÓA TOÀN B? D? LI?U TIN T?C VÀ TÀI LI?U ===");
}

main()
    .catch((err) => {
        console.error("L?i th?c thi:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
