const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/patients
// @access Private (admin, hospital)
const getPatients = asyncHandler(async (req, res) => {
  const { blood_group_needed, search, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT p.patient_id, p.blood_group_needed, p.date_of_birth, p.gender,
           p.medical_condition, p.attending_hospital_id, p.emergency_contact,
           u.user_id, u.full_name, u.email, u.phone, u.city, u.profile_photo, u.created_at
    FROM patients p
    JOIN users u ON p.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];

  if (blood_group_needed) { query += ' AND p.blood_group_needed = ?'; params.push(blood_group_needed); }
  if (search) { query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const [patients] = await pool.query(query, params);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM patients');

  res.status(200).json({ success: true, count: patients.length, total, data: patients });
});

// @route  GET /api/patients/:id
// @access Private
const getPatientById = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name, u.email, u.phone, u.city, u.address, u.profile_photo
     FROM patients p JOIN users u ON p.user_id = u.user_id
     WHERE p.patient_id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.status(200).json({ success: true, data: rows[0] });
});

// @route  POST /api/patients  (admin manually adding a patient record)
// @access Private (admin)
const createPatient = asyncHandler(async (req, res) => {
  const { user_id, blood_group_needed, date_of_birth, gender, medical_condition, attending_hospital_id, emergency_contact } = req.body;

  if (!user_id || !blood_group_needed) {
    return res.status(400).json({ success: false, message: 'user_id and blood_group_needed are required' });
  }

  const [result] = await pool.query(
    `INSERT INTO patients (user_id, blood_group_needed, date_of_birth, gender, medical_condition, attending_hospital_id, emergency_contact)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, blood_group_needed, date_of_birth || null, gender || null, medical_condition || null, attending_hospital_id || null, emergency_contact || null]
  );

  res.status(201).json({ success: true, message: 'Patient created successfully', data: { patient_id: result.insertId } });
});

// @route  PUT /api/patients/:id
// @access Private (admin, or patient updating own record)
const updatePatient = asyncHandler(async (req, res) => {
  const { blood_group_needed, medical_condition, attending_hospital_id, emergency_contact } = req.body;

  const allowedFields = { blood_group_needed, medical_condition, attending_hospital_id, emergency_contact };
  const keys = Object.keys(allowedFields).filter((k) => allowedFields[k] !== undefined);

  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
  }

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => allowedFields[k]);
  values.push(req.params.id);

  const [result] = await pool.query(`UPDATE patients SET ${setClause} WHERE patient_id = ?`, values);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  res.status(200).json({ success: true, message: 'Patient updated successfully' });
});

// @route  DELETE /api/patients/:id
// @access Private (admin)
const deletePatient = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM patients WHERE patient_id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  res.status(200).json({ success: true, message: 'Patient deleted successfully' });
});

module.exports = { getPatients, getPatientById, createPatient, updatePatient, deletePatient };
