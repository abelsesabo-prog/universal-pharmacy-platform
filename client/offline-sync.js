const EXPERIENCE_STYLESHEET = "/experience-layer.css";

if (typeof document !== "undefined" && !document.querySelector('link[data-experience-layer="true"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = EXPERIENCE_STYLESHEET;
    link.dataset.experienceLayer = "true";
    document.head?.appendChild(link);
}

const DB_NAME = "universal-pharmacy-offline";
const DB_VERSION = 1;
const STORE = "events";

function text(value) { return String(value ?? "").trim(); }

function openDatabase(indexedDBRef = globalThis.indexedDB) {
    if (!indexedDBRef) throw new Error("IndexedDB is unavailable in this environment.");
    return new Promise((resolve, reject) => {
        const request = indexedDBRef.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "eventId" });
                store.createIndex("status", "status", { unique: false });
                store.createIndex("tenantDevice", ["tenantId", "deviceId"], { unique: false });
                store.createIndex("sequence", "sequence", { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open offline database."));
    });
}

function transactionRequest(db, mode, operation) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let request;
        try { request = operation(store); } catch (error) { reject(error); return; }
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB operation failed."));
    });
}

export async function enqueueOfflineEvent(event, indexedDBRef = globalThis.indexedDB) {
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("Offline event must be an object.");
    if (!text(event.eventId) || !text(event.tenantId) || !text(event.deviceId) || !text(event.eventType)) throw new Error("eventId, tenantId, deviceId and eventType are required.");
    const db = await openDatabase(indexedDBRef);
    const document = { ...event, status: "PENDING", queuedAt: event.queuedAt || new Date().toISOString() };
    await transactionRequest(db, "readwrite", store => store.put(document));
    db.close();
    return document;
}

export async function listPendingOfflineEvents(tenantId, deviceId, indexedDBRef = globalThis.indexedDB) {
    const db = await openDatabase(indexedDBRef);
    const all = await transactionRequest(db, "readonly", store => store.getAll());
    db.close();
    return all.filter(event => event.status === "PENDING" && event.tenantId === tenantId && event.deviceId === deviceId)
        .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0) || String(a.queuedAt).localeCompare(String(b.queuedAt)));
}

export async function acknowledgeOfflineEvents(acknowledgements, indexedDBRef = globalThis.indexedDB) {
    if (!Array.isArray(acknowledgements)) throw new Error("acknowledgements must be an array.");
    const db = await openDatabase(indexedDBRef);
    for (const acknowledgement of acknowledgements) {
        if (!text(acknowledgement?.eventId)) continue;
        const existing = await transactionRequest(db, "readonly", store => store.get(acknowledgement.eventId));
        if (!existing) continue;
        const status = text(acknowledgement.status);
        existing.status = status === "APPLIED" || status === "CONFLICT" || status === "REJECTED" ? status : existing.status;
        if (acknowledgement.error) existing.error = text(acknowledgement.error);
        if (acknowledgement.reason) existing.conflictReason = text(acknowledgement.reason);
        existing.acknowledgedAt = new Date().toISOString();
        await transactionRequest(db, "readwrite", store => store.put(existing));
    }
    db.close();
}

export async function syncOfflineOutbox({ tenantId, deviceId, token, endpoint = "/api/offline/sync", fetchImpl = globalThis.fetch, indexedDBRef = globalThis.indexedDB } = {}) {
    if (!text(tenantId) || !text(deviceId)) throw new Error("tenantId and deviceId are required.");
    if (!text(token)) throw new Error("Authentication token is required.");
    if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable in this environment.");

    const pending = await listPendingOfflineEvents(tenantId, deviceId, indexedDBRef);
    if (!pending.length) return { received: 0, applied: 0, duplicates: 0, conflicts: 0, rejected: 0, acknowledgements: [] };

    const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId, events: pending.slice(0, 100) })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error || `Offline sync failed with HTTP ${response.status}.`);
        error.statusCode = Number(response.status) || 500;
        throw error;
    }
    await acknowledgeOfflineEvents(body.acknowledgements || [], indexedDBRef);
    return body;
}

export { DB_NAME, DB_VERSION, STORE };
