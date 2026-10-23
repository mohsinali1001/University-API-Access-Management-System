import healthRepository from '../repositories/health.repository.js';

const healthService = {
    async getStatus() {
        const dbConnected = await healthRepository.pingDatabase();
        const tables = await healthRepository.getTableCounts();
        return {
            status: 'ok',
            database: dbConnected ? 'connected' : 'disconnected',
            tables,
            timestamp: new Date().toISOString()
        };
    }
};

export default healthService;
