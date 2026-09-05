const CACHE_NAME = "universal-pos-shell-v6";
const APP_SHELL = [
    "/",
    "/index.html",
    "/experience-layer.css",
    "/ux-home.js",
    "/ux-home.css",
    "/ux-shell.js",
    "/guided-flow.js",
    "/uom-product-fix.js",
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

async function withGuidedFlow(response, request) {
    if (!response || !response.ok) return response;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;
    const html = await response.text();
    let injected = html;
    if (!injected.includes("/guided-flow.js")) {
        if (!/<\/head>/i.test(injected)) return new Response(injected, { status:response.status, statusText:response.statusText, headers:response.headers });
        injected = injected.replace(/<\/head>/i, '    <script src="/guided-flow.js"></script>\n</head>');
    }
    if (request?.url) {
        const path = new URL(request.url).pathname;
        if (path === "/uom-product.html" && !injected.includes("/uom-product-fix.js") && /<\/head>/i.test(injected)) {
            injected = injected.replace(/<\/head>/i, '    <script src="/uom-product-fix.js"></script>\n</head>');
        }
    }
    if (injected === html) return new Response(html, { status:response.status, statusText:response.statusText, headers:response.headers });
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
                .then(response => withGuidedFlow(response, request))
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached ? withGuidedFlow(cached, request) : new Response(
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
