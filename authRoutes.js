const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, getProfile, updateProfile, changePassword } = require('./authController');
const { protect } = require('./authMiddleware');
const { authLimiter } = require('./rateLimiter');
const validateRequest = require('./validateRequest');

const registerValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be a 10-digit number'),
  body('role').isIn(['admin', 'donor', 'patient', 'hospital']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', authLimiter, registerValidation, validateRequest, register);
router.post('/login', authLimiter, loginValidation, validateRequest, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/password', protect, changePassword);

module.exports = router;