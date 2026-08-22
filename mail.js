const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  Mail server not configured yet:', error.message);
  } else {
    console.log('✅ Mail server ready');
  }
});

module.exports = transporter;