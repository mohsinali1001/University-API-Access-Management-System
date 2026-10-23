import usageService from '../services/usage.service.js';

// Writes one api_usage_logs row per request made with a database key,
// AFTER the response is sent so the real status code is stored.
// Admin requests are skipped (the admin key has no database row).
export default function usageLogger(req, res, next) {
    const { keyId } = req.auth;
    if (keyId) {
        res.on('finish', () => {
            usageService.log({
                apiKeyId: keyId,
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode
            }).catch((err) => console.error('[usage log] failed:', err.message));
        });
    }
    next();
}
