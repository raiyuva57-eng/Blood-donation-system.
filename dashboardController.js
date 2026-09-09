  const { pool } = require('./db');
const asyncHandler = require('./asyncHandler');

// @route  GET /api/dashboard/stats
// @access Private (admin sees global stats; hospital sees scoped stats)
const getStats = asyncHandler(async (req, res) => {
  const [[donorCount]] = await pool.query('SELECT COUNT(*) AS total FROM donors');
  const [[patientCount]] = await pool.query('SELECT COUNT(*) AS total FROM patients');
  const [[hospitalCount]] = await pool.query('SELECT COUNT(*) AS total FROM hospitals');
  const [[bloodBankCount]] = await pool.query('SELECT COUNT(*) AS total FROM blood_banks');
  const [[availableUnits]] = await pool.query('SELECT COALESCE(SUM(units_available), 0) AS total FROM blood_stock');
  const [[emergencyRequests]] = await pool.query(
    `SELECT COUNT(*) AS total FROM blood_requests WHERE urgency = 'emergency' AND status IN ('pending', 'in_progress')`
  );
  const [[pendingRequests]] = await pool.query(`SELECT COUNT(*) AS total FROM blood_requests WHERE status = 'pending'`);
  const [[fulfilledRequests]] = await pool.query(`SELECT COUNT(*) AS total FROM blood_requests WHERE status = 'fulfilled'`);
  const [[totalDonations]] = await pool.query(`SELECT COUNT(*) AS total FROM donation_history WHERE status = 'completed'`);
  const [[lowStockAlerts]] = await pool.query(
    `SELECT COUNT(*) AS total FROM blood_stock WHERE units_available <= minimum_threshold`
  );

  res.status(200).json({
    success: true,
    data: {
      total_donors: donorCount.total,
      total_patients: patientCount.total,
      total_hospitals: hospitalCount.total,
      total_blood_banks: bloodBankCount.total,
      available_blood_units: availableUnits.total,
      emergency_requests: emergencyRequests.total,
      pending_requests: pendingRequests.total,
      fulfilled_requests: fulfilledRequests.total,
      total_donations: totalDonations.total,
      low_stock_alerts: lowStockAlerts.total
    }
  });
});

// @route  GET /api/dashboard/charts/monthly-donations
// @access Private (admin)
const getMonthlyDonations = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(donation_date, '%Y-%m') AS month, COUNT(*) AS count
    FROM donation_history
    WHERE status = 'completed' AND donation_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month ASC
  `);

  res.status(200).json({ success: true, data: fillMissingMonths(rows, 12) });
});

// @route  GET /api/dashboard/charts/blood-group-distribution
// @access Private (admin)
const getBloodGroupDistribution = asyncHandler(async (req, res) => {
  const [donorDistribution] = await pool.query(`
    SELECT blood_group, COUNT(*) AS count FROM donors GROUP BY blood_group ORDER BY blood_group
  `);
  const [stockDistribution] = await pool.query(`
    SELECT blood_group, SUM(units_available) AS units FROM blood_stock GROUP BY blood_group ORDER BY blood_group
  `);

  res.status(200).json({
    success: true,
    data: { donor_distribution: donorDistribution, stock_distribution: stockDistribution }
  });
});

// @route  GET /api/dashboard/charts/blood-availability
// @access Private (admin, hospital)
const getBloodAvailability = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT blood_group,
           SUM(units_available) AS available,
           SUM(minimum_threshold) AS threshold
    FROM blood_stock
    GROUP BY blood_group
    ORDER BY blood_group
  `);

  const data = rows.map((r) => ({
    ...r,
    status: r.available <= r.threshold ? 'low' : r.available <= r.threshold * 2 ? 'moderate' : 'healthy'
  }));

  res.status(200).json({ success: true, data });
});

// @route  GET /api/dashboard/charts/blood-requests
// @access Private (admin, hospital)
const getRequestsChart = asyncHandler(async (req, res) => {
  const [byStatus] = await pool.query(`
    SELECT status, COUNT(*) AS count FROM blood_requests GROUP BY status
  `);
  const [byMonth] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM blood_requests
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month ORDER BY month ASC
  `);

  res.status(200).json({
    success: true,
    data: { by_status: byStatus, by_month: fillMissingMonths(byMonth, 12) }
  });
});

// @route  GET /api/dashboard/charts/user-registrations
// @access Private (admin)
const getUserRegistrations = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, role, COUNT(*) AS count
    FROM users
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY month, role
    ORDER BY month ASC
  `);

  res.status(200).json({ success: true, data: rows });
});

// @route  GET /api/dashboard/recent
// @access Private (admin, hospital)
const getRecentActivity = asyncHandler(async (req, res) => {
  const [recentDonors] = await pool.query(`
    SELECT d.donor_id, u.full_name, d.blood_group, u.city, d.created_at
    FROM donors d JOIN users u ON d.user_id = u.user_id
    ORDER BY d.created_at DESC LIMIT 5
  `);

  const [recentRequests] = await pool.query(`
    SELECT br.request_id, u.full_name AS patient_name, br.blood_group, br.urgency, br.status, br.created_at
    FROM blood_requests br
    JOIN patients p ON br.patient_id = p.patient_id
    JOIN users u ON p.user_id = u.user_id
    ORDER BY br.created_at DESC LIMIT 5
  `);

  const [latestDonations] = await pool.query(`
    SELECT dh.donation_id, u.full_name AS donor_name, dh.blood_group, dh.units_donated, dh.donation_date
    FROM donation_history dh
    JOIN donors d ON dh.donor_id = d.donor_id
    JOIN users u ON d.user_id = u.user_id
    ORDER BY dh.donation_date DESC LIMIT 5
  `);

  res.status(200).json({
    success: true,
    data: { recent_donors: recentDonors, recent_requests: recentRequests, latest_donations: latestDonations }
  });
});

// Helper: ensures chart data has no gaps for months with zero activity
function fillMissingMonths(rows, monthsBack) {
  const map = new Map(rows.map((r) => [r.month, r.count]));
  const result = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ month: key, count: map.get(key) || 0 });
  }
  return result;
}

module.exports = {
  getStats,
  getMonthlyDonations,
  getBloodGroupDistribution,
  getBloodAvailability,
  getRequestsChart,
  getUserRegistrations,
  getRecentActivity
};