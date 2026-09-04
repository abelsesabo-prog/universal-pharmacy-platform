import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const homePath = new URL("../client/ux-home.js", import.meta.url);
const stylePath = new URL("../client/experience-layer.css", import.meta.url);


test("human home launcher provides direct operational workspace entry points", async () => {
    const source = await fs.readFile(homePath, "utf8");
    assert.match(source, /href="\/pos-master\.html"/);
    assert.match(source, /href="\/uom-product\.html"/);
    assert.match(source, /href="\/uom-pos\.html"/);
    assert.match(source, /href="\/smart-invoice\.html"/);
});

test("human home launcher presents attention/status framing", async () => {
    const source = await fs.readFile(homePath, "utf8");
    assert.match(source, /What needs attention\?/);
    assert.match(source, /Operational shell/);
    assert.match(source, /Offline capable/);
    assert.match(source, /Safety aware/);
});

test("experience layer provides responsive launcher and reduced-motion support", async () => {
    const source = await fs.readFile(stylePath, "utf8");
    assert.match(source, /#ux-home-launcher/);
    assert.match(source, /@media \(max-width: 720px\)/);
    assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
});
