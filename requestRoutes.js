const express = require('express');
const router = express.Router();
const { getRequests, getRequestById, createRequest, updateRequest, deleteRequest } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);
router.post('/', protect, authorize('patient', 'admin'), createRequest);
router.put('/:id', protect, updateRequest);
router.delete('/:id', protect, authorize('admin', 'patient'), deleteRequest);

module.exports = router;