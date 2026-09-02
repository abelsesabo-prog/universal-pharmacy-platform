import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(root, "client", "experience-layer.css");
const syncPath = path.join(root, "client", "offline-sync.js");

function read(file) { return fs.readFileSync(file, "utf8"); }

test("human experience layer is shipped with responsive, accessible visual primitives", () => {
    const css = read(cssPath);
    assert.match(css, /--ux-accent/);
    assert.match(css, /@media \(max-width: 720px\)/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /prefers-contrast/);
    assert.match(css, /#complete/);
});

test("offline client shell loads the experience layer without affecting Node execution", () => {
    const source = read(syncPath);
    assert.match(source, /\/experience-layer\.css/);
    assert.match(source, /typeof document !== "undefined"/);
    assert.match(source, /data-experience-layer/);
});

test("experience layer does not replace the existing offline transaction logic", () => {
    const source = read(syncPath);
    assert.match(source, /export async function enqueueOfflineEvent/);
    assert.match(source, /export async function syncOfflineOutbox/);
    assert.match(source, /authorization: `Bearer \$\{token\}`/);
});
