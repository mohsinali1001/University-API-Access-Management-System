// Shared constants used across all layers

export const ROLES = Object.freeze({
    ADMIN: 'admin',
    STUDENT: 'student',
    TEACHER: 'teacher'
});

export const API_KEY_HEADER = 'x-api-key';

export const KEY_STATUS = Object.freeze({
    ACTIVE: 'active',
    REVOKED: 'revoked'
});

export const DEFAULT_REQUEST_LIMIT = 100;
