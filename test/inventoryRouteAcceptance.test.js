import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import app from "../server/app.js";

async function startTestServer() {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address();
    return { server, origin: `http://127.0.0.1:${port}` };
}

test("inventory direct route serves inventory workspace instead of Home", async (t) => {
    const { server, origin } = await startTestServer();
    t.after(() => server.close());

    const response = await fetch(`${origin}/inventory.html`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /<title>Universal Pharmacy Platform — Inventory<\/title>/);
    assert.match(body, /<strong>Universal Pharmacy Platform — INVENTORY<\/strong>/);
    assert.match(body, /<a class="active" href="\/inventory\.html">Inventory<\/a>/);
    assert.doesNotMatch(body, /What needs attention\?/);
});

test("inventory API remains protected without a bearer token", async (t) => {
    const { server, origin } = await startTestServer();
    t.after(() => server.close());

    const response = await fetch(`${origin}/api/batches`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, "Authentication required.");
});
