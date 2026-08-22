const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/donors
// @access Private (admin, hospital)
const getDonors = asyncHandler(async (req, res) => {
  const { blood_group, city, availability_status, search, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT d.donor_id, d.blood_group, d.last_donation_date, d.total_donations,
           d.availability_status, d.is_eligible, u.user_id, u.full_name, u.email,
           u.phone, u.city, u.profile_photo, u.created_at
    FROM donors d
    JOIN users u ON d.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];

  if (blood_group) { query += ' AND d.blood_group = ?'; params.push(blood_group); }
  if (city) { query += ' AND u.city LIKE ?'; params.push(`%${city}%`); }
  if (availability_status) { query += ' AND d.availability_status = ?'; params.push(availability_status); }
  if (search) { query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [donors] = await pool.query(query, params);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM donors');

  res.status(200).json({ success: true, count: donors.length, total, data: donors });
});

// @route  GET /api/donors/:id
// @access Private
const getDonorById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.*, u.full_name, u.email, u.phone, u.city, u.address, u.profile_photo
     FROM donors d JOIN users u ON d.user_id = u.user_id
     WHERE d.donor_id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }
  res.status(200).json({ success: true, data: rows[0] });
});

// @route  POST /api/donors  (admin manually adding a donor record)
// @access Private (admin)
const createDonor = asyncHandler(async (req, res) => {
  const { user_id, blood_group, date_of_birth, gender, weight } = req.body;

  if (!user_id || !blood_group || !date_of_birth || !gender) {
    return res.status(400).json({ success: false, message: 'user_id, blood_group, date_of_birth and gender are required' });
  }

  const [result] = await pool.query(
    `INSERT INTO donors (user_id, blood_group, date_of_birth, gender, weight) VALUES (?, ?, ?, ?, ?)`,
    [user_id, blood_group, date_of_birth, gender, weight || null]
  );

  res.status(201).json({ success: true, message: 'Donor created successfully', data: { donor_id: result.insertId } });
});

// @route  PUT /api/donors/:id
// @access Private (admin, or donor updating own record)
const updateDonor = asyncHandler(async (req, res) => {
  const { blood_group, last_donation_date, availability_status, medical_conditions, weight, is_eligible } = req.body;

  const allowedFields = { blood_group, last_donation_date, availability_status, medical_conditions, weight, is_eligible };
  const keys = Object.keys(allowedFields).filter((k) => allowedFields[k] !== undefined);

  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
  }

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => allowedFields[k]);
  values.push(req.params.id);

  const [result] = await pool.query(`UPDATE donors SET ${setClause} WHERE donor_id = ?`, values);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }

  res.status(200).json({ success: true, message: 'Donor updated successfully' });
});

// @route  DELETE /api/donors/:id
// @access Private (admin)
const deleteDonor = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM donors WHERE donor_id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Donor not found' });
  }
  res.status(200).json({ success: true, message: 'Donor deleted successfully' });
});

module.exports = { getDonors, getDonorById, createDonor, updateDonor, deleteDonor };