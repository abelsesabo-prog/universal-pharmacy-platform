import test from "node:test";
import assert from "node:assert/strict";

const controllerSource = (await import("node:fs/promises")).readFile;
const source = await controllerSource(new URL("./healthController.js", import.meta.url), "utf8");

test("health controller returns safe diagnostics and request correlation", () => {
    assert.match(source, /requestId:\s*req\.id/);
    assert.match(source, /database:\s*\"connected\"/);
    assert.match(source, /uptimeSeconds/);
    assert.match(source, /latencyMs/);
    assert.match(source, /catch \(error\)/);
    assert.match(source, /database:\s*\"disconnected\"/);
    assert.doesNotMatch(source, /error:\s*error\.message/);
});
