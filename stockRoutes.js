const express = require('express');
const router = express.Router();
const { getStock, createStock, updateStock, deleteStock } = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getStock); // public - patients need to search availability
router.post('/', protect, authorize('admin', 'hospital'), createStock);
router.put('/:id', protect, authorize('admin', 'hospital'), updateStock);
router.delete('/:id', protect, authorize('admin'), deleteStock);

module.exports = router;