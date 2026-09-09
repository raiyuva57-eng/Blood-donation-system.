const { pool } = require('./db');

const BloodRequest = {
  create: async ({ patient_id, blood_group, units_required, urgency, required_by_date, notes, hospital_id, blood_bank_id }) => {
    const [result] = await pool.query(
      `INSERT INTO blood_requests (patient_id, blood_group, units_required, urgency, required_by_date, notes, hospital_id, blood_bank_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, blood_group, units_required, urgency || 'normal', required_by_date || null, notes || null, hospital_id || null, blood_bank_id || null]
    );
    return result.insertId;
  },

  findAll: async ({ status, urgency, blood_group, limit = 50, offset = 0 } = {}) => {
    let query = `
      SELECT br.*, u.full_name AS patient_name, u.phone AS patient_phone,
             du.full_name AS donor_name, h.hospital_name
      FROM blood_requests br
      JOIN patients p ON br.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN donors d ON br.donor_id = d.donor_id
      LEFT JOIN users du ON d.user_id = du.user_id
      LEFT JOIN hospitals h ON br.hospital_id = h.hospital_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND br.status = ?'; params.push(status); }
    if (urgency) { query += ' AND br.urgency = ?'; params.push(urgency); }
    if (blood_group) { query += ' AND br.blood_group = ?'; params.push(blood_group); }

    query += ' ORDER BY br.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  findById: async (request_id) => {
    const [rows] = await pool.query(
      `SELECT br.*, u.full_name AS patient_name, u.phone AS patient_phone
       FROM blood_requests br
       JOIN patients p ON br.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       WHERE br.request_id = ?`,
      [request_id]
    );
    return rows[0] || null;
  },

  findByPatientUserId: async (user_id) => {
    const [rows] = await pool.query(
      `SELECT br.* FROM blood_requests br
       JOIN patients p ON br.patient_id = p.patient_id
       WHERE p.user_id = ? ORDER BY br.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  findByDonorUserId: async (user_id) => {
    const [rows] = await pool.query(
      `SELECT br.*, u.full_name AS patient_name FROM blood_requests br
       JOIN donors d ON br.donor_id = d.donor_id
       JOIN patients p ON br.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.user_id
       WHERE d.user_id = ? ORDER BY br.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  update: async (request_id, fields) => {
    const allowed = ['donor_id', 'hospital_id', 'blood_bank_id', 'status', 'units_required', 'urgency', 'notes', 'hospital_verified'];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
    if (keys.length === 0) return false;

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(request_id);

    await pool.query(`UPDATE blood_requests SET ${setClause} WHERE request_id = ?`, values);
    return true;
  },

  delete: async (request_id) => {
    await pool.query('DELETE FROM blood_requests WHERE request_id = ?', [request_id]);
  }
};

module.exports = BloodRequest;