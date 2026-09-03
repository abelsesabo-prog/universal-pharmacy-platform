import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../shared/schemas/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["server", "shared", "test", "scripts"];
const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(absolute));
        else if (JS_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
    }
    return files;
}

const files = SCAN_ROOTS.flatMap(root => walk(path.join(ROOT, root)));
const failures = [];
const replayProcessors = [];

for (const file of files) {
    const relative = path.relative(ROOT, file).replaceAll(path.sep, "/");
    const source = fs.readFileSync(file, "utf8");

    // A test may assert the canonical exported version, but it must not freeze
    // an obsolete numeric version into an assertion or comparison.
    for (const match of source.matchAll(/SCHEMA_VERSION\s*[,=]?\s*(\d+)/g)) {
        const expected = Number(match[1]);
        if (expected !== SCHEMA_VERSION) {
            failures.push(`${relative}: hard-coded SCHEMA_VERSION ${expected}; canonical is ${SCHEMA_VERSION}.`);
        }
    }

    if (relative === "server/services/offlineEventProcessor.js") replayProcessors.push(relative);
    if (relative === "server/services/offlineEventProcessorV2.js") replayProcessors.push(relative);
}

// There must be one authoritative offline replay contract. A V2 implementation
// beside the production processor is architectural drift unless it is removed
// or explicitly collapsed into the canonical module.
if (replayProcessors.includes("server/services/offlineEventProcessor.js") && replayProcessors.includes("server/services/offlineEventProcessorV2.js")) {
    failures.push("Duplicate offline replay processors detected: server/services/offlineEventProcessor.js and server/services/offlineEventProcessorV2.js. Keep one authoritative implementation.");
}

if (failures.length) {
    console.error("ARCHITECTURE DRIFT DETECTED");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log(`Architecture drift guard passed: canonical schema v${SCHEMA_VERSION}; no stale schema assertions or duplicate offline replay processors.`);
