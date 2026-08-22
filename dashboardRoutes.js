const express = require('express');
const router = express.Router();
const {
  getStats,
  getMonthlyDonations,
  getBloodGroupDistribution,
  getBloodAvailability,
  getRequestsChart,
  getUserRegistrations,
  getRecentActivity
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/stats', protect, authorize('admin', 'hospital'), getStats);
router.get('/charts/monthly-donations', protect, authorize('admin'), getMonthlyDonations);
router.get('/charts/blood-group-distribution', protect, authorize('admin'), getBloodGroupDistribution);
router.get('/charts/blood-availability', protect, authorize('admin', 'hospital'), getBloodAvailability);
router.get('/charts/blood-requests', protect, authorize('admin', 'hospital'), getRequestsChart);
router.get('/charts/user-registrations', protect, authorize('admin'), getUserRegistrations);
router.get('/recent', protect, authorize('admin', 'hospital'), getRecentActivity);

module.exports = router;