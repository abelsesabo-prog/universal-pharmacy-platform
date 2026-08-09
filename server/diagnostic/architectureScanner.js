// ==========================================
// Universal Pharmacy Platform
// Architecture Intelligence
// Read-Only Architecture Scanner
// ==========================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    ".render",
    "dist",
    "build",
    "coverage"
]);

function scanDirectory(directory, relativePath = "") {
    const entries = fs.readdirSync(directory, {
        withFileTypes: true
    });

    const result = [];

    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
            continue;
        }

        const absolutePath = path.join(directory, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
            result.push({
                type: "directory",
                path: entryRelativePath,
                children: scanDirectory(
                    absolutePath,
                    entryRelativePath
                )
            });
        } else {
            result.push({
                type: "file",
                path: entryRelativePath
            });
        }
    }

    return result;
}

export function scanProjectStructure() {
    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        structure: scanDirectory(PROJECT_ROOT)
    };
}