import config from './config/env.js';
import app from './app.js';
import { checkConnection } from './db.js';

async function start() {
    try {
        await checkConnection();
        console.log('[db] MySQL connection OK');
    } catch (err) {
        console.error('\n[db] Could not connect to MySQL:', err.code || err.message);
        console.error('[db] Check that XAMPP MySQL is running, the database is imported, and .env is correct.\n');
        process.exit(1);
    }

    app.listen(config.port, () => {
        console.log(`[server] Running on http://localhost:${config.port}`);
        console.log(`[server] Health check: http://localhost:${config.port}/api/health`);
    });
}

start();
