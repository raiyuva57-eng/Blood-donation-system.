const { pool } = require('./db');

const Patient = {
  create: async ({ user_id, blood_group_needed, date_of_birth, gender, medical_condition }) => {
    const [result] = await pool.query(
      `INSERT INTO patients (user_id, blood_group_needed, date_of_birth, gender, medical_condition)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, blood_group_needed, date_of_birth || null, gender || null, medical_condition || null]
    );
    return result.insertId;
  },

  findByUserId: async (user_id) => {
    const [rows] = await pool.query('SELECT * FROM patients WHERE user_id = ?', [user_id]);
    return rows[0] || null;
  }
};

module.exports = Patient;