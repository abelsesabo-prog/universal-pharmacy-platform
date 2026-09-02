import test from "node:test";
import assert from "node:assert/strict";
import { securityHeaders } from "../server/middleware/security.js";

test("security headers are applied", () => {
    const headers = new Map();
    const res = { setHeader(name, value) { headers.set(name, value); } };
    const req = {};
    let called = false;
    securityHeaders(req, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
});
