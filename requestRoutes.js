const express = require('express');
const router = express.Router();
const { getStock, createStock, updateStock, deleteStock } = require('./stockController');
const { protect } = require('./authMiddleware');
const { authorize } = require('./roleMiddleware');

router.get('/', getStock);
router.post('/', protect, authorize('admin', 'hospital'), createStock);
router.put('/:id', protect, authorize('admin', 'hospital'), updateStock);
router.delete('/:id', protect, authorize('admin'), deleteStock);

module.exports = router;