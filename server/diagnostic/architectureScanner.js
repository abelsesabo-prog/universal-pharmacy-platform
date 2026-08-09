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
        const entryRelativePath = path.join(
            relativePath,
            entry.name
        );

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

function extractImports(source) {
    const imports = [];

    const importRegex =
        /import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

    let match;

    while ((match = importRegex.exec(source)) !== null) {
        imports.push(match[1]);
    }

    return [...new Set(imports)];
}

function extractExports(source) {
    const exports = [];

    const namedExportRegex =
        /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;

    const defaultExportRegex =
        /export\s+default\s+(?:function|class)?\s*([A-Za-z_$][\w$]*)?/g;

    let match;

    while ((match = namedExportRegex.exec(source)) !== null) {
        exports.push(match[1]);
    }

    while ((match = defaultExportRegex.exec(source)) !== null) {
        exports.push(match[1] || "default");
    }

    if (/export\s*\{[\s\S]*?\}/.test(source)) {
        exports.push("named-export-block");
    }

    return [...new Set(exports)];
}

function analyzeJavaScriptFile(filePath) {
    const source = fs.readFileSync(filePath, "utf8");

    return {
        imports: extractImports(source),
        exports: extractExports(source)
    };
}

function analyzeDirectory(directory, relativePath = "") {
    const entries = fs.readdirSync(directory, {
        withFileTypes: true
    });

    const files = [];

    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
            continue;
        }

        const absolutePath = path.join(directory, entry.name);
        const entryRelativePath = path.join(
            relativePath,
            entry.name
        );

        if (entry.isDirectory()) {
            files.push(
                ...analyzeDirectory(
                    absolutePath,
                    entryRelativePath
                )
            );

            continue;
        }

        if (!entry.name.endsWith(".js")) {
            continue;
        }

        const analysis = analyzeJavaScriptFile(absolutePath);

        files.push({
            path: entryRelativePath,
            ...analysis
        });
    }

    return files;
}

export function scanProjectStructure() {
    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        structure: scanDirectory(PROJECT_ROOT)
    };
}

export function analyzeProjectModules() {
    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        files: analyzeDirectory(PROJECT_ROOT)
    };
}