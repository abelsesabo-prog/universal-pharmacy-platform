import test from "node:test";
import assert from "node:assert/strict";
import {
    OFFLINE_SYNC_TAG,
    calculateRetryDelay,
    isRetryableSyncError,
    syncOfflineOutboxWithRetry,
    registerOfflineBackgroundSync,
    attachServiceWorkerSyncTrigger
} from "../client/offline-sync-orchestrator.js";

test("offline retry policy retries transient and server failures only", () => {
    assert.equal(isRetryableSyncError(new Error("network")), true);
    assert.equal(isRetryableSyncError({ statusCode: 408 }), true);
    assert.equal(isRetryableSyncError({ statusCode: 429 }), true);
    assert.equal(isRetryableSyncError({ statusCode: 503 }), true);
    assert.equal(isRetryableSyncError({ statusCode: 400 }), false);
    assert.equal(isRetryableSyncError({ statusCode: 401 }), false);
    assert.equal(isRetryableSyncError({ statusCode: 409 }), false);
});

test("offline retry delay is exponential, bounded and deterministic when jitter is disabled", () => {
    assert.equal(calculateRetryDelay(0, { baseMs: 1000, maxMs: 5000, jitter: 0 }), 1000);
    assert.equal(calculateRetryDelay(1, { baseMs: 1000, maxMs: 5000, jitter: 0 }), 2000);
    assert.equal(calculateRetryDelay(5, { baseMs: 1000, maxMs: 5000, jitter: 0 }), 5000);
});

test("offline sync retries a transient failure and then succeeds", async () => {
    let calls = 0;
    const delays = [];
    const result = await syncOfflineOutboxWithRetry({
        maxAttempts: 3,
        jitter: 0,
        sleep: async delay => delays.push(delay),
        sync: async () => {
            calls += 1;
            if (calls === 1) throw Object.assign(new Error("temporarily unavailable"), { statusCode: 503 });
            return { received: 1, applied: 1 };
        }
    });
    assert.equal(calls, 2);
    assert.deepEqual(delays, [1000]);
    assert.equal(result.recovered, true);
    assert.equal(result.attempts, 2);
});

test("offline sync does not retry a permanent client failure", async () => {
    let calls = 0;
    await assert.rejects(
        syncOfflineOutboxWithRetry({
            maxAttempts: 5,
            sleep: async () => { throw new Error("sleep should not run"); },
            sync: async () => {
                calls += 1;
                throw Object.assign(new Error("bad request"), { statusCode: 400 });
            }
        }),
        /bad request/
    );
    assert.equal(calls, 1);
});

test("background sync registration is feature-detected and tagged", async () => {
    let registeredScript;
    let registeredTag;
    const registration = { sync: { register: async tag => { registeredTag = tag; } } };
    const result = await registerOfflineBackgroundSync({
        tag: OFFLINE_SYNC_TAG,
        navigatorRef: { serviceWorker: { register: async (script, options) => { registeredScript = [script, options]; return registration; } } }
    });
    assert.equal(result.supported, true);
    assert.equal(result.registered, true);
    assert.deepEqual(registeredScript, ["/offline-sync-worker.js", { type: "module" }]);
    assert.equal(registeredTag, OFFLINE_SYNC_TAG);
});

test("service worker messages trigger authenticated page-side reconciliation", async () => {
    let handler;
    let calls = 0;
    const cleanup = attachServiceWorkerSyncTrigger({
        navigatorRef: { serviceWorker: { addEventListener: (type, fn) => { assert.equal(type, "message"); handler = fn; } } },
        trigger: async data => { calls += 1; assert.equal(data.tag, OFFLINE_SYNC_TAG); }
    });
    await handler({ data: { type: "OFFLINE_SYNC_REQUIRED", tag: OFFLINE_SYNC_TAG } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    cleanup();
});
