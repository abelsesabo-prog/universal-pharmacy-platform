import { syncOfflineEvents } from "../services/offlineSyncService.js";

export async function syncOfflineEventsController(req, res, next) {
    try {
        const result = await syncOfflineEvents({
            tenantId: req.user.tenantId,
            deviceId: req.body?.deviceId,
            events: req.body?.events
        }, {
            userId: req.user.sub,
            processor: `api:${req.user.sub}`
        });
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return next(error);
    }
}
