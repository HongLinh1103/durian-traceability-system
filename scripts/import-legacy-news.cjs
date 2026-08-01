const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { PrismaClient } = require("@prisma/client");

const sourcePath = path.join(__dirname, "..", "src", "data", "news-data.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const dataModule = { exports: {} };
new Function("exports", "module", "require", compiled)(dataModule.exports, dataModule, require);
const newsArticles = dataModule.exports.newsArticles;
const prisma = new PrismaClient();

function parseVietnameseDate(value) {
    const [day, month, year] = value.split("/").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
    let imported = 0;
    let existing = 0;
    for (const item of newsArticles) {
        const found = await prisma.newsArticle.findUnique({ where: { originalUrl: item.url }, select: { id: true } });
        if (found) { existing += 1; continue; }
        const publishedAt = parseVietnameseDate(item.publishedAt);
        await prisma.newsArticle.create({
            data: {
                title: item.title,
                description: item.summary,
                imageUrl: item.image,
                sourceName: item.source,
                originalUrl: item.url,
                sourcePublishedAt: publishedAt,
                status: "PUBLISHED",
                publishedAt,
            },
        });
        imported += 1;
    }
    console.log(`Imported ${imported} legacy articles; ${existing} already existed.`);
}

main()
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(async () => prisma.$disconnect());
