import usageService from '../services/usage.service.js';

// Enforces the per-key request limit. The admin key is unlimited.
export default async function usageLimiter(req, res, next) {
    if (!req.auth.keyId) return next();   // admin

    try {
        req.auth.usage = await usageService.consume(req.auth.keyId);
    } catch (err) {
        // Still tell the client their quota on a 429
        if (err.usage) {
            res.set('X-RateLimit-Limit', String(err.usage.limit));
            res.set('X-RateLimit-Remaining', String(err.usage.remaining));
        }
        return next(err);
    }

    res.set('X-RateLimit-Limit', String(req.auth.usage.limit));
    res.set('X-RateLimit-Remaining', String(req.auth.usage.remaining));
    next();
}
