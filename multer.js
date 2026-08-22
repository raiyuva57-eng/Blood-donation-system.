const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedExcelTypes = /xlsx|xls/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (file.fieldname === 'photo' || file.fieldname === 'profile_photo') {
    if (allowedImageTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only JPEG, JPG, PNG, WEBP images are allowed'));
  }

  if (file.fieldname === 'excelFile') {
    if (allowedExcelTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only .xlsx or .xls files are allowed'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

module.exports = upload;