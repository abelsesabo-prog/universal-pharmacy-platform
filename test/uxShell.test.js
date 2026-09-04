import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const shellPath = new URL("../client/ux-shell.js", import.meta.url);
const stylePath = new URL("../client/experience-layer.css", import.meta.url);

test("human experience shell provides a fast command rail", async () => {
    const source = await fs.readFile(shellPath, "utf8");
    assert.match(source, /ux-command-rail/);
    assert.match(source, /data-ux-focus="search"/);
    assert.match(source, /data-ux-scroll="workspace"/);
    assert.match(source, /addEventListener\("keydown"/);
    assert.match(source, /event\.key === "\/"/);
});

test("human experience layer protects accessible motion and contrast", async () => {
    const source = await fs.readFile(stylePath, "utf8");
    assert.match(source, /prefers-reduced-motion/);
    assert.match(source, /prefers-contrast: more/);
    assert.match(source, /min-height: 42px/);
    assert.match(source, /#complete\s*\{/);
});

test("offline client remains the integration point for the experience stylesheet", async () => {
    const source = await fs.readFile(new URL("../client/offline-sync.js", import.meta.url), "utf8");
    assert.match(source, /EXPERIENCE_STYLESHEET/);
    assert.match(source, /experience-layer\.css/);
    assert.match(source, /export async function enqueueOfflineEvent/);
    assert.match(source, /export async function syncOfflineOutbox/);
});
