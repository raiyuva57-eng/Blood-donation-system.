const express = require('express');
const router = express.Router();
const { importExcel, exportExcel } = require('../controllers/excelController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../config/multer');

router.post('/import-excel', protect, authorize('admin'), upload.single('excelFile'), importExcel);
router.get('/export-excel', protect, authorize('admin'), exportExcel);

module.exports = router;