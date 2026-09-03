import crypto from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestContext(req, res, next) {
    const supplied = String(req.get("X-Request-Id") || "").trim();
    const requestId = REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    return next();
}
