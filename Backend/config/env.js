// Loads .env ONCE and validates it. Import this before anything that reads process.env.
import 'dotenv/config';

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'ADMIN_API_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
    console.error(`\n[config] Missing required .env variables: ${missing.join(', ')}`);
    console.error('[config] Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
}

const config = Object.freeze({
    port: Number(process.env.PORT) || 5000,
    adminApiKey: process.env.ADMIN_API_KEY,
    // Comma separated list of allowed origins, or * for any
    corsOrigins: (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim()),
    nodeEnv: process.env.NODE_ENV || 'development'
});

export default config;
