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
        /import\s+(?:([\s\S]*?)\s+from\s+)?["']([^"']+)["']/g;

    let match;

    while ((match = importRegex.exec(source)) !== null) {
        const clause = match[1]?.trim() || null;
        const modulePath = match[2];

        imports.push({
            module: modulePath,
            clause
        });
    }

    return imports;
}

function extractExports(source) {
    const exports = [];

    const namedExportRegex =
        /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;

    const defaultExportRegex =
    /\bexport\s+default\b/g;

    const exportBlockRegex =
        /export\s*\{([\s\S]*?)\}/g;

    let match;

    while ((match = namedExportRegex.exec(source)) !== null) {
        exports.push(match[1]);
    }

    while ((match = defaultExportRegex.exec(source)) !== null) {
    exports.push("default");
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

function parseImportedNames(clause) {
    if (!clause) {
        return [];
    }

    const names = [];

    const cleaned = clause
        .replace(/\s+/g, " ")
        .trim();

    if (cleaned.startsWith("*")) {
        return ["*"];
    }

    const braceMatch = cleaned.match(/\{([^}]*)\}/);

    if (braceMatch) {
        const namedImports = braceMatch[1]
            .split(",")
            .map(item => {
                return item
                    .trim()
                    .split(/\s+as\s+/i)[0]
                    .trim();
            })
            .filter(Boolean);

        names.push(...namedImports);
    }

    const defaultPart = cleaned
        .split(",")[0]
        .trim();

    if (
        defaultPart &&
        !defaultPart.startsWith("{") &&
        !defaultPart.startsWith("*")
    ) {
        names.push("default");
    }

    return [...new Set(names)];
}

function createModuleMap(modules) {
    const map = new Map();

    for (const module of modules) {
        const absolutePath = path.resolve(
            PROJECT_ROOT,
            module.path
        );

        map.set(
            path.normalize(absolutePath),
            module
        );
    }

    return map;
}

export function scanProjectStructure() {
    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        structure: scanDirectory(PROJECT_ROOT)
    };
}

