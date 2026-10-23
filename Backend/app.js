import config from './config/env.js';
import express from 'express';
import cors from 'cors';

import { API_KEY_HEADER } from './config/constants.js';
import routes from './routes/index.js';
import requestLogger from './middleware/requestLogger.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// --- CORS: frontend runs on a different origin (e.g. Live Server :5500).
// The custom x-api-key header triggers a preflight request, so it must be allowed.
app.use(cors({
    origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', API_KEY_HEADER],
    // Lets frontend JavaScript read the remaining-quota headers
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

app.use(express.json());
app.use(requestLogger);

// --- Routes
app.use('/api', routes);

// --- 404 + central error handler (must be LAST)
app.use(notFound);
app.use(errorHandler);

export default app;
