// ==========================================
// Universal Pharmacy Platform
// Business Capability Probe
// ==========================================

import fs from "fs";
import path from "path";

import { INSPECTION_MATRIX } from "./inspectionMatrix.js";

import {
    getRuntimeEvidence
} from "./runtimeEvidenceRegistry.js";


// ==========================================
// File Discovery
// ==========================================

const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "coverage",
    "dist",
    "build"
]);


function walkDirectory(
    directory,
    files = []
) {

    if (!fs.existsSync(directory)) {
        return files;
    }


    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );


    for (
        const entry
        of entries
    ) {

        const fullPath =
            path.join(
                directory,
                entry.name
            );


        if (entry.isDirectory()) {

            if (
                IGNORED_DIRECTORIES.has(
                    entry.name
                )
            ) {
                continue;
            }


            walkDirectory(
                fullPath,
                files
            );

            continue;
        }


        if (
            entry.isFile() &&
            entry.name.endsWith(".js")
        ) {

            files.push(
                fullPath
            );
        }
    }


    return files;
}


// ==========================================
// Source Reading
// ==========================================

function readSourceFile(
    filePath
) {

    try {

        return fs.readFileSync(
            filePath,
            "utf8"
        );

    } catch {

        return "";
    }
}


function normalizePath(
    projectRoot,
    filePath
) {

    return path
        .relative(
            projectRoot,
            filePath
        )
        .split(
            path.sep
        )
        .join("/");
}


function normalizeText(
    value
) {

    return String(
        value || ""
    )
        .toLowerCase()
        .trim();
}


// ==========================================
// Project Context
// ==========================================

function buildProjectContext(
    projectRoot
) {

    const sourceFiles =
        walkDirectory(
            projectRoot
        );


    const files =
        sourceFiles.map(
            absolutePath => ({
                absolutePath,

                relativePath:
                    normalizePath(
                        projectRoot,
                        absolutePath
                    ),

                source:
                    readSourceFile(
                        absolutePath
                    )
            })
        );


    return {
        projectRoot,
        files,

        findFile(
            relativePath
        ) {

            return files.find(
                file =>
                    file.relativePath ===
                    relativePath
            );
        },

        findFilesContaining(
            text
        ) {

            const needle =
                normalizeText(
                    text
                );


            return files.filter(
                file =>
                    normalizeText(
                        file.source
                    ).includes(
                        needle
                    )
            );
        }
    };
}


// ==========================================
// Generic Evidence Helpers
// ==========================================

function createEvidence(
    type,
    target,
    status,
    details = {}
) {

    return {
        type,
        target,
        status,
        ...details
    };
}


function allEvidencePassed(
    evidence
) {

    return (
        evidence.length > 0 &&
        evidence.every(
            item =>
                item.status ===
                "PRESENT"
        )
    );
}


function someEvidencePassed(
    evidence
) {

    return evidence.some(
        item =>
            item.status ===
            "PRESENT" ||
            item.status ===
            "PARTIAL"
    );
}


// ==========================================
// Directory Evidence
// ==========================================

function inspectDirectories(
    targets,
    context
) {

    return targets.map(
        target => {

            const fullPath =
                path.join(
                    context.projectRoot,
                    target
                );


            const exists =
                fs.existsSync(
                    fullPath
                );


            return createEvidence(
                "directory",
                target,
                exists
                    ? "PRESENT"
                    : "MISSING"
            );
        }
    );
}


// ==========================================
// Module Evidence
// ==========================================

function inspectModules(
    targets,
    context
) {

    return targets.map(
        target => {

            const file =
                context.findFile(
                    target
                );


            return createEvidence(
                "module",
                target,
                file
                    ? "PRESENT"
                    : "MISSING",
                file
                    ? {
                        file:
                            file.relativePath
                    }
                    : {}
            );
        }
    );
}


// ==========================================
// Expected Field Evidence
// ==========================================

function inspectExpectedFields(
    targets,
    context
) {

    return targets.map(
        target => {

            const matches =
                context.findFilesContaining(
                    target
                );


            return createEvidence(
                "field",
                target,
                matches.length > 0
                    ? "PRESENT"
                    : "MISSING",
                {
                    files:
                        matches.map(
                            file =>
                                file.relativePath
                        )
                }
            );
        }
    );
}


// ==========================================
// Movement Authority
// ==========================================

const MOVEMENT_AUTHORITY =
    "server/services/stockMovementService.js";


function getMovementAuthority(
    context
) {

    return context.findFile(
        MOVEMENT_AUTHORITY
    );
}


function getMovementTypeEvidence(
    movementType,
    context
) {

    const authority =
        getMovementAuthority(
            context
        );


    if (!authority) {

        return createEvidence(
            "movementType",
            movementType,
            "MISSING",
            {
                reason:
                    "Stock movement authority was not found."
            }
        );
    }


    const source =
        authority.source;


    const supported =
        new RegExp(
            `"${movementType}"`
        ).test(
            source
        );


    const explicitlyUnsupported =
        movementType ===
        "ADJUSTMENT" &&

        (
            source.includes(
                "not yet supported"
            ) ||

            source.includes(
                "NOT YET AUTOMATIC"
            )
        );


    if (
        explicitlyUnsupported
    ) {

        return createEvidence(
            "movementType",
            movementType,
            "BLOCKED",
            {
                file:
                    authority.relativePath,

                reason:
                    "Movement type is explicitly recognized but controlled execution is not implemented."
            }
        );
    }


    return createEvidence(
        "movementType",
        movementType,
        supported
            ? "PRESENT"
            : "MISSING",
        {
            file:
                authority.relativePath
        }
    );
}


// ==========================================
// Movement Direction Evidence
// ==========================================

function getExpectedDirectionEvidence(
    movementType,
    expectedDirection,
    context
) {

    const authority =
        getMovementAuthority(
            context
        );


    if (!authority) {

        return createEvidence(
            "expectedDirection",
            `${movementType}:${expectedDirection}`,
            "MISSING",
            {
                reason:
                    "Stock movement authority was not found."
            }
        );
    }


    const source =
        authority.source;


    const directionMap = {

        INCREASE: [
            "PURCHASE",
            "RETURN",
            "TRANSFER_IN"
        ],

        DECREASE: [
            "SALE",
            "DAMAGE",
            "EXPIRED",
            "TRANSFER_OUT"
        ]
    };


    const expectedTypes =
        directionMap[
            expectedDirection
        ] || [];


    if (
        !expectedTypes.includes(
            movementType
        )
    ) {

        return createEvidence(
            "expectedDirection",
            `${movementType}:${expectedDirection}`,
            "MISSING",
            {
                file:
                    authority.relativePath,

                reason:
                    "No known semantic mapping exists for this movement direction."
            }
        );
    }


    const movementPresent =
        source.includes(
            `"${movementType}"`
        );


    const quantityChangePresent =
        source.includes(
            "quantityChange"
        );


    if (
        movementPresent &&
        quantityChangePresent
    ) {

        return createEvidence(
            "expectedDirection",
            `${movementType}:${expectedDirection}`,
            "PRESENT",
            {
                file:
                    authority.relativePath
            }
        );
    }


    return createEvidence(
        "expectedDirection",
        `${movementType}:${expectedDirection}`,
        "MISSING",
        {
            file:
                authority.relativePath
        }
    );
}


// ==========================================
// Movement Type Collection Evidence
// ==========================================

function inspectMovementTypes(
    targets,
    context
) {

    return targets.map(
        target =>
            getMovementTypeEvidence(
                target,
                context
            )
    );
}


// ==========================================
// Static Control Evidence
// ==========================================

function inspectExpectedControls(
    targets,
    context
) {

    return targets.map(
        target => {

            const matches =
                context.findFilesContaining(
                    target
                );


            if (
                matches.length > 0
            ) {

                return createEvidence(
                    "control",
                    target,
                    "PRESENT",
                    {
                        files:
                            matches.map(
                                file =>
                                    file.relativePath
                            )
                    }
                );
            }


            return createEvidence(
                "control",
                target,
                "MISSING"
            );
        }
    );
}


// ==========================================
// Architecture Check Evidence
// ==========================================

function inspectChecks(
    targets,
    context
) {

    const scanner =
        context.findFile(
            "server/diagnostic/architectureScanner.js"
        );


    return targets.map(
        target => {

            const functionNames = {

                "unresolved-imports":
                    "analyzeUnresolvedImports",

                "dependency-cycles":
                    "analyzeDependencyCycles",

                "import-export-compatibility":
                    "analyzeImportExportCompatibility"
            };


            const functionName =
                functionNames[target];


            const present =
                scanner &&
                scanner.source.includes(
                    functionName
                );


            return createEvidence(
                "check",
                target,
                present
                    ? "PRESENT"
                    : "MISSING",
                scanner
                    ? {
                        file:
                            scanner.relativePath,

                        function:
                            functionName
                    }
                    : {}
            );
        }
    );
}


// ==========================================
// Relationship Evidence
// ==========================================

function inspectRelationships(
    targets,
    context
) {

    const scanner =
        context.findFile(
            "server/diagnostic/architectureScanner.js"
        );


    return targets.map(
        target => {

            const relationshipMap = {

                "route-to-controller":
                    "analyzeApiRouteIntegrity",

                "controller-to-service":
                    "analyzeLayerRelationships"
            };


            const functionName =
                relationshipMap[target];


            const present =
                scanner &&
                scanner.source.includes(
                    functionName
                );


            return createEvidence(
                "relationship",
                target,
                present
                    ? "PRESENT"
                    : "MISSING",
                scanner
                    ? {
                        file:
                            scanner.relativePath,

                        function:
                            functionName
                    }
                    : {}
            );
        }
    );
}


// ==========================================
// Runtime Assertions
// ==========================================

function inspectRuntimeAssertions(
    capabilityId,
    targets
) {

    return targets.map(
        target => {

            const runtimeEvidence =
                getRuntimeEvidence(
                    capabilityId,
                    target
                );


            if (
                !runtimeEvidence
            ) {

                return createEvidence(
                    "runtimeAssertion",
                    target,
                    "UNVERIFIED",
                    {
                        reason:
                            "No recorded runtime evidence exists for this assertion."
                    }
                );
            }


            const status =
                runtimeEvidence.status ===
                "PASSED"
                    ? "PRESENT"
                    : runtimeEvidence.status ===
                    "BLOCKED"
                        ? "BLOCKED"
                        : runtimeEvidence.status ===
                        "FAILED"
                            ? "MISSING"
                            : "UNVERIFIED";


            return createEvidence(
                "runtimeAssertion",
                target,
                status,
                {
                    runtimeStatus:
                        runtimeEvidence.status,

                    verified:
                        runtimeEvidence.verified,

                    source:
                        runtimeEvidence.source,

                    evidence:
                        runtimeEvidence.evidence,

                    details:
                        runtimeEvidence.details,

                    recordedAt:
                        runtimeEvidence.recordedAt
                }
            );
        }
    );
}

// ==========================================
// Evidence Target Interpreter
// ==========================================

