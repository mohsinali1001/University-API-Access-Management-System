import AppError from '../utils/AppError.js';

export default function notFound(req, res, next) {
    next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
