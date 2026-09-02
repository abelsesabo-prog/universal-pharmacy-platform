// ==========================================
// Universal Pharmacy Platform
// Security Middleware
// ==========================================

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;
const buckets = new Map();

export function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
}

export function apiRateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = buckets.get(key);

    if (!current || now - current.windowStart >= WINDOW_MS) {
        buckets.set(key, { windowStart: now, count: 1 });
        return next();
    }

    current.count += 1;

    if (current.count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - current.windowStart)) / 1000);
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
            success: false,
            error: "Too many requests. Please try again later."
        });
    }

    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (now - bucket.windowStart >= WINDOW_MS) {
            buckets.delete(key);
        }
    }
}, WINDOW_MS).unref();