function inspectCapabilityTargets(
    capability,
    context
) {

    const targets =
        capability.evidenceTargets ||
        {};


    const evidence = [];


    if (
        Array.isArray(
            targets.directories
        )
    ) {

        evidence.push(
            ...inspectDirectories(
                targets.directories,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.relationships
        )
    ) {

        evidence.push(
            ...inspectRelationships(
                targets.relationships,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.checks
        )
    ) {

        evidence.push(
            ...inspectChecks(
                targets.checks,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.modules
        )
    ) {

        evidence.push(
            ...inspectModules(
                targets.modules,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.expectedFields
        )
    ) {

        evidence.push(
            ...inspectExpectedFields(
                targets.expectedFields,
                context
            )
        );
    }


    if (
        targets.movementType
    ) {

        evidence.push(
            getMovementTypeEvidence(
                targets.movementType,
                context
            )
        );
    }


    if (
        targets.movementType &&
        targets.expectedDirection
    ) {

        evidence.push(
            getExpectedDirectionEvidence(
                targets.movementType,
                targets.expectedDirection,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.movementTypes
        )
    ) {

        evidence.push(
            ...inspectMovementTypes(
                targets.movementTypes,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.expectedControls
        )
    ) {

        evidence.push(
            ...inspectExpectedControls(
                targets.expectedControls,
                context
            )
        );
    }


    if (
        Array.isArray(
            targets.runtimeAssertions
        )
    ) {

        evidence.push(
            ...inspectRuntimeAssertions(
    capability.id,
    targets.runtimeAssertions
)
        );
    }


    return evidence;
}


// ==========================================
// Capability Evaluation
// ==========================================

function determineStatus(
    evidence
) {

    const hasBlocked =
        evidence.some(
            item =>
                item.status ===
                "BLOCKED"
        );


    const hasPresent =
        evidence.some(
            item =>
                item.status ===
                "PRESENT"
        );


    const hasPartial =
        evidence.some(
            item =>
                item.status ===
                "PARTIAL"
        );


    const hasMissing =
        evidence.some(
            item =>
                item.status ===
                "MISSING"
        );


    const hasUnverified =
        evidence.some(
            item =>
                item.status ===
                "UNVERIFIED"
        );


    // ==========================================
    // Explicit Capability Block
    // ==========================================

    if (
        hasBlocked
    ) {

        return "BLOCKED";
    }


    // ==========================================
    // Fully Verified Static Evidence
    // ==========================================

    if (
        allEvidencePassed(
            evidence
        )
    ) {

        return "PRESENT";
    }


    // ==========================================
    // Implementation Exists But Runtime Proof
    // Is Still Required
    // ==========================================

    if (
        hasUnverified &&
        !hasMissing &&
        !hasPartial &&
        !hasPresent
    ) {

        return "UNVERIFIED";
    }


    // ==========================================
    // Some Evidence Exists, But Capability Is
    // Not Completely Established
    // ==========================================

    if (
        hasPresent ||
        hasPartial
    ) {

        return "PARTIAL";
    }


    // ==========================================
    // No Evidence Found
    // ==========================================

    return "MISSING";
}


function probeCapability(
    capability,
    context
) {

    const evidence =
        inspectCapabilityTargets(
            capability,
            context
        );


    const status =
        determineStatus(
            evidence
        );


    return {
        capabilityId:
            capability.id,

        title:
            capability.title,

        domain:
            capability.domain,

        priority:
            capability.priority,

        requiredEvidence:
            capability.requiredEvidence,

        status,

        evidence,

        presentEvidenceCount:
            evidence.filter(
                item =>
                    item.status ===
                    "PRESENT"
            ).length,

        partialEvidenceCount:
            evidence.filter(
                item =>
                    item.status ===
                    "PARTIAL"
            ).length,

        missingEvidenceCount:
            evidence.filter(
                item =>
                    item.status ===
                    "MISSING"
            ).length,

        unverifiedEvidenceCount:
            evidence.filter(
                item =>
                    item.status ===
                    "UNVERIFIED"
            ).length,

        blockedEvidenceCount:
            evidence.filter(
                item =>
                    item.status ===
                    "BLOCKED"
            ).length
    };
}


// ==========================================
// Main Business Capability Probe
// ==========================================

export function probeBusinessCapabilities(
    projectRoot
) {

    const context =
        buildProjectContext(
            projectRoot
        );


    const capabilities =
        INSPECTION_MATRIX.map(
            capability =>
                probeCapability(
                    capability,
                    context
                )
        );


        const summary = {
        total:
            capabilities.length,

        present:
            capabilities.filter(
                capability =>
                    capability.status ===
                    "PRESENT"
            ).length,

        partial:
            capabilities.filter(
                capability =>
                    capability.status ===
                    "PARTIAL"
            ).length,

        unverified:
            capabilities.filter(
                capability =>
                    capability.status ===
                    "UNVERIFIED"
            ).length,

        missing:
            capabilities.filter(
                capability =>
                    capability.status ===
                    "MISSING"
            ).length,

        blocked:
            capabilities.filter(
                capability =>
                    capability.status ===
                    "BLOCKED"
            ).length,

        scannedFiles:
            context.files.length
    };
    return {
        projectRoot,

        generatedAt:
            new Date(),

        summary,

        capabilities
    };
}


// ==========================================
// Default Export
// ==========================================

export default {
    probeBusinessCapabilities
};