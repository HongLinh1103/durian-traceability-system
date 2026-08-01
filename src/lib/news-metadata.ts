import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

function isPrivateAddress(address: string) {
    const normalized = address.toLowerCase().replace(/^::ffff:/, "");
    return normalized === "::1"
        || normalized === "0.0.0.0"
        || normalized.startsWith("10.")
        || normalized.startsWith("127.")
        || normalized.startsWith("169.254.")
        || normalized.startsWith("192.168.")
        || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
        || normalized.startsWith("fc")
        || normalized.startsWith("fd")
        || normalized.startsWith("fe80:");
}

async function assertSafeUrl(value: string) {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Chỉ hỗ trợ đường dẫn HTTP hoặc HTTPS.");
    if (url.username || url.password) throw new Error("Đường dẫn không được chứa thông tin đăng nhập.");
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("Không được truy cập máy chủ nội bộ.");
    const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) {
        throw new Error("Đường dẫn trỏ đến địa chỉ nội bộ hoặc không hợp lệ.");
    }
    return url;
}

function decodeHtml(value: string) {
    const entities: Record<string, string> = {
        "&amp;": "&", "&quot;": "\"", "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
    };
    return value
        .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/gi, (item) => entities[item.toLowerCase()] ?? item)
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, " ")
        .trim();
}

function metaContent(html: string, keys: string[]) {
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const key of keys) {
        const tag = tags.find((item) => {
            const name = item.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
            return name?.toLowerCase() === key.toLowerCase();
        });
        const content = tag?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
        if (content) return decodeHtml(content);
    }
    return "";
}

export type ExternalNewsMetadata = {
    title: string;
    description: string;
    imageUrl: string;
    sourceName: string;
    originalUrl: string;
    sourcePublishedAt: string | null;
};

export async function fetchNewsMetadata(input: string): Promise<ExternalNewsMetadata> {
    let currentUrl = await assertSafeUrl(input.trim());
    let response: Response | null = null;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        response = await fetch(currentUrl, {
            redirect: "manual",
            headers: { "User-Agent": "Mozilla/5.0 (compatible; TriVietNewsBot/1.0)", Accept: "text/html,application/xhtml+xml" },
            signal: AbortSignal.timeout(12_000),
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location || redirect === MAX_REDIRECTS) throw new Error("Bài viết chuyển hướng quá nhiều lần.");
        currentUrl = await assertSafeUrl(new URL(location, currentUrl).toString());
    }
    if (!response?.ok) throw new Error(`Không thể tải bài viết (HTTP ${response?.status ?? "unknown"}).`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("Đường dẫn không phải là một trang HTML.");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_HTML_BYTES) throw new Error("Nội dung trang vượt quá giới hạn cho phép.");
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const title = metaContent(html, ["og:title", "twitter:title"]) || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    if (!title) throw new Error("Không tìm thấy tiêu đề bài viết.");
    const description = metaContent(html, ["og:description", "twitter:description", "description"]);
    const rawImage = metaContent(html, ["og:image", "twitter:image", "twitter:image:src"]);
    const sourceName = metaContent(html, ["og:site_name", "application-name"]) || currentUrl.hostname.replace(/^www\./, "");
    const rawPublishedAt = metaContent(html, ["article:published_time", "date", "datePublished", "publishdate", "pubdate"]);
    const parsedPublishedAt = rawPublishedAt ? new Date(rawPublishedAt) : null;
    const resolvedImage = rawImage ? new URL(rawImage, currentUrl) : null;
    return {
        title: title.slice(0, 300),
        description: description.slice(0, 1000),
        imageUrl: resolvedImage && ["http:", "https:"].includes(resolvedImage.protocol) ? resolvedImage.toString() : "",
        sourceName: sourceName.slice(0, 120),
        originalUrl: currentUrl.toString(),
        sourcePublishedAt: parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime())
            ? parsedPublishedAt.toISOString()
            : null,
    };
}
