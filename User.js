const { pool } = require('../config/db');

const User = {
  // Create a new user
  create: async ({ full_name, email, password, phone, role, address, city, state, pincode }) => {
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password, phone, role, address, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, password, phone, role, address || null, city || null, state || null, pincode || null]
    );
    return result.insertId;
  },

  findByEmail: async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  findById: async (user_id) => {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, email, phone, role, profile_photo, address, city, state, pincode,
              is_active, is_verified, last_login, created_at
       FROM users WHERE user_id = ?`,
      [user_id]
    );
    return rows[0] || null;
  },

  updateProfile: async (user_id, fields) => {
    const allowed = ['full_name', 'phone', 'address', 'city', 'state', 'pincode', 'profile_photo'];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
    if (keys.length === 0) return false;

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(user_id);

    await pool.query(`UPDATE users SET ${setClause} WHERE user_id = ?`, values);
    return true;
  },

  updateLastLogin: async (user_id) => {
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user_id]);
  },

  updatePassword: async (user_id, hashedPassword) => {
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, user_id]);
  }
};

module.exports = User;