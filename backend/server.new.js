/**
 * Express Server Configuration
 * Main entry point for the API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fileUpload = require('express-fileupload');
const path = require('path');

// Import configurations
const config = require('./config/env.config');
const db = require('./db/connection');
const logger = require('./utils/logger');
const { runMigrations } = require('./db/migrations');
const { startCronJobs } = require('./config/cron.config');

// Import middleware
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Import routes
const apiRoutes = require('./routes/index');
// Import existing routes if needed
const authRoutesLegacy = require('./routes/auth');
const packagesRoutesLegacy = require('./routes/packages');
const uploadRoutesLegacy = require('./routes/upload');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
});

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload
app.use(fileUpload({
  limits: { fileSize: config.MAX_FILE_SIZE },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// SOCKET.IO SETUP
// ============================================
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_thread', (threadId) => {
    socket.join(`thread_${threadId}`);
    logger.info(`Socket ${socket.id} joined thread_${threadId}`);
  });

  socket.on('leave_thread', (threadId) => {
    socket.leave(`thread_${threadId}`);
    logger.info(`Socket ${socket.id} left thread_${threadId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Socket ${socket.id} disconnected: ${reason}`);
  });
});

// Make io accessible in routes
app.set('io', io);

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
  });
});

// Mount new modular API routes
app.use('/api', apiRoutes);

// Mount legacy routes (if still needed)
app.use('/api/auth', authRoutesLegacy);
app.use('/api/packages', packagesRoutesLegacy);
app.use('/api/upload', uploadRoutesLegacy);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Test database connection
    await db.testConnection();
    logger.info('✓ Database connected');

    // Run migrations (optional - comment out if not needed)
    // await runMigrations();
    // logger.info('✓ Migrations completed');

    // Start cron jobs (optional)
    // startCronJobs();
    // logger.info('✓ Cron jobs started');

    // Start server
    const PORT = config.PORT || 3001;
    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════╗
║   🚀 Server running on port ${PORT}     ║
║   Environment: ${config.NODE_ENV}              ║
║   API: http://localhost:${PORT}/api     ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    db.closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    db.closePool();
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, httpServer, io };