export function analyzeProjectModules() {
    const modules = analyzeDirectory(PROJECT_ROOT);

    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        files: modules
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

        for (const importInfo of module.imports) {
            const resolution = resolveLocalImport(
                sourceFile,
                importInfo.module
            );

            dependencies.push({
                source: module.path,
                import: importInfo.module,
                clause: importInfo.clause,
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

export function analyzeImportExportCompatibility() {
    const modules = analyzeDirectory(PROJECT_ROOT);
    const moduleMap = createModuleMap(modules);

    const findings = [];

    for (const module of modules) {
        const sourceFile = path.resolve(
            PROJECT_ROOT,
            module.path
        );

        for (const importInfo of module.imports) {
            if (!importInfo.module.startsWith(".")) {
                continue;
            }

            const resolution = resolveLocalImport(
                sourceFile,
                importInfo.module
            );

            if (!resolution.resolved) {
                findings.push({
                    severity: "error",
                    type: "missing-local-module",
                    source: module.path,
                    import: importInfo.module,
                    message:
                        "Local import target could not be resolved."
                });

                continue;
            }

            const targetAbsolutePath = path.normalize(
                path.resolve(
                    PROJECT_ROOT,
                    resolution.target
                )
            );

            const targetModule =
                moduleMap.get(targetAbsolutePath);

            if (!targetModule) {
                findings.push({
                    severity: "error",
                    type: "unindexed-module",
                    source: module.path,
                    import: importInfo.module,
                    target: resolution.target,
                    message:
                        "Resolved module was not found in the analyzer module index."
                });

                continue;
            }

            const importedNames =
                parseImportedNames(importInfo.clause);

            if (importedNames.length === 0) {
                findings.push({
                    severity: "info",
                    type: "module-import",
                    source: module.path,
                    import: importInfo.module,
                    target: resolution.target,
                    status: "compatible",
                    message:
                        "Module import detected; no named import compatibility check required."
                });

                continue;
            }

            for (const importedName of importedNames) {
                if (importedName === "*") {
                    findings.push({
                        severity: "info",
                        type: "namespace-import",
                        source: module.path,
                        import: importInfo.module,
                        target: resolution.target,
                        status: "compatible",
                        message:
                            "Namespace import detected."
                    });

                    continue;
                }

                const compatible =
                    targetModule.exports.includes(
                        importedName
                    );

                findings.push({
                    severity: compatible
                        ? "info"
                        : "error",
                    type: "named-import-export-check",
                    source: module.path,
                    import: importedName,
                    target: resolution.target,
                    exportedNames:
                        targetModule.exports,
                    status: compatible
                        ? "compatible"
                        : "mismatch",
                    message: compatible
                        ? "Imported name is exported by the target module."
                        : "Imported name is not exported by the target module."
                });
            }
        }
    }

    return {
        projectRoot: PROJECT_ROOT,
        generatedAt: new Date().toISOString(),
        findings
    };
}

export function analyzeUnresolvedImports() {
    const projectRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../.."
    );

    const moduleAnalysis = analyzeProjectModules();

    const findings = [];

    for (const file of moduleAnalysis.files) {
        for (const imported of file.imports) {
            const importPath = imported.module;

            // Only inspect local relative imports.
            if (!importPath || !importPath.startsWith(".")) {
                continue;
            }

            const sourceDirectory = path.dirname(
                path.join(projectRoot, file.path)
            );

            const resolvedPath = path.resolve(
                sourceDirectory,
                importPath
            );

            const candidates = [
                resolvedPath,
                `${resolvedPath}.js`,
                `${resolvedPath}.json`,
                path.join(resolvedPath, "index.js")
            ];

            const exists = candidates.some(candidate =>
                fs.existsSync(candidate)
            );

            if (!exists) {
                findings.push({
                    severity: "error",
                    type: "unresolved-local-import",
                    source: file.path,
                    import: importPath,
                    status: "missing",
                    message: "Local import does not resolve to an existing file."
                });
            } else {
                findings.push({
                    severity: "info",
                    type: "unresolved-local-import",
                    source: file.path,
                    import: importPath,
                    status: "resolved",
                    message: "Local import resolves successfully."
                });
            }
        }
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        findings
    };
}

export function analyzeOrphanedModules() {
    const projectRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../.."
    );

    const moduleAnalysis = analyzeProjectModules();

    const files = moduleAnalysis.files
        .map(file => file.path)
        .filter(filePath => filePath.endsWith(".js"));

    const importedFiles = new Set();

    for (const file of moduleAnalysis.files) {
        for (const imported of file.imports) {
            const importPath = imported.module;

            if (!importPath || !importPath.startsWith(".")) {
                continue;
            }

            const sourceDirectory = path.dirname(
                path.join(projectRoot, file.path)
            );

            const resolvedPath = path.resolve(
                sourceDirectory,
                importPath
            );

            const candidates = [
                resolvedPath,
                `${resolvedPath}.js`,
                `${resolvedPath}.json`,
                path.join(resolvedPath, "index.js")
            ];

            const matchedCandidate = candidates.find(candidate =>
                fs.existsSync(candidate)
            );

            if (matchedCandidate) {
                const relativeTarget = path.normalize(
                    path.relative(projectRoot, matchedCandidate)
                );

                importedFiles.add(relativeTarget);
            }
        }
    }

    const findings = [];

    const allowedEntryPoints = [
        path.normalize("server/app.js"),
        path.normalize("server/diagnostic/architectureScanner.js")
    ];

    const intentionalStandaloneModules = [
        path.normalize("server/config/env.js")
    ];

    for (const filePath of files) {
        const normalizedPath = path.normalize(filePath);

        if (allowedEntryPoints.includes(normalizedPath)) {
            continue;
        }

        if (intentionalStandaloneModules.includes(normalizedPath)) {
            findings.push({
                severity: "info",
                type: "standalone-module",
                source: filePath,
                status: "not-imported",
                message:
                    "Module is not imported by another module and is classified as an intentional standalone configuration file."
            });

            continue;
        }

        if (!importedFiles.has(normalizedPath)) {
            findings.push({
                severity: "warning",
                type: "orphaned-module",
                source: filePath,
                status: "not-imported",
                message:
                    "JavaScript module is not imported by another project module and should be reviewed for duplication, legacy code, or missing integration."
            });
        }
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        findings
    };
}

export function analyzeLayerRelationships() {
    const projectRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../.."
    );

    const moduleAnalysis = analyzeProjectModules();

    const findings = [];

    const normalize = value =>
        path.normalize(value).replace(/\\/g, "/");

    const resolveLocalImport = (sourcePath, importPath) => {
        if (!importPath || !importPath.startsWith(".")) {
            return null;
        }

        const sourceDirectory = path.dirname(
            path.join(projectRoot, sourcePath)
        );

        const resolvedPath = path.resolve(
            sourceDirectory,
            importPath
        );

        const candidates = [
            resolvedPath,
            `${resolvedPath}.js`,
            `${resolvedPath}.json`,
            path.join(resolvedPath, "index.js")
        ];

        const matched = candidates.find(candidate =>
            fs.existsSync(candidate)
        );

        if (!matched) {
            return null;
        }

        return normalize(
            path.relative(projectRoot, matched)
        );
    };

    const findModule = modulePath =>
        moduleAnalysis.files.find(
            file =>
                normalize(file.path) === normalize(modulePath)
        );

    for (const file of moduleAnalysis.files) {
        const sourcePath = normalize(file.path);

        /*
         * Routes must normally connect to controllers.
         */
        if (sourcePath.includes("/routes/")) {
            const controllerImports = file.imports
                .filter(imported =>
                    imported.module &&
                    imported.module.startsWith(".")
                )
                .map(imported => ({
                    imported,
                    target: resolveLocalImport(
                        file.path,
                        imported.module
                    )
                }))
                .filter(item =>
                    item.target &&
                    item.target.includes("/controllers/")
                );

            if (controllerImports.length === 0) {
                findings.push({
                    severity: "warning",
                    type: "layer-relationship",
                    source: file.path,
                    expected: "controller",
                    status: "missing",
                    message:
                        "Route module does not import an expected controller module."
                });

                continue;
            }

            for (const match of controllerImports) {
                const targetModule = findModule(match.target);

                if (!targetModule) {
                    findings.push({
                        severity: "error",
                        type: "layer-relationship",
                        source: file.path,
                        target: match.target,
                        expected: "controller",
                        status: "unresolved",
                        message:
                            "Expected controller could not be analyzed."
                    });

                    continue;
                }

                findings.push({
                    severity: "info",
                    type: "layer-relationship",
                    source: file.path,
                    target: match.target,
                    expected: "controller",
                    status: "compatible",
                    message:
                        "Route correctly connects to the expected controller layer."
                });
            }

            continue;
        }

        /*
         * Health/infrastructure controllers are allowed to communicate
         * directly with infrastructure such as the database.
         */
        if (sourcePath.endsWith("/controllers/healthController.js")) {
            findings.push({
                severity: "info",
                type: "layer-relationship",
                source: file.path,
                expected: "infrastructure-controller",
                status: "allowed",
                message:
                    "Health controller is classified as an infrastructure controller; direct infrastructure access is allowed."
            });

            continue;
        }

        /*
         * Business controllers must normally connect to services.
         */
        if (sourcePath.includes("/controllers/")) {
            const serviceImports = file.imports
                .filter(imported =>
                    imported.module &&
                    imported.module.startsWith(".")
                )
                .map(imported => ({
                    imported,
                    target: resolveLocalImport(
                        file.path,
                        imported.module
                    )
                }))
                .filter(item =>
                    item.target &&
                    item.target.includes("/services/")
                );

            if (serviceImports.length === 0) {
                findings.push({
                    severity: "warning",
                    type: "layer-relationship",
                    source: file.path,
                    expected: "service",
                    status: "missing",
                    message:
                        "Business controller does not import an expected service module."
                });

                continue;
            }

            for (const match of serviceImports) {
                const targetModule = findModule(match.target);

                if (!targetModule) {
                    findings.push({
                        severity: "error",
                        type: "layer-relationship",
                        source: file.path,
                        target: match.target,
                        expected: "service",
                        status: "unresolved",
                        message:
                            "Expected service could not be analyzed."
                    });

                    continue;
                }

                findings.push({
                    severity: "info",
                    type: "layer-relationship",
                    source: file.path,
                    target: match.target,
                    expected: "service",
                    status: "compatible",
                    message:
                        "Controller correctly connects to the expected service layer."
                });
            }
        }
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        findings
    };
}