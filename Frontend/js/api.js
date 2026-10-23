/* ------------------------------------------------------------------
   Api: the ONE place that talks to the backend (jQuery $.ajax).
   - adds the x-api-key header automatically
   - resolves with the JSON body  { success, message?, data }
   - rejects with an ApiError     { status, code, message, rateLimit }
   - publishes the remaining quota as a jQuery event: $(document).on('api:ratelimit', ...)

   Usage:
     Api.get('/student/me')                                   // uses the saved student/teacher key
     Api.get('/admin/keys', { status: 'active' }, { as: 'admin' })
     Api.post('/admin/keys', { ownerType: 'student', ownerId: 1 }, { as: 'admin' })
     Api.get('/health', {}, { as: 'none' })                   // public endpoint, no key
     Api.get('/auth/me', {}, { key: 'stu_...' })              // use a specific key (Settings page)
------------------------------------------------------------------- */
class ApiError extends Error {
    constructor({ status, code, message, rateLimit = null }) {
        super(message);
        this.name = 'ApiError';
        this.status = status;       // HTTP status (0 = server unreachable)
        this.code = code;           // e.g. RATE_LIMIT_EXCEEDED, KEY_REVOKED, NO_KEY
        this.rateLimit = rateLimit; // { limit, remaining } when the server sent it
    }
}

const Api = (() => {
    const BASE = () => `${CONFIG.API_BASE_URL}/api`;

    function readRateLimit(xhr) {
        const limit = xhr.getResponseHeader('X-RateLimit-Limit');
        const remaining = xhr.getResponseHeader('X-RateLimit-Remaining');
        if (limit === null || remaining === null) return null;
        return { limit: Number(limit), remaining: Number(remaining) };
    }

    function publishRateLimit(rateLimit) {
        if (!rateLimit) return;
        KeyStore.saveQuota(rateLimit);
        $(document).trigger('api:ratelimit', [rateLimit]);
    }

    function toApiError(xhr, rateLimit) {
        if (xhr.status === 0) {
            const timedOut = xhr.statusText === 'timeout';
            return new ApiError({
                status: 0,
                code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
                message: timedOut
                    ? 'The server took too long to respond. Please try again.'
                    : 'Cannot reach the server. Make sure the backend is running.'
            });
        }
        const err = xhr.responseJSON && xhr.responseJSON.error;
        return new ApiError({
            status: xhr.status,
            code: err ? err.code : 'HTTP_ERROR',
            message: err ? err.message : `Request failed (${xhr.status})`,
            rateLimit
        });
    }

    // as: 'user' (default) | 'admin' | 'none'     key: override the stored key
    function request(method, path, { data, as = 'user', key } = {}) {
        const apiKey = key !== undefined ? key
            : as === 'admin' ? KeyStore.getAdminKey()
            : as === 'user' ? KeyStore.getUserKey()
            : null;

        if (as !== 'none' && !apiKey) {
            return Promise.reject(new ApiError({
                status: 401,
                code: 'NO_KEY',
                message: as === 'admin'
                    ? 'Enter the admin API key to continue.'
                    : 'No API key saved yet. Open Settings and save your API key.'
            }));
        }

        const hasBody = data !== undefined && method !== 'GET';
        return new Promise((resolve, reject) => {
            $.ajax({
                url: BASE() + path,
                method,
                dataType: 'json',
                timeout: 10000,
                headers: apiKey ? { 'x-api-key': apiKey } : {},
                // GET: data becomes the query string. Others: JSON body.
                data: data === undefined ? undefined : (hasBody ? JSON.stringify(data) : data),
                contentType: hasBody ? 'application/json' : undefined
            })
                .done((body, _status, xhr) => {
                    publishRateLimit(readRateLimit(xhr));
                    resolve(body);
                })
                .fail((xhr) => {
                    const rateLimit = readRateLimit(xhr);
                    publishRateLimit(rateLimit);
                    reject(toApiError(xhr, rateLimit));
                });
        });
    }

    return {
        get:    (path, params, opts) => request('GET', path, { ...opts, data: params }),
        post:   (path, body, opts)   => request('POST', path, { ...opts, data: body }),
        put:    (path, body, opts)   => request('PUT', path, { ...opts, data: body }),
        patch:  (path, body, opts)   => request('PATCH', path, { ...opts, data: body }),
        delete: (path, opts)         => request('DELETE', path, opts)
    };
})();
