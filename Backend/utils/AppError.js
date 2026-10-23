// One error type for every "expected" failure. The error handler turns it into JSON.
export default class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace?.(this, this.constructor);
    }

    static badRequest(message = 'Bad request')            { return new AppError(message, 400, 'BAD_REQUEST'); }
    static unauthorized(message = 'Unauthorized')         { return new AppError(message, 401, 'UNAUTHORIZED'); }
    static forbidden(message = 'Forbidden')               { return new AppError(message, 403, 'FORBIDDEN'); }
    static notFound(message = 'Resource not found')       { return new AppError(message, 404, 'NOT_FOUND'); }
    static conflict(message = 'Conflict')                 { return new AppError(message, 409, 'CONFLICT'); }
    static tooManyRequests(message = 'Request limit exceeded') { return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'); }
}
