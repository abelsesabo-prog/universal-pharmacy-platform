import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../server/app.js";

function request(server, path, headers = {}, method = "GET") {
    return new Promise((resolve, reject) => {
        const address = server.address();
        const req = http.request({ hostname: "127.0.0.1", port: address.port, path, method, headers }, (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });
        req.on("error", reject);
        req.end();
    });
}

test("API responses carry a request correlation id", async () => {
    const server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const response = await request(server, "/api/does-not-exist", { "X-Request-Id": "acceptance-correlation-001" });
        assert.equal(response.statusCode, 404);
        assert.equal(response.headers["x-request-id"], "acceptance-correlation-001");
        assert.equal(JSON.parse(response.body).requestId, "acceptance-correlation-001");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test("API errors do not expose internal exception details", async () => {
    const server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const response = await request(server, "/api/does-not-exist");
        const payload = JSON.parse(response.body);
        assert.equal(response.statusCode, 404);
        assert.equal(payload.success, false);
        assert.equal(payload.error, "API route not found.");
        assert.match(payload.requestId, /^[0-9a-f-]{36}$/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test("declared protected routes remain authenticated after route middleware scoping", async () => {
    const server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const protectedRoutes = [
        ["GET", "/api/batches"],
        ["GET", "/api/sales"],
        ["GET", "/api/audit-logs"],
        ["GET", "/api/branches"],
        ["GET", "/api/finance/entries"],
        ["GET", "/api/complaints"],
        ["POST", "/api/offline/sync"],
        ["POST", "/api/tmda/quarantine"],
        ["GET", "/api/pharmacy/expiry/watch"],
        ["GET", "/api/core/users"]
    ];

    try {
        for (const [method, path] of protectedRoutes) {
            const response = await request(server, path, {}, method);
            assert.equal(response.statusCode, 401, `${method} ${path} must require authentication`);
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
