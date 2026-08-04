type RateLimitEntry = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
    __trivietRateLimits?: Map<string, RateLimitEntry>;
};

const store = globalStore.__trivietRateLimits ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production") globalStore.__trivietRateLimits = store;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = store.get(key);
    const entry = !current || current.resetAt <= now
        ? { count: 1, resetAt: now + windowMs }
        : { count: current.count + 1, resetAt: current.resetAt };

    store.set(key, entry);
    if (store.size > 10_000) {
        for (const [storedKey, storedEntry] of store) {
            if (storedEntry.resetAt <= now) store.delete(storedKey);
        }
    }

    return {
        allowed: entry.count <= limit,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
}

export function getClientIp(request: Request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")?.trim()
        || "unknown";
}
