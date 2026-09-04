const CACHE_NAME = "universal-pharmacy-shell-v1";
const APP_SHELL = [
    "/",
    "/pos-master.html",
    "/uom-product.html",
    "/uom-pos.html",
    "/uom-pos-workspace.html",
    "/smart-invoice.html",
    "/invoice-import.html",
    "/experience-layer.css",
    "/ux-home.css",
    "/ux-home.js",
    "/ux-shell.js",
    "/offline-sync.js",
    "/offline-sync-orchestrator.js",
    "/offline-sync-worker.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // API/auth traffic must never be served from the app-shell cache.
    if (url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached || caches.match("/")))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => cached || fetch(request).then(response => {
            if (!response || response.status !== 200 || response.type !== "basic") return response;
            const copy = response.clone();
            void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            return response;
        }))
    );
});
