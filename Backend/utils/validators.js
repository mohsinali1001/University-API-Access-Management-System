import AppError from './AppError.js';

const DIGITS_ONLY = /^\d+$/;

// Accepts a positive integer given as a number or a digit-only string (e.g. route params)
export function parseId(value, label = 'id') {
    const ok = (typeof value === 'number' && Number.isInteger(value)) ||
               (typeof value === 'string' && DIGITS_ONLY.test(value));
    const n = ok ? Number(value) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
        throw AppError.badRequest(`${label} must be a positive whole number`);
    }
    return n;
}

export const MAX_REQUEST_LIMIT = 1_000_000;

export function parseRequestLimit(value) {
    const n = parseId(value, 'requestLimit');
    if (n > MAX_REQUEST_LIMIT) {
        throw AppError.badRequest(`requestLimit cannot exceed ${MAX_REQUEST_LIMIT}`);
    }
    return n;
}

export function parseEnum(value, allowed, label) {
    if (!allowed.includes(value)) {
        throw AppError.badRequest(`${label} must be one of: ${allowed.join(', ')}`);
    }
    return value;
}

// Clamp an optional numeric query param (e.g. ?limit=20) into [min, max]
export function parseOptionalInt(value, { min, max, fallback }) {
    if (value === undefined) return fallback;
    const n = parseId(value, 'query parameter');
    return Math.min(Math.max(n, min), max);
}
