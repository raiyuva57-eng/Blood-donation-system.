const express = require('express');
const router = express.Router();
const { getHospitals, getHospitalById, createHospital, updateHospital, deleteHospital } = require('./hospitalController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');

router.get('/', protect, authorize('admin'), getHospitals);
router.get('/:id', protect, getHospitalById);
router.post('/', protect, authorize('admin'), createHospital);
router.put('/:id', protect, authorize('admin', 'hospital'), updateHospital);
router.delete('/:id', protect, authorize('admin'), deleteHospital);

module.exports = router;