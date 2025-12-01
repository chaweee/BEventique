/**
 * API Routes Index
 * Central router that mounts all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
// Add more route imports here as needed
// const packageRoutes = require('./package.routes');
// const bookingRoutes = require('./booking.routes');
// const queryRoutes = require('./query.routes');

/**
 * API Health Check
 * @route GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// Mount additional routes here
// router.use('/packages', packageRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/queries', queryRoutes);

module.exports = router;
