// Increment this version whenever caching rules change.
const CACHE_NAME = "triviet-pwa-v7";
const PRECACHE_URLS = ["/manifest.json", "/offline.html", "/icon-192.svg", "/icon-512.svg"];
const IS_LOCAL_DEVELOPMENT =
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1" ||
    self.location.hostname === "[::1]";

self.addEventListener("install", (event) => {
    if (IS_LOCAL_DEVELOPMENT) {
        event.waitUntil(self.skipWaiting());
        return;
    }

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    if (IS_LOCAL_DEVELOPMENT) {
        event.waitUntil(
            caches
                .keys()
                .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
                .then(() => self.registration.unregister())
                .then(() => self.clients.claim()),
        );
        return;
    }

    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    if (IS_LOCAL_DEVELOPMENT) {
        event.respondWith(fetch(event.request));
        return;
    }

    const requestUrl = new URL(event.request.url);
    const isNextAsset = requestUrl.pathname.startsWith("/_next/");
    const isRouterRequest = requestUrl.searchParams.has("_rsc") ||
        event.request.headers.get("RSC") === "1" ||
        event.request.headers.has("Next-Router-State-Tree") ||
        event.request.headers.has("Next-Router-Prefetch");
    const isPrivateRequest =
        requestUrl.pathname.startsWith("/dashboard/") ||
        requestUrl.pathname.startsWith("/api/");

    // Next.js build assets must not outlive the server HTML that references them.
    // A stale client bundle paired with fresh HTML causes hydration mismatches.
    if (isNextAsset || isRouterRequest) {
        event.respondWith(fetch(event.request));
        return;
    }

    // API responses can contain session-scoped or frequently changing data. Always
    // use the network so installed mobile PWAs cannot display stale store data.
    if (isPrivateRequest) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(async () => {
                return caches.match("/offline.html");
            }),
        );
        return;
    }

    // Only cache known, public static resources. RSC and authenticated page
    // responses must never be reused by the service worker across navigations.
    if (requestUrl.origin === self.location.origin && PRECACHE_URLS.includes(requestUrl.pathname)) {
        event.respondWith(
            caches.match(event.request).then(async (cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                const response = await fetch(event.request);
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, response.clone());
                }
                return response;
            }),
        );
    }
});
