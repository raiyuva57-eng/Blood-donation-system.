const bcrypt = require('bcrypt');
const User = require('../models/User');
const Donor = require('../models/Donor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { pool } = require('../config/db');

// @route  POST /api/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const {
    full_name, email, password, phone, role,
    address, city, state, pincode,
    // donor fields
    blood_group, date_of_birth, gender, weight,
    // patient fields
    blood_group_needed, medical_condition,
    // hospital fields
    hospital_name, license_number, hospital_type
  } = req.body;

  if (!full_name || !email || !password || !phone || !role) {
    return res.status(400).json({ success: false, message: 'full_name, email, password, phone and role are required' });
  }

  const validRoles = ['admin', 'donor', 'patient', 'hospital'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified' });
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Use a transaction so user + role-specific row are created atomically
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `INSERT INTO users (full_name, email, password, phone, role, address, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, hashedPassword, phone, role, address || null, city || null, state || null, pincode || null]
    );
    const user_id = userResult.insertId;

    if (role === 'donor') {
      if (!blood_group || !date_of_birth || !gender) {
        throw Object.assign(new Error('blood_group, date_of_birth and gender are required for donor registration'), { statusCode: 400 });
      }
      await connection.query(
        `INSERT INTO donors (user_id, blood_group, date_of_birth, gender, weight) VALUES (?, ?, ?, ?, ?)`,
        [user_id, blood_group, date_of_birth, gender, weight || null]
      );
    }

    if (role === 'patient') {
      if (!blood_group_needed) {
        throw Object.assign(new Error('blood_group_needed is required for patient registration'), { statusCode: 400 });
      }
      await connection.query(
        `INSERT INTO patients (user_id, blood_group_needed, date_of_birth, gender, medical_condition) VALUES (?, ?, ?, ?, ?)`,
        [user_id, blood_group_needed, date_of_birth || null, gender || null, medical_condition || null]
      );
    }

    if (role === 'hospital') {
      if (!hospital_name || !license_number) {
        throw Object.assign(new Error('hospital_name and license_number are required for hospital registration'), { statusCode: 400 });
      }
      await connection.query(
        `INSERT INTO hospitals (user_id, hospital_name, license_number, hospital_type, address, city, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, hospital_name, license_number, hospital_type || 'private', address || '', city || '', state || '', pincode || null]
      );
    }

    await connection.commit();

    const token = generateToken(user_id, role);
    const user = await User.findById(user_id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token }
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
});

// @route  POST /api/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  await User.updateLastLogin(user.user_id);
  const token = generateToken(user.user_id, user.role);

  delete user.password;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token }
  });
});

// @route  GET /api/profile
// @access Private
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  let roleData = null;

  if (user.role === 'donor') roleData = await Donor.findByUserId(user.user_id);
  if (user.role === 'patient') roleData = await Patient.findByUserId(user.user_id);
  if (user.role === 'hospital') roleData = await Hospital.findByUserId(user.user_id);

  res.status(200).json({
    success: true,
    data: { user, roleData }
  });
});

// @route  PUT /api/profile
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone, address, city, state, pincode } = req.body;

  await User.updateProfile(req.user.user_id, { full_name, phone, address, city, state, pincode });
  const updatedUser = await User.findById(req.user.user_id);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
});

// @route  PUT /api/profile/password
// @access Private
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const fullUser = await User.findByEmail(req.user.email);
  const isMatch = await bcrypt.compare(current_password, fullUser.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(new_password, salt);
  await User.updatePassword(req.user.user_id, hashedPassword);

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, getProfile, updateProfile, changePassword };