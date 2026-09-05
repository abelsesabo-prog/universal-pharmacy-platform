const CACHE_NAME = "universal-pos-shell-v5";
const APP_SHELL = [
    "/",
    "/index.html",
    "/experience-layer.css",
    "/ux-home.js",
    "/ux-home.css",
    "/ux-shell.js",
    "/guided-flow.js",
    "/invoice-import-embedded.js",
    "/pos-master.html",
    "/inventory.html",
    "/uom-product.html",
    "/uom-pos.html",
    "/smart-invoice.html"
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
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

async function withGuidedFlow(response) {
    if (!response || !response.ok) return response;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;
    const html = await response.text();
    if (html.includes("/guided-flow.js")) return new Response(html, { status:response.status, statusText:response.statusText, headers:response.headers });
    if (!/<\/head>/i.test(html)) return new Response(html, { status:response.status, statusText:response.statusText, headers:response.headers });
    const injected = html.replace(/<\/head>/i, '    <script src="/guided-flow.js"></script>\n</head>');
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injected, { status:response.status, statusText:response.statusText, headers });
}

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => withGuidedFlow(response))
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached ? withGuidedFlow(cached) : new Response(
                    "Offline page unavailable.",
                    { status:503, headers:{"Content-Type":"text/plain; charset=utf-8"} }
                )))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => cached || fetch(request).then(response => {
            if (response.ok && response.type === "basic") {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
        }))
    );
});
