// Compatibility shim: the canonical offline replay implementation lives in
// offlineEventProcessor.js. Keep this module only for callers that still use
// the historical V2 import path; do not create a second replay contract here.
export {
    REPLAY_PHASES as OFFLINE_REPLAY_PHASES,
    validateReplayEvent as validateReplayContract,
} from "./offlineEventProcessor.js";
