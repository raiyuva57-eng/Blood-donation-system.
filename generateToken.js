const jwt = require('jsonwebtoken');
const jwtConfig = require('./jwt');

const generateToken = (user_id, role) => {
  return jwt.sign({ user_id, role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

module.exports = generateToken;