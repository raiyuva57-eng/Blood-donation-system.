const jwt = require('jsonwebtoken');
const jwtConfig = require('./jwt');
const User = require('./User');
const asyncHandler = require('./asyncHandler');

// Verifies JWT and attaches the authenticated user to req.user
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  const decoded = jwt.verify(token, jwtConfig.secret); // throws -> caught by asyncHandler -> errorHandler

  const user = await User.findById(decoded.user_id);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User no longer exists' });
  }
  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Account has been deactivated' });
  }

  req.user = user;
  next();
});

module.exports = { protect };