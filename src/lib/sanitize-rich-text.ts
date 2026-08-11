import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(value?: string | null) {
    if (!value) return "";
    return sanitizeHtml(value, {
        allowedTags: ["p", "div", "br", "strong", "b", "em", "i", "ul", "ol", "li", "span", "table", "thead", "tbody", "tr", "th", "td"],
        allowedAttributes: { "*": ["style"], table: ["border"] },
        allowedStyles: { "*": { color: [/^#[0-9a-f]{6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/], "text-align": [/^(left|center|right)$/] } },
        allowedSchemes: [],
    }).trim();
}
