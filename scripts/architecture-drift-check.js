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

// There must be one authoritative offline replay contract. A compatibility
// shim is allowed, but a second implementation is not.
const v2 = replayProcessors.find(item => item === "server/services/offlineEventProcessorV2.js");
if (v2) {
    const source = fs.readFileSync(path.join(ROOT, v2), "utf8");
    const normalized = source.replace(/\s+/g, " ").trim();
    const shim = 'export { REPLAY_PHASES as OFFLINE_REPLAY_PHASES, validateReplayEvent as validateReplayContract, } from "./offlineEventProcessor.js";';
    if (!normalized.endsWith(shim) || !normalized.includes('from "./offlineEventProcessor.js"')) {
        failures.push("Duplicate offline replay contract detected: server/services/offlineEventProcessorV2.js must remain a compatibility shim to offlineEventProcessor.js.");
    }
}

if (failures.length) {
    console.error("ARCHITECTURE DRIFT DETECTED");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log(`Architecture drift guard passed: canonical schema v${SCHEMA_VERSION}; no stale schema assertions or divergent offline replay implementation.`);
