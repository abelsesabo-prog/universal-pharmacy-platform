// ==========================================
// Universal Pharmacy Platform
// Security Middleware
// ==========================================

import { randomUUID } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;
const LOGIN_MAX_REQUESTS = 10;
const buckets = new Map();
const loginBuckets = new Map();

function consume(store, key, maxRequests, now = Date.now()) {
    const current = store.get(key);
    if (!current || now - current.windowStart >= WINDOW_MS) {
        store.set(key, { windowStart: now, count: 1 });
        return { allowed: true, retryAfter: 0 };
    }
    current.count += 1;
    if (current.count > maxRequests) return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - current.windowStart)) / 1000) };
    return { allowed: true, retryAfter: 0 };
}

export function requestCorrelation(req, res, next) {
    const supplied = String(req.get("X-Request-Id") || "").trim();
    const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
    req.id = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
}

export function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
}

export function apiRateLimit(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const result = consume(buckets, key, MAX_REQUESTS);
    if (!result.allowed) { res.setHeader("Retry-After", String(result.retryAfter)); return res.status(429).json({ success: false, error: "Too many requests. Please try again later.", requestId: req.id }); }
    return next();
}

export function loginRateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const username = String(req.body?.username || "").trim().toLowerCase().slice(0, 128);
    const result = consume(loginBuckets, `${ip}:${username}`, LOGIN_MAX_REQUESTS);
    if (!result.allowed) { res.setHeader("Retry-After", String(result.retryAfter)); return res.status(429).json({ success: false, error: "Too many sign-in attempts. Please try again later.", requestId: req.id }); }
    return next();
}

setInterval(() => {
    const now = Date.now();
    for (const store of [buckets, loginBuckets]) for (const [key, bucket] of store) if (now - bucket.windowStart >= WINDOW_MS) store.delete(key);
}, WINDOW_MS).unref();
