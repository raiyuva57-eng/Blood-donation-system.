const { pool } = require('./db');

const Hospital = {
  create: async ({ user_id, hospital_name, license_number, hospital_type, address, city, state, pincode }) => {
    const [result] = await pool.query(
      `INSERT INTO hospitals (user_id, hospital_name, license_number, hospital_type, address, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, hospital_name, license_number, hospital_type || 'private', address, city, state, pincode || null]
    );
    return result.insertId;
  },

  findByUserId: async (user_id) => {
    const [rows] = await pool.query('SELECT * FROM hospitals WHERE user_id = ?', [user_id]);
    return rows[0] || null;
  }
};

module.exports = Hospital;