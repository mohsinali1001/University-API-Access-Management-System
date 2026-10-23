import AppError from '../utils/AppError.js';

// Converts any error into a clean JSON response with the right HTTP status.
// Express 5 forwards errors from async handlers here automatically.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
    let error = err;

    // Malformed JSON body (thrown by express.json)
    if (err.type === 'entity.parse.failed') {
        error = AppError.badRequest('Invalid JSON in request body');
    }
    // MySQL errors
    else if (err.code === 'ER_DUP_ENTRY') {
        error = AppError.conflict('A record with the same unique value already exists');
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        error = AppError.badRequest('Referenced student or teacher does not exist');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        error = new AppError('Database is unavailable', 503, 'DB_UNAVAILABLE');
    }

    if (!(error instanceof AppError)) {
        // Unexpected bug: log everything, tell the client nothing sensitive
        console.error('[unexpected error]', err);
        error = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
    }

    // Skip the response if the logger/other code already sent headers
    if (res.headersSent) return;

    res.status(error.statusCode).json({
        success: false,
        error: {
            code: error.code,
            message: error.message
        }
    });
}
