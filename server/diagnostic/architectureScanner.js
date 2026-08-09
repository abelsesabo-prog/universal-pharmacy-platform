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

    const exportBlockRegex =
        /export\s*\{([\s\S]*?)\}/g;

    let match;

    while ((match = namedExportRegex.exec(source)) !== null) {
        exports.push(match[1]);
    }

    while ((match = defaultExportRegex.exec(source)) !== null) {
        exports.push(match[1] || "default");
    }

    while ((match = exportBlockRegex.exec(source)) !== null) {
        const names = match[1]
            .split(",")
            .map(item => {
                const cleaned = item
                    .trim()
                    .replace(/\s+as\s+.*/i, "");

                return cleaned;
            })
            .filter(Boolean);

        exports.push(...names);
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

function getJavaScriptCandidates(importPath) {
    return [
        importPath,
        `${importPath}.js`,
        path.join(importPath, "index.js")
    ];
}

function resolveLocalImport(sourceFile, importPath) {
    if (!importPath.startsWith(".")) {
        return {
            type: "external",
            importPath,
            resolved: true,
            target: importPath
        };
    }

    const sourceDirectory = path.dirname(sourceFile);

    const absoluteBase = path.resolve(
        sourceDirectory,
        importPath
    );

    const candidates = getJavaScriptCandidates(
        absoluteBase
    );

    for (const candidate of candidates) {
        if (
            fs.existsSync(candidate) &&
            fs.statSync(candidate).isFile()
        ) {
            return {
                type: "local",
                importPath,
                resolved: true,
                target: path.relative(
                    PROJECT_ROOT,
                    candidate
                )
            };
        }
    }

    return {
        type: "local",
        importPath,
        resolved: false,
        target: null
    };
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

export function analyzeProjectDependencies() {
    const modules = analyzeDirectory(PROJECT_ROOT);

    const dependencies = [];

    for (const module of modules) {
        const sourceFile = path.resolve(
            PROJECT_ROOT,
            module.path
        );

        for (const importPath of module.imports) {
            const resolution = resolveLocalImport(
                sourceFile,
                importPath
            );

            dependencies.push({
                source: module.path,
                import: importPath,
                type: resolution.type,
                resolved: resolution.resolved,
                target: resolution.target
            });
        }
    }

    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        dependencies
    };
}