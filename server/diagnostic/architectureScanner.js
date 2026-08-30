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

export function analyzeDependencyCycles() {
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

    const graph = new Map();

    for (const file of moduleAnalysis.files) {
        const source = normalize(file.path);

        if (!graph.has(source)) {
            graph.set(source, []);
        }

        for (const imported of file.imports) {
            const target = resolveLocalImport(
                file.path,
                imported.module
            );

            if (target) {
                graph.get(source).push(target);
            }
        }
    }

    const cycles = [];
    const reportedCycles = new Set();

    function canonicalizeCycle(cycle) {
        const nodes = cycle.slice(0, -1);

        const rotations = nodes.map((_, index) => {
            const rotated = [
                ...nodes.slice(index),
                ...nodes.slice(0, index)
            ];

            return rotated.join(" -> ");
        });

        return rotations.sort()[0];
    }

    function dfs(node, pathStack, visiting) {
        if (visiting.has(node)) {
            const cycleStart = pathStack.indexOf(node);

            if (cycleStart !== -1) {
                const cycle = [
                    ...pathStack.slice(cycleStart),
                    node
                ];

                const key = canonicalizeCycle(cycle);

                if (!reportedCycles.has(key)) {
                    reportedCycles.add(key);
                    cycles.push(cycle);
                }
            }

            return;
        }

        visiting.add(node);
        pathStack.push(node);

        for (const dependency of graph.get(node) || []) {
            dfs(
                dependency,
                pathStack,
                visiting
            );
        }

        pathStack.pop();
        visiting.delete(node);
    }

    for (const node of graph.keys()) {
        dfs(node, [], new Set());
    }

    if (cycles.length === 0) {
        findings.push({
            severity: "info",
            type: "dependency-cycle",
            status: "none-detected",
            message:
                "No local module dependency cycles were detected."
        });
    } else {
        for (const cycle of cycles) {
            findings.push({
                severity: "warning",
                type: "dependency-cycle",
                status: "cycle-detected",
                cycle,
                message:
                    "A circular dependency exists between local project modules."
            });
        }
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        findings
    };
}


export function analyzeUnusedExports() {
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
            path.join(resolvedPath, "index.js")
        ];

        const matched = candidates.find(candidate =>
            fs.existsSync(candidate) &&
            fs.statSync(candidate).isFile()
        );

        if (!matched) {
            return null;
        }

        return normalize(
            path.relative(projectRoot, matched)
        );
    };

    const isSymbolImportedFromSource = (
        sourceFile,
        exportedSymbol
    ) => {
        const normalizedSource = normalize(sourceFile);

        for (const importingFile of moduleAnalysis.files) {
            for (const imported of importingFile.imports || []) {
                if (!imported || typeof imported !== "object") {
                    continue;
                }

                const resolvedModule = resolveLocalImport(
                    importingFile.path,
                    imported.module
                );

                if (
                    !resolvedModule ||
                    resolvedModule !== normalizedSource
                ) {
                    continue;
                }

                const clause = imported.clause || "";

                const namedMatches = clause.match(
                    /\{([^}]+)\}/
                );

                if (namedMatches) {
                    for (const name of namedMatches[1].split(",")) {
                        const importedName = name
                            .trim()
                            .split(/\s+as\s+/)[0]
                            .trim();

                        if (importedName === exportedSymbol) {
                            return true;
                        }
                    }
                }

                if (
                    clause.startsWith("*") &&
                    exportedSymbol !== "default"
                ) {
                    return true;
                }
            }
        }

        return false;
    };
    /*
     * The diagnostic scanner is itself a public diagnostic API.
     * Its exported analysis functions are intentionally invoked
     * externally through Node's dynamic import mechanism.
     */
    const isDiagnosticModule =
        normalize("server/diagnostic/architectureScanner.js") ===
        normalize(path.relative(
            projectRoot,
            fileURLToPath(import.meta.url)
        ));

    const diagnosticExports = new Set([
        "scanProjectStructure",
        "analyzeProjectModules",
        "analyzeProjectDependencies",
        "analyzeImportExportCompatibility",
        "analyzeUnresolvedImports",
        "analyzeOrphanedModules",
        "analyzeLayerRelationships",
        "analyzeDependencyCycles",
        "analyzeUnusedExports"
    ]);

    for (const file of moduleAnalysis.files) {
        const source = normalize(file.path);

        for (const exported of file.exports || []) {
            /*
             * Default exports are reviewed separately because they
             * can be consumed by the application's entry graph.
             */
            if (exported === "default") {
                findings.push({
                    severity: "info",
                    type: "export-usage",
                    source: file.path,
                    export: exported,
                    status: "reviewed",
                    message:
                        "Default export detected; usage is reviewed separately from named exports."
                });

                continue;
            }

            /*
             * Diagnostic functions are intentionally public API.
             * They are executed through external Node imports rather
             * than imported by application modules.
             */
            if (
                isDiagnosticModule &&
                diagnosticExports.has(exported)
            ) {
                findings.push({
                    severity: "info",
                    type: "export-usage",
                    source: file.path,
                    export: exported,
                    status: "intentional-public-api",
                    message:
                        "Diagnostic analyzer export is intentionally exposed for external execution."
                });

                continue;
            }

            if (isSymbolImportedFromSource(file.path, exported)) {
                findings.push({
                    severity: "info",
                    type: "export-usage",
                    source: file.path,
                    export: exported,
                    status: "used",
                    message:
                        "Exported symbol is imported by another project module."
                });
            } else {
                findings.push({
                    severity: "warning",
                    type: "unused-export",
                    source: file.path,
                    export: exported,
                    status: "not-imported",
                    message:
                        "Exported symbol is not imported by another project module and should be reviewed for dead code or intentionally public API."
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

export function analyzeModuleReachability() {
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
            path.join(resolvedPath, "index.js")
        ];

        const matched = candidates.find(candidate =>
            fs.existsSync(candidate) &&
            fs.statSync(candidate).isFile()
        );

        if (!matched) {
            return null;
        }

        return normalize(
            path.relative(projectRoot, matched)
        );
    };

    const graph = new Map();

    for (const file of moduleAnalysis.files) {
        const source = normalize(file.path);

        if (!graph.has(source)) {
            graph.set(source, []);
        }

        for (const imported of file.imports || []) {
            const target = resolveLocalImport(
                file.path,
                imported.module
            );

            if (target) {
                graph.get(source).push(target);
            }
        }
    }

    const entryPoint = normalize("server/app.js");
    const reachable = new Set();

    function visit(modulePath) {
        if (reachable.has(modulePath)) {
            return;
        }

        reachable.add(modulePath);

        for (const dependency of graph.get(modulePath) || []) {
            visit(dependency);
        }
    }

    visit(entryPoint);

    for (const file of moduleAnalysis.files) {
        const source = normalize(file.path);

        if (reachable.has(source)) {
            findings.push({
                severity: "info",
                type: "module-reachability",
                source: file.path,
                status: "reachable",
                entryPoint,
                message:
                    "Module is reachable from the application entry point."
            });
        } else {
            findings.push({
                severity: "warning",
                type: "module-reachability",
                source: file.path,
                status: "unreachable",
                entryPoint,
                message:
                    "Module is not reachable from the application entry point."
            });
        }
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        entryPoint,
        reachableModules: [...reachable].sort(),
        findings
    };
}

export function analyzeApiRouteIntegrity() {
    const projectRoot = PROJECT_ROOT;
    const moduleAnalysis = analyzeProjectModules();
    const findings = [];

    const normalize = value =>
        path.normalize(value).replace(/\\/g, "/");

    const moduleMap = createModuleMap(moduleAnalysis.files);

    const routeFiles = moduleAnalysis.files.filter(file => {
        const normalizedPath = normalize(file.path);

        return (
            normalizedPath.startsWith("server/routes/") &&
            normalizedPath.endsWith(".js")
        );
    });

    for (const routeFile of routeFiles) {
        const absoluteRoutePath = path.resolve(
            projectRoot,
            routeFile.path
        );

        const source = fs.readFileSync(
            absoluteRoutePath,
            "utf8"
        );

        const routeImportMap = new Map();

        for (const imported of routeFile.imports || []) {
            const resolved = resolveLocalImport(
                absoluteRoutePath,
                imported.module
            );

            if (
                resolved.type !== "local" ||
                !resolved.resolved
            ) {
                continue;
            }

            const targetPath = path.normalize(
                path.resolve(
                    projectRoot,
                    resolved.target
                )
            );

            const targetModule = moduleMap.get(targetPath);

            if (!targetModule) {
                continue;
            }

            for (const name of parseImportedNames(
                imported.clause
            )) {
                routeImportMap.set(
                    name,
                    targetModule
                );
            }
        }

        const routePatterns = [
            {
                method: "GET",
                pattern:
                    /router\.get\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)/g
            },
            {
                method: "POST",
                pattern:
                    /router\.post\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)/g
            },
            {
                method: "PUT",
                pattern:
                    /router\.put\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)/g
            },
            {
                method: "PATCH",
                pattern:
                    /router\.patch\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)/g
            },
            {
                method: "DELETE",
                pattern:
                    /router\.delete\(\s*["']([^"']+)["']\s*,\s*([A-Za-z_$][\w$]*)/g
            }
        ];

        for (const routePattern of routePatterns) {
            let match;

            while (
                (match =
                    routePattern.pattern.exec(source)) !== null
            ) {
                const route = match[1];
                const handler = match[2];

                const targetModule =
                    routeImportMap.get(handler);

                if (!targetModule) {
                    findings.push({
                        severity: "warning",
                        type: "api-route-integrity",
                        source: routeFile.path,
                        method: routePattern.method,
                        route,
                        handler,
                        status: "invalid",
                        message:
                            "API route handler is not resolved from the route module imports."
                    });

                    continue;
                }

                const handlerExported =
                    targetModule.exports?.includes(handler);

                if (!handlerExported) {
                    findings.push({
                        severity: "warning",
                        type: "api-route-integrity",
                        source: routeFile.path,
                        method: routePattern.method,
                        route,
                        handler,
                        target: targetModule.path,
                        status: "invalid",
                        message:
                            "API route handler is imported, but the target module does not export that handler."
                    });

                    continue;
                }

                findings.push({
                    severity: "info",
                    type: "api-route-integrity",
                    source: routeFile.path,
                    method: routePattern.method,
                    route,
                    handler,
                    target: targetModule.path,
                    status: "valid",
                    message:
                        "API route resolves to a valid imported handler."
                });
            }
        }
    }

    if (findings.length === 0) {
        findings.push({
            severity: "info",
            type: "api-route-integrity",
            status: "none-detected",
            message:
                "No API route declarations were detected in server route modules."
        });
    }

    return {
        projectRoot,
        generatedAt: new Date().toISOString(),
        findings
    };
}

