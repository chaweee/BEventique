/**
 * Cron Job Configuration
 * Schedule automated tasks (reports, cleanups, notifications)
 */

const cron = require('node-cron');
const logger = require('../utils/logger');

/**
 * Example: Monthly Report Generation
 * Runs at 00:00 on the 1st day of every month
 */
const monthlyReportJob = cron.schedule('0 0 1 * *', () => {
  logger.info('Running monthly report generation...');
  // Add your report generation logic here
  // Example: Call a service to generate and email reports
}, {
  scheduled: false,
  timezone: "Asia/Manila"
});

/**
 * Example: Daily Cleanup Job
 * Runs every day at 2:00 AM
 */
const dailyCleanupJob = cron.schedule('0 2 * * *', () => {
  logger.info('Running daily cleanup job...');
  // Add cleanup logic: delete old files, expired sessions, etc.
}, {
  scheduled: false,
  timezone: "Asia/Manila"
});

/**
 * Example: Booking Reminder Job
 * Runs every hour to check upcoming bookings
 */
const bookingReminderJob = cron.schedule('0 * * * *', () => {
  logger.info('Checking for upcoming bookings...');
  // Add logic to send reminders for bookings happening soon
}, {
  scheduled: false,
  timezone: "Asia/Manila"
});

/**
 * Start all cron jobs
 */
function startCronJobs() {
  monthlyReportJob.start();
  dailyCleanupJob.start();
  bookingReminderJob.start();
  logger.info('✓ All cron jobs started');
}

/**
 * Stop all cron jobs
 */
function stopCronJobs() {
  monthlyReportJob.stop();
  dailyCleanupJob.stop();
  bookingReminderJob.stop();
  logger.info('✓ All cron jobs stopped');
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  jobs: {
    monthlyReportJob,
    dailyCleanupJob,
    bookingReminderJob,
  }
};
