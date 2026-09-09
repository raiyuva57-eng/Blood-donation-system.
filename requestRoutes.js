const express = require('express');
const router = express.Router();
const { getRequests, getRequestById, createRequest, updateRequest, deleteRequest } = require('./requestController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');

router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);
router.post('/', protect, authorize('patient', 'admin'), createRequest);
router.put('/:id', protect, updateRequest);
router.delete('/:id', protect, authorize('admin', 'patient'), deleteRequest);

module.exports = router;