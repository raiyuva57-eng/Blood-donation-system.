const express = require('express');
const router = express.Router();
const { getDonors, getDonorById, createDonor, updateDonor, deleteDonor } = require('./donorController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');

router.get('/', protect, authorize('admin', 'hospital'), getDonors);
router.get('/:id', protect, getDonorById);
router.post('/', protect, authorize('admin'), createDonor);
router.put('/:id', protect, authorize('admin', 'donor'), updateDonor);
router.delete('/:id', protect, authorize('admin'), deleteDonor);

module.exports = router;