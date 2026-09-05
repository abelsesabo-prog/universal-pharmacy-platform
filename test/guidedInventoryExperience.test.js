import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const inventory = fs.readFileSync(new URL("../client/inventory.html", import.meta.url), "utf8");
const guided = fs.readFileSync(new URL("../client/guided-flow.js", import.meta.url), "utf8");
const invoice = fs.readFileSync(new URL("../client/invoice-import-embedded.js", import.meta.url), "utf8");
const serviceWorker = fs.readFileSync(new URL("../client/service-worker.js", import.meta.url), "utf8");

test("inventory owns invoice import instead of a separate navigation tab", () => {
  assert.match(inventory, /data-smart-invoice-import/);
  assert.match(inventory, /\/invoice-import-embedded\.js/);
  assert.doesNotMatch(inventory, /href=\"\/smart-invoice\.html\"/);
});

test("inventory loads the low-strain guided field flow", () => {
  assert.match(inventory, /\/guided-flow\.js/);
  assert.match(guided, /Next:/);
  assert.match(guided, /stopImmediatePropagation/);
  assert.match(guided, /scrollIntoView/);
});

test("invoice import reuses the inventory authentication session", () => {
  assert.match(invoice, /upp\.session\.token/);
  assert.match(invoice, /adoptInventorySession/);
  assert.match(invoice, /setInterval\(adoptInventorySession, 500\)/);
});

test("offline shell caches the new guided experience assets", () => {
  assert.match(serviceWorker, /universal-pos-shell-v4/);
  assert.match(serviceWorker, /\/guided-flow\.js/);
  assert.match(serviceWorker, /\/invoice-import-embedded\.js/);
});
