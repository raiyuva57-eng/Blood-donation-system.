const { pool } = require('./db');
const asyncHandler = require('./asyncHandler');

// @route  GET /api/hospitals
// @access Private (admin)
const getHospitals = asyncHandler(async (req, res) => {
  const { city, search, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT h.*, u.full_name, u.email, u.phone
    FROM hospitals h
    JOIN users u ON h.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];

  if (city) { query += ' AND h.city LIKE ?'; params.push(`%${city}%`); }
  if (search) { query += ' AND (h.hospital_name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [hospitals] = await pool.query(query, params);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM hospitals');

  res.status(200).json({ success: true, count: hospitals.length, total, data: hospitals });
});

// @route  GET /api/hospitals/:id
// @access Private
const getHospitalById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT h.*, u.full_name, u.email, u.phone
     FROM hospitals h JOIN users u ON h.user_id = u.user_id
     WHERE h.hospital_id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  res.status(200).json({ success: true, data: rows[0] });
});

// @route  POST /api/hospitals
// @access Private (admin)
const createHospital = asyncHandler(async (req, res) => {
  const { user_id, hospital_name, license_number, hospital_type, address, city, state, pincode } = req.body;

  if (!user_id || !hospital_name || !license_number || !address || !city || !state) {
    return res.status(400).json({ success: false, message: 'user_id, hospital_name, license_number, address, city and state are required' });
  }

  const [result] = await pool.query(
    `INSERT INTO hospitals (user_id, hospital_name, license_number, hospital_type, address, city, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, hospital_name, license_number, hospital_type || 'private', address, city, state, pincode || null]
  );

  res.status(201).json({ success: true, message: 'Hospital created successfully', data: { hospital_id: result.insertId } });
});

// @route  PUT /api/hospitals/:id
// @access Private (admin)
const updateHospital = asyncHandler(async (req, res) => {
  const { hospital_name, hospital_type, address, city, state, pincode, is_verified } = req.body;

  const allowedFields = { hospital_name, hospital_type, address, city, state, pincode, is_verified };
  const keys = Object.keys(allowedFields).filter((k) => allowedFields[k] !== undefined);

  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
  }

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => allowedFields[k]);
  values.push(req.params.id);

  const [result] = await pool.query(`UPDATE hospitals SET ${setClause} WHERE hospital_id = ?`, values);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }

  res.status(200).json({ success: true, message: 'Hospital updated successfully' });
});

// @route  DELETE /api/hospitals/:id
// @access Private (admin)
const deleteHospital = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM hospitals WHERE hospital_id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  res.status(200).json({ success: true, message: 'Hospital deleted successfully' });
});

module.exports = { getHospitals, getHospitalById, createHospital, updateHospital, deleteHospital };
