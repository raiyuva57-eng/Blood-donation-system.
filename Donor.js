const { pool } = require('./db');

const Donor = {
  create: async ({ user_id, blood_group, date_of_birth, gender, weight }) => {
    const [result] = await pool.query(
      `INSERT INTO donors (user_id, blood_group, date_of_birth, gender, weight)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, blood_group, date_of_birth, gender, weight || null]
    );
    return result.insertId;
  },

  findByUserId: async (user_id) => {
    const [rows] = await pool.query('SELECT * FROM donors WHERE user_id = ?', [user_id]);
    return rows[0] || null;
  }
};

module.exports = Donor;