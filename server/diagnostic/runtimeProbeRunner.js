// ==========================================
// Universal Pharmacy Platform
// Runtime Probe Runner
// ==========================================

import {
    recordRuntimeEvidence
} from "./runtimeEvidenceRegistry.js";


// ==========================================
// Probe Safety Levels
// ==========================================

const PROBE_SAFETY = {

    READ_ONLY:
        "READ_ONLY",

    CONTROLLED:
        "CONTROLLED",

    DESTRUCTIVE:
        "DESTRUCTIVE"
};


// ==========================================
// Default Runner Configuration
// ==========================================

const DEFAULT_OPTIONS = {

    baseUrl:
        process.env.DIAGNOSTIC_BASE_URL ||
        `http://localhost:${
            process.env.PORT || 10000
        }`,

    allowControlled:
        false,

    allowDestructive:
        false,

    source:
        "runtime-probe-runner"
};


// ==========================================
// Probe Result Normalization
// ==========================================

function normalizeProbeResult(
    result = {}
) {

    return {

        status:
            result.status ||
            "FAILED",

        verified:
            result.verified !== false,

        evidence:
            result.evidence ||
            null,

        details:
            result.details ||
            null
    };
}


// ==========================================
// Safe Fetch
// ==========================================

async function safeFetch(
    url,
    options = {}
) {

    try {

        const response =
            await fetch(
                url,
                options
            );


        let body =
            null;


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            try {

                body =
                    await response.json();

            } catch {

                body =
                    null;
            }

        } else {

            try {

                body =
                    await response.text();

            } catch {

                body =
                    null;
            }
        }


        return {

            ok:
                response.ok,

            status:
                response.status,

            body
        };

    } catch (
        error
    ) {

        return {

            ok:
                false,

            status:
                null,

            body:
                null,

            error:
                error.message
        };
    }
}


// ==========================================
// Probe Safety Check
// ==========================================

function isProbeAllowed(
    probe,
    options
) {

    const safety =
        probe.safety ||
        PROBE_SAFETY.READ_ONLY;


    if (
        safety ===
        PROBE_SAFETY.READ_ONLY
    ) {

        return true;
    }


    if (
        safety ===
        PROBE_SAFETY.CONTROLLED
    ) {

        return Boolean(
            options.allowControlled
        );
    }


    if (
        safety ===
        PROBE_SAFETY.DESTRUCTIVE
    ) {

        return Boolean(
            options.allowDestructive
        );
    }


    return false;
}


// ==========================================
// Runtime Assertion Registration
// ==========================================

function createAssertionResult(
    capabilityId,
    assertion,
    result,
    options
) {

    const normalized =
        normalizeProbeResult(
            result
        );


    return recordRuntimeEvidence(
        capabilityId,
        assertion,
        {
            ...normalized,

            source:
                options.source
        }
    );
}


// ==========================================
// Execute One Probe
// ==========================================

async function executeProbe(
    probe,
    options
) {

    const {

        capabilityId,

        assertion,

        safety =
            PROBE_SAFETY.READ_ONLY

    } = probe;


    if (
        !isProbeAllowed(
            probe,
            options
        )
    ) {

        return createAssertionResult(
            capabilityId,
            assertion,
            {
                status:
                    "BLOCKED",

                verified:
                    false,

                evidence:
                    {
                        safety
                    },

                details:
                    "Probe was not executed because its safety level is not permitted by the current runner configuration."
            },
            options
        );
    }


    if (
        typeof probe.execute !==
        "function"
    ) {

        return createAssertionResult(
            capabilityId,
            assertion,
            {
                status:
                    "FAILED",

                verified:
                    false,

                details:
                    "Probe does not provide an executable function."
            },
            options
        );
    }


    try {

        const result =
            await probe.execute({
                baseUrl:
                    options.baseUrl,

                safeFetch
            });


        return createAssertionResult(
            capabilityId,
            assertion,
            result,
            options
        );

    } catch (
        error
    ) {

        return createAssertionResult(
            capabilityId,
            assertion,
            {
                status:
                    "FAILED",

                verified:
                    false,

                details:
                    error.message
            },
            options
        );
    }
}


// ==========================================
// Execute Probe Collection
// ==========================================

export async function runRuntimeProbes(
    probes = [],
    customOptions = {}
) {

    const options = {

        ...DEFAULT_OPTIONS,

        ...customOptions
    };


    const results = [];


    for (
        const probe
        of probes
    ) {

        const result =
            await executeProbe(
                probe,
                options
            );


        results.push(
            result
        );
    }


    return {

        generatedAt:
            new Date(),

        baseUrl:
            options.baseUrl,

        total:
            results.length,

        passed:
            results.filter(
                result =>
                    result.status ===
                    "PASSED"
            ).length,

        failed:
            results.filter(
                result =>
                    result.status ===
                    "FAILED"
            ).length,

        blocked:
            results.filter(
                result =>
                    result.status ===
                    "BLOCKED"
            ).length,

        results
    };
}


// ==========================================
// Run One Runtime Probe
// ==========================================

export async function runRuntimeProbe(
    probe,
    customOptions = {}
) {

    const options = {

        ...DEFAULT_OPTIONS,

        ...customOptions
    };


    return executeProbe(
        probe,
        options
    );
}


// ==========================================
// Probe Safety Export
// ==========================================

export {

    PROBE_SAFETY
};


// ==========================================
// Default Export
// ==========================================

export default {

    runRuntimeProbe,

    runRuntimeProbes,

    PROBE_SAFETY
};