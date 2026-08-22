const express = require('express');
const router = express.Router();
const { getPatients, getPatientById, createPatient, updatePatient, deletePatient } = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin', 'hospital'), getPatients);
router.get('/:id', protect, getPatientById);
router.post('/', protect, authorize('admin'), createPatient);
router.put('/:id', protect, authorize('admin', 'patient'), updatePatient);
router.delete('/:id', protect, authorize('admin'), deletePatient);

module.exports = router;