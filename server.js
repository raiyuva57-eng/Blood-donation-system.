const app = require('./app');
const { testConnection } = require('./db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();