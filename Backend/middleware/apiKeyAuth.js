import { API_KEY_HEADER } from '../config/constants.js';
import authService from '../services/auth.service.js';

// Validates the x-api-key header and attaches the result to req.auth
export default async function apiKeyAuth(req, res, next) {
    req.auth = await authService.authenticate(req.get(API_KEY_HEADER));
    next();
}
