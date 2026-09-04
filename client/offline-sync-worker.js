const CACHE_NAME = "universal-pos-v5";
const APP_SHELL = ["/", "/index.html", "/offline-sync.js", "/offline-sync-orchestrator.js"];
const SYNC_TAG_PREFIX = "universal-pos-offline-sync";

function notifyClients(message) {
    return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
        for (const client of clients) client.postMessage(message);
    });
}

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => undefined)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || Response.error()))
    );
});

self.addEventListener("sync", event => {
    if (!String(event.tag || "").startsWith(SYNC_TAG_PREFIX)) return;
    event.waitUntil(notifyClients({ type: "OFFLINE_SYNC_REQUIRED", tag: event.tag }));
});

self.addEventListener("message", event => {
    if (event.data?.type === "REGISTER_OFFLINE_SYNC" && self.registration?.sync?.register) {
        event.waitUntil(self.registration.sync.register(event.data.tag || SYNC_TAG_PREFIX));
    }
});

export { CACHE_NAME, SYNC_TAG_PREFIX };
