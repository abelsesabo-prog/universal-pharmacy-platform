import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const file = new URL("../client/uom-product.html", import.meta.url);
const html = fs.readFileSync(file, "utf8");

function inlineScript(source) {
    const match = source.match(/<script>([\s\S]*?)<\/script>/i);
    assert.ok(match, "uom-product.html must contain an inline application script");
    return match[1];
}

test("smart item entry has a real submit form and final create action", () => {
    assert.match(html, /<form[^>]+id=["']itemForm["'][^>]*>/i);
    assert.match(html, /<button[^>]+id=["']nextButton["'][^>]+type=["']submit["']/i);
    assert.match(html, /itemForm['\"]?\.addEventListener\(['\"]submit['\"]/);
    assert.match(html, /fetch\(['\"]\/api\/products['\"]/);
    assert.match(html, /fetch\(['\"]\/api\/inventory\/batches['\"]/);
});

test("smart item entry application script compiles without syntax errors", () => {
    assert.doesNotThrow(() => new vm.Script(inlineScript(html), { filename: "uom-product-inline.js" }));
});

test("wizard form fields expose id and name attributes for browser autofill", () => {
    const inputTags = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map(match => match[0]);
    const missing = inputTags.filter(tag => !/\bid=["'][^"']+["']/i.test(tag) || !/\bname=["'][^"']+["']/i.test(tag));
    assert.deepEqual(missing, [], `Fields missing id/name: ${missing.join(" | ")}`);
});
