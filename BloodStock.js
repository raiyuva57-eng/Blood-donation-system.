const { pool } = require('../config/db');

const BloodStock = {
  findAll: async () => {
    const [rows] = await pool.query(
      `SELECT bs.*, bb.bank_name, bb.city
       FROM blood_stock bs
       JOIN blood_banks bb ON bs.blood_bank_id = bb.blood_bank_id
       ORDER BY bb.bank_name, bs.blood_group`
    );
    return rows;
  },

  findByBank: async (blood_bank_id) => {
    const [rows] = await pool.query('SELECT * FROM blood_stock WHERE blood_bank_id = ?', [blood_bank_id]);
    return rows;
  },

  findByGroupAndCity: async (blood_group, city) => {
    let query = `
      SELECT bs.*, bb.bank_name, bb.city, bb.contact_number, bb.address
      FROM blood_stock bs
      JOIN blood_banks bb ON bs.blood_bank_id = bb.blood_bank_id
      WHERE bs.units_available > 0
    `;
    const params = [];
    if (blood_group) { query += ' AND bs.blood_group = ?'; params.push(blood_group); }
    if (city) { query += ' AND bb.city LIKE ?'; params.push(`%${city}%`); }
    query += ' ORDER BY bs.units_available DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  },

  create: async ({ blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date }) => {
    const [result] = await pool.query(
      `INSERT INTO blood_stock (blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date, last_restocked)
       VALUES (?, ?, ?, ?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE units_available = units_available + VALUES(units_available), last_restocked = CURDATE()`,
      [blood_bank_id, blood_group, units_available, minimum_threshold || 10, expiry_date || null]
    );
    return result.insertId;
  },

  update: async (stock_id, fields) => {
    const allowed = ['units_available', 'units_reserved', 'minimum_threshold', 'expiry_date', 'last_restocked'];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
    if (keys.length === 0) return false;

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(stock_id);

    await pool.query(`UPDATE blood_stock SET ${setClause} WHERE stock_id = ?`, values);
    return true;
  },

  delete: async (stock_id) => {
    await pool.query('DELETE FROM blood_stock WHERE stock_id = ?', [stock_id]);
  },

  findById: async (stock_id) => {
    const [rows] = await pool.query('SELECT * FROM blood_stock WHERE stock_id = ?', [stock_id]);
    return rows[0] || null;
  }
};

module.exports = BloodStock;