// ==========================================
// Universal Pharmacy Platform
// Runtime Evidence Registry
// ==========================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==========================================
// Runtime Paths
// ==========================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

const EVIDENCE_FILE =
    path.join(
        __dirname,
        "runtimeEvidence.json"
    );


// ==========================================
// Evidence Storage
// ==========================================

const runtimeEvidence =
    new Map();


// ==========================================
// Evidence Key
// ==========================================

function createEvidenceKey(
    capabilityId,
    assertion
) {

    return `${capabilityId}::${assertion}`;
}


// ==========================================
// Evidence Serialization
// ==========================================

function serializeEvidence(
    evidence
) {

    return {
        ...evidence,

        recordedAt:
            evidence.recordedAt instanceof Date
                ? evidence.recordedAt.toISOString()
                : evidence.recordedAt
    };
}


// ==========================================
// Persistent Evidence Loading
// ==========================================

function loadPersistentEvidence() {

    if (
        !fs.existsSync(
            EVIDENCE_FILE
        )
    ) {

        return;
    }


    try {

        const raw =
            fs.readFileSync(
                EVIDENCE_FILE,
                "utf8"
            );


        if (
            !raw.trim()
        ) {

            return;
        }


        const storedEvidence =
            JSON.parse(
                raw
            );


        if (
            !Array.isArray(
                storedEvidence
            )
        ) {

            return;
        }


        for (
            const evidence
            of storedEvidence
        ) {

            if (
                !evidence ||
                !evidence.capabilityId ||
                !evidence.assertion
            ) {

                continue;
            }


            const key =
                createEvidenceKey(
                    evidence.capabilityId,
                    evidence.assertion
                );


            runtimeEvidence.set(
                key,
                {
                    ...evidence,

                    recordedAt:
                        evidence.recordedAt
                            ? new Date(
                                evidence.recordedAt
                            )
                            : new Date()
                }
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "Failed to load runtime evidence:",
            error.message
        );
    }
}


// ==========================================
// Persistent Evidence Saving
// ==========================================

function savePersistentEvidence() {

    const evidence =
        Array.from(
            runtimeEvidence.values()
        ).map(
            serializeEvidence
        );


    const temporaryFile =
        `${EVIDENCE_FILE}.tmp`;


    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(
            evidence,
            null,
            2
        ),
        "utf8"
    );


    fs.renameSync(
        temporaryFile,
        EVIDENCE_FILE
    );
}


// ==========================================
// Initial Evidence Recovery
// ==========================================

loadPersistentEvidence();


// ==========================================
// Record Runtime Evidence
// ==========================================

export function recordRuntimeEvidence(
    capabilityId,
    assertion,
    result = {}
) {

    const key =
        createEvidenceKey(
            capabilityId,
            assertion
        );


    const evidence = {
        capabilityId,

        assertion,

        status:
            result.status ||
            "PASSED",

        verified:
            result.verified !== false,

        source:
            result.source ||
            "runtime-probe",

        evidence:
            result.evidence ||
            null,

        details:
            result.details ||
            null,

        recordedAt:
            new Date()
    };


    runtimeEvidence.set(
        key,
        evidence
    );


    savePersistentEvidence();


    return evidence;
}


// ==========================================
// Retrieve Assertion Evidence
// ==========================================

export function getRuntimeEvidence(
    capabilityId,
    assertion
) {

    const key =
        createEvidenceKey(
            capabilityId,
            assertion
        );


    return (
        runtimeEvidence.get(
            key
        ) ||
        null
    );
}


// ==========================================
// Retrieve Capability Evidence
// ==========================================

export function getCapabilityRuntimeEvidence(
    capabilityId
) {

    return Array.from(
        runtimeEvidence.values()
    ).filter(
        evidence =>
            evidence.capabilityId ===
            capabilityId
    );
}


// ==========================================
// Check Assertion
// ==========================================

export function hasRuntimeEvidence(
    capabilityId,
    assertion
) {

    return Boolean(
        getRuntimeEvidence(
            capabilityId,
            assertion
        )
    );
}


// ==========================================
// Runtime Evidence Summary
// ==========================================

export function summarizeRuntimeEvidence() {

    const evidence =
        Array.from(
            runtimeEvidence.values()
        );


    return {
        total:
            evidence.length,

        passed:
            evidence.filter(
                item =>
                    item.status ===
                    "PASSED"
            ).length,

        failed:
            evidence.filter(
                item =>
                    item.status ===
                    "FAILED"
            ).length,

        blocked:
            evidence.filter(
                item =>
                    item.status ===
                    "BLOCKED"
            ).length,

        capabilities:
            [
                ...new Set(
                    evidence.map(
                        item =>
                            item.capabilityId
                    )
                )
            ].length,

        evidenceFile:
            EVIDENCE_FILE
    };
}


// ==========================================
// Export Runtime Evidence
// ==========================================

export function exportRuntimeEvidence() {

    return Array.from(
        runtimeEvidence.values()
    );
}


// ==========================================
// Clear Runtime Evidence
// ==========================================

export function clearRuntimeEvidence() {

    runtimeEvidence.clear();


    if (
        fs.existsSync(
            EVIDENCE_FILE
        )
    ) {

        fs.unlinkSync(
            EVIDENCE_FILE
        );
    }
}


// ==========================================
// Default Export
// ==========================================

export default {

    recordRuntimeEvidence,

    getRuntimeEvidence,

    getCapabilityRuntimeEvidence,

    hasRuntimeEvidence,

    summarizeRuntimeEvidence,

    exportRuntimeEvidence,

    clearRuntimeEvidence
};