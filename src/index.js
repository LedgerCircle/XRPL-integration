require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('./database/database');
const xrplService = require('./utils/xrpl');

// Import routes
const authRoutes = require('./routes/auth');
const circleRoutes = require('./routes/circles');
const xrplRoutes = require('./routes/xrpl');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/xrpl', xrplRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'LedgerLoop XRPL Backend API',
    version: '1.0.0',
    description: 'XRPL testnet integration backend for lending circles',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/profile': 'Get user profile (requires auth)',
        'POST /api/auth/fund-wallet': 'Fund testnet wallet (requires auth)',
        'POST /api/auth/verify': 'Verify user (requires auth)'
      },
      circles: {
        'POST /api/circles': 'Create lending circle (requires auth)',
        'GET /api/circles': 'Get all circles (requires auth)',
        'GET /api/circles/my-circles': 'Get user circles (requires auth)',
        'GET /api/circles/:id': 'Get circle details (requires auth)',
        'GET /api/circles/:id/members': 'Get circle members (requires auth)',
        'POST /api/circles/join': 'Join circle (requires auth)',
        'POST /api/circles/:id/setup-multisig': 'Setup multi-signature (requires auth)',
        'POST /api/circles/contribution': 'Record contribution (requires auth)',
        'GET /api/circles/calculate-interest': 'Calculate interest (requires auth)',
        'PATCH /api/circles/:id/status': 'Update circle status (requires auth)'
      },
      xrpl: {
        'POST /api/xrpl/validate-address': 'Validate XRPL address',
        'GET /api/xrpl/account/:address': 'Get account information',
        'GET /api/xrpl/transactions/:address': 'Get transaction history',
        'POST /api/xrpl/escrow/create': 'Create escrow (requires auth)',
        'POST /api/xrpl/escrow/finish': 'Finish escrow (requires auth)',
        'POST /api/xrpl/payment': 'Send payment (requires auth)',
        'GET /api/xrpl/stored-transactions': 'Get stored transactions (requires auth)',
        'POST /api/xrpl/subscribe': 'Subscribe to address updates (requires auth)'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    await xrplService.disconnect();
    await database.close();
    console.log('Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await database.initialize();
    console.log('Database initialized successfully');

    // Connect to XRPL (connection will be made on-demand)
    console.log('XRPL service ready');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 LedgerLoop XRPL Backend API running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ XRPL Network: ${process.env.XRPL_NETWORK || 'testnet'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;