const express = require('express');
const router = express.Router();
const { importExcel, exportExcel } = require('./excelController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');
const upload = require('./multer');

router.post('/import-excel', protect, authorize('admin'), upload.single('excelFile'), importExcel);
router.get('/export-excel', protect, authorize('admin'), exportExcel);

module.exports = router;