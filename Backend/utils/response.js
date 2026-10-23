// Consistent success response shape: { success: true, message?, data }
export function sendSuccess(res, data, statusCode = 200, message) {
    const body = { success: true };
    if (message) body.message = message;
    body.data = data;
    return res.status(statusCode).json(body);
}
