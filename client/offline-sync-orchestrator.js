import { syncOfflineOutbox } from "./offline-sync.js";

export const OFFLINE_SYNC_TAG = "universal-pos-offline-sync";
export const DEFAULT_RETRY_BASE_MS = 1000;
export const DEFAULT_RETRY_MAX_MS = 60_000;
export const DEFAULT_MAX_ATTEMPTS = 5;

function text(value) { return String(value ?? "").trim(); }

export function isRetryableSyncError(error = {}) {
    const status = Number(error?.statusCode);
    if (!Number.isFinite(status) || status === 0) return true;
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function calculateRetryDelay(attempt, { baseMs = DEFAULT_RETRY_BASE_MS, maxMs = DEFAULT_RETRY_MAX_MS, jitter = 0, random = Math.random } = {}) {
    const safeAttempt = Math.max(0, Number(attempt) || 0);
    const base = Math.max(0, Number(baseMs) || 0);
    const max = Math.max(base, Number(maxMs) || base);
    const bounded = Math.min(max, base * (2 ** safeAttempt));
    const ratio = Math.max(0, Math.min(1, Number(jitter) || 0));
    if (!ratio) return bounded;
    const unit = Math.max(0, Math.min(1, Number(random()) || 0));
    return Math.min(max, Math.round(bounded * (1 - ratio + unit * ratio * 2)));
}

export async function waitForRetry(delayMs, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
    const delay = Math.max(0, Number(delayMs) || 0);
    await sleep(delay);
    return delay;
}

export async function syncOfflineOutboxWithRetry(options = {}) {
    const {
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        baseMs = DEFAULT_RETRY_BASE_MS,
        maxMs = DEFAULT_RETRY_MAX_MS,
        jitter = 0.2,
        sleep,
        random,
        sync = syncOfflineOutbox
    } = options;
    const attemptsAllowed = Math.max(1, Number(maxAttempts) || DEFAULT_MAX_ATTEMPTS);
    let attempt = 0;
    let lastError;

    while (attempt < attemptsAllowed) {
        try {
            const result = await sync(options);
            return { ...result, attempts: attempt + 1, recovered: attempt > 0 };
        } catch (error) {
            lastError = error;
            attempt += 1;
            if (attempt >= attemptsAllowed || !isRetryableSyncError(error)) throw error;
            const delay = calculateRetryDelay(attempt - 1, { baseMs, maxMs, jitter, random });
            await waitForRetry(delay, sleep);
        }
    }
    throw lastError;
}

export async function registerOfflineBackgroundSync({ navigatorRef = globalThis.navigator, tag = OFFLINE_SYNC_TAG, scriptUrl = "/offline-sync-worker.js" } = {}) {
    const serviceWorker = navigatorRef?.serviceWorker;
    if (!serviceWorker?.register) return { supported: false, registered: false };
    const registration = await serviceWorker.register(scriptUrl, { type: "module" });
    if (!registration?.sync?.register) return { supported: true, registered: false, registration };
    await registration.sync.register(tag);
    return { supported: true, registered: true, registration };
}

export function attachOnlineSyncTrigger({ windowRef = globalThis.window, trigger } = {}) {
    if (!windowRef?.addEventListener || typeof trigger !== "function") return () => {};
    const handler = () => { void trigger(); };
    windowRef.addEventListener("online", handler);
    return () => windowRef.removeEventListener?.("online", handler);
}

export function attachServiceWorkerSyncTrigger({ navigatorRef = globalThis.navigator, trigger } = {}) {
    const serviceWorker = navigatorRef?.serviceWorker;
    if (!serviceWorker?.addEventListener || typeof trigger !== "function") return () => {};
    const handler = event => {
        if (event?.data?.type !== "OFFLINE_SYNC_REQUIRED") return;
        void trigger(event.data);
    };
    serviceWorker.addEventListener("message", handler);
    return () => serviceWorker.removeEventListener?.("message", handler);
}

export { text };
