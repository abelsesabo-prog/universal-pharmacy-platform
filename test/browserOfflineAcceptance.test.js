import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync(new URL("../client/service-worker.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../client/ux-shell.js", import.meta.url), "utf8");
const acceptance = fs.readFileSync(new URL("../scripts/live-offline-reconciliation-check.js", import.meta.url), "utf8");

test("browser offline worker caches the application shell", () => {
    assert.match(worker, /addEventListener\("install"/);
    assert.match(worker, /cache\.addAll\(APP_SHELL\)/);
    assert.match(worker, /addEventListener\("activate"/);
    assert.match(worker, /clients\.claim\(\)/);
    assert.match(worker, /request\.mode === "navigate"/);
    assert.match(worker, /caches\.match\(request\)/);
});

test("browser offline worker never caches API or authentication traffic", () => {
    assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\) return/);
    assert.doesNotMatch(worker, /caches\.match\(.*\/api\//);
});

test("UX shell registers the root-scoped browser service worker", () => {
    assert.match(shell, /serviceWorker\.register\("\/service-worker\.js", \{ scope: "\/" \}\)/);
    assert.match(shell, /registerBrowserOfflineSupport/);
});

test("live acceptance requires tenant-scoped authenticated identities", () => {
    assert.match(acceptance, /Bearer \$\{token\}/);
    assert.match(acceptance, /claimsA\.tenantId/);
    assert.match(acceptance, /claimsB\.tenantId/);
    assert.match(acceptance, /claimsA\.tenantId, claimsB\.tenantId/);
    assert.match(acceptance, /claimsA\.iss, "universal-pharmacy-platform"/);
    assert.match(acceptance, /claimsA\.aud, "universal-pharmacy-api"/);
});
