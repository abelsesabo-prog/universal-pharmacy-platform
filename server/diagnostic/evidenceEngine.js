// ==========================================
// Universal Pharmacy Platform
// Diagnostic Evidence Engine
// ==========================================

import {
    INSPECTION_MATRIX,
    VERDICTS,
    CONFIDENCE_LEVELS
} from "./inspectionMatrix.js";

import {
    scanProjectStructure,
    analyzeProjectModules,
    analyzeProjectDependencies,
    analyzeDependencyCycles,
    analyzeUnresolvedImports,
    analyzeImportExportCompatibility,
    analyzeLayerRelationships,
    analyzeApiRouteIntegrity,
    analyzeModuleReachability,
    analyzeOrphanedModules,
    analyzeUnusedExports
} from "./architectureScanner.js";


// ==========================================
// Evidence Engine Configuration
// ==========================================

const SCANNER_DEFINITIONS = [
    {
        name: "projectStructure",
        execute: scanProjectStructure
    },

    {
        name: "projectModules",
        execute: analyzeProjectModules
    },

    {
        name: "projectDependencies",
        execute: analyzeProjectDependencies
    },

    {
        name: "dependencyCycles",
        execute: analyzeDependencyCycles
    },

    {
        name: "unresolvedImports",
        execute: analyzeUnresolvedImports
    },

    {
        name: "importExportCompatibility",
        execute: analyzeImportExportCompatibility
    },

    {
        name: "layerRelationships",
        execute: analyzeLayerRelationships
    },

    {
        name: "apiRouteIntegrity",
        execute: analyzeApiRouteIntegrity
    },

    {
        name: "moduleReachability",
        execute: analyzeModuleReachability
    },

    {
        name: "orphanedModules",
        execute: analyzeOrphanedModules
    },

    {
        name: "unusedExports",
        execute: analyzeUnusedExports
    }
];


// ==========================================
// Helpers
// ==========================================

function createEvidenceRecord(
    source,
    report
) {

    return {
        source,
        generatedAt:
            report?.generatedAt ||
            new Date(),

        findings:
            Array.isArray(
                report?.findings
            )
                ? report.findings
                : [],

        raw:
            report
    };
}


function getSeverityScore(
    severity
) {

    const scores = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
        INFO: 0
    };


    return (
        scores[
            String(
                severity || ""
            ).toUpperCase()
        ] ?? 0
    );
}


function getFindingStatus(
    finding
) {

    return String(
        finding?.status || ""
    ).toUpperCase();
}


function isProblemFinding(
    finding
) {

    const status =
        getFindingStatus(finding);


    if (
        [
            "FAILED",
            "FAIL",
            "INVALID",
            "MISSING",
            "UNRESOLVED",
            "ORPHANED",
            "UNUSED",
            "BROKEN"
        ].includes(status)
    ) {
        return true;
    }


    return (
        getSeverityScore(
            finding?.severity
        ) >= 2
    );
}


function isPositiveFinding(
    finding
) {

    const status =
        getFindingStatus(finding);


    return [
        "PASS",
        "PASSED",
        "VALID",
        "RESOLVED",
        "HEALTHY",
        "CONNECTED",
        "REACHABLE",
        "COMPLETE"
    ].includes(status);
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


function findingMatchesTarget(
    finding,
    target
) {

    const normalizedTarget =
        normalizeText(target);


    if (!normalizedTarget) {
        return false;
    }


    const searchableValues = [
        finding?.message,
        finding?.type,
        finding?.module,
        finding?.file,
        finding?.path,
        finding?.route,
        finding?.controller,
        finding?.service,
        finding?.layer,
        finding?.target
    ];


    return searchableValues
        .filter(Boolean)
        .some(value =>
            normalizeText(value).includes(
                normalizedTarget
            )
        );
}


// ==========================================
// Scanner Execution
// ==========================================

export async function collectArchitectureEvidence(
    projectRoot
) {

    const evidence = [];


    for (
        const scanner
        of SCANNER_DEFINITIONS
    ) {

        try {

            const report =
                await scanner.execute(
                    projectRoot
                );


            evidence.push(
                createEvidenceRecord(
                    scanner.name,
                    report
                )
            );

        } catch (error) {

            evidence.push({
                source:
                    scanner.name,

                generatedAt:
                    new Date(),

                findings: [
                    {
                        severity:
                            "HIGH",

                        type:
                            "SCANNER_EXECUTION_FAILURE",

                        status:
                            "FAILED",

                        message:
                            error.message
                    }
                ],

                raw: null,

                error:
                    error.message
            });
        }
    }


    return evidence;
}


// ==========================================
// Evidence Query Engine
// ==========================================

export function flattenFindings(
    evidence
) {

    return evidence.flatMap(
        evidenceRecord =>
            evidenceRecord.findings.map(
                finding => ({
                    ...finding,

                    evidenceSource:
                        evidenceRecord.source
                })
            )
    );
}


export function getProblemFindings(
    findings
) {

    return findings.filter(
        isProblemFinding
    );
}


export function getPositiveFindings(
    findings
) {

    return findings.filter(
        isPositiveFinding
    );
}


// ==========================================
// Capability Evidence Evaluation
// ==========================================

function getCapabilityTargets(
    capability
) {

    const evidence =
        capability.evidence ||
        {};


    const targets = [];


    for (
        const value
        of Object.values(evidence)
    ) {

        if (
            Array.isArray(value)
        ) {

            targets.push(
                ...value
            );

        } else if (value) {

            targets.push(value);
        }
    }


    return targets
        .map(normalizeText)
        .filter(Boolean);
}


function findCapabilityEvidence(
    capability,
    findings
) {

    const targets =
        getCapabilityTargets(
            capability
        );


    if (
        targets.length === 0
    ) {
        return [];
    }


    return findings.filter(
        finding =>
            targets.some(
                target =>
                    findingMatchesTarget(
                        finding,
                        target
                    )
            )
    );
}


function evaluateCapability(
    capability,
    allFindings
) {

    const matchedEvidence =
        findCapabilityEvidence(
            capability,
            allFindings
        );


    const positiveEvidence =
        getPositiveFindings(
            matchedEvidence
        );


    const problemEvidence =
        getProblemFindings(
            matchedEvidence
        );


    let verdict =
        VERDICTS.MISSING;

    let confidence =
        CONFIDENCE_LEVELS.LOW;


    if (
        positiveEvidence.length > 0 &&
        problemEvidence.length === 0
    ) {

        verdict =
            VERDICTS.BUILT;

        confidence =
            CONFIDENCE_LEVELS.HIGH;

    } else if (
        positiveEvidence.length > 0 &&
        problemEvidence.length > 0
    ) {

        verdict =
            VERDICTS.PARTIAL;

        confidence =
            CONFIDENCE_LEVELS.MEDIUM;

    } else if (
        problemEvidence.length > 0
    ) {

        verdict =
            VERDICTS.FAILED;

        confidence =
            CONFIDENCE_LEVELS.HIGH;
    }


    return {
        capabilityId:
            capability.id,

        title:
            capability.title,

        category:
            capability.category,

        priority:
            capability.priority,

        verdict,

        confidence,

        evidence: {
            matched:
                matchedEvidence,

            positive:
                positiveEvidence,

            problems:
                problemEvidence
        },

        gaps:
            verdict === VERDICTS.MISSING
                ? [
                    "No architecture evidence was found for this capability."
                ]
                : [],

        warnings:
            problemEvidence.map(
                finding =>
                    finding.message ||
                    "Architecture problem detected."
            )
    };
}


// ==========================================
// Full Constitutional Evaluation
// ==========================================

export function evaluateInspectionMatrix(
    evidence
) {

    const allFindings =
        flattenFindings(
            evidence
        );


    return INSPECTION_MATRIX.map(
        capability =>
            evaluateCapability(
                capability,
                allFindings
            )
    );
}


// ==========================================
// Diagnostic Summary
// ==========================================

export function summarizeEvidence(
    capabilityResults
) {

    const summary = {
        total:
            capabilityResults.length,

        built: 0,

        partial: 0,

        missing: 0,

        failed: 0,

        criticalProblems: 0,

        highProblems: 0
    };


    for (
        const result
        of capabilityResults
    ) {

        switch (
            result.verdict
        ) {

            case VERDICTS.BUILT:
                summary.built++;
                break;

            case VERDICTS.PARTIAL:
                summary.partial++;
                break;

            case VERDICTS.FAILED:
                summary.failed++;
                break;

            default:
                summary.missing++;
        }


        for (
            const problem
            of result.evidence.problems
        ) {

            const severity =
                String(
                    problem.severity || ""
                ).toUpperCase();


            if (
                severity === "CRITICAL"
            ) {
                summary.criticalProblems++;
            }


            if (
                severity === "HIGH"
            ) {
                summary.highProblems++;
            }
        }
    }


    return summary;
}


// ==========================================
// Full Evidence Inspection
// ==========================================

export async function inspectEvidence(
    projectRoot
) {

    const evidence =
        await collectArchitectureEvidence(
            projectRoot
        );


    const capabilities =
        evaluateInspectionMatrix(
            evidence
        );


    const summary =
        summarizeEvidence(
            capabilities
        );


    return {
        projectRoot,

        generatedAt:
            new Date(),

        evidence,

        capabilities,

        summary
    };
}


// ==========================================
// Default Export
// ==========================================

export default {
    collectArchitectureEvidence,
    flattenFindings,
    getProblemFindings,
    getPositiveFindings,
    evaluateInspectionMatrix,
    summarizeEvidence,
    inspectEvidence
};