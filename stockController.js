const BloodStock = require('./BloodStock');
const asyncHandler = require('./asyncHandler');

// @route  GET /api/stock
// @access Public (patients need to search blood availability)
const getStock = asyncHandler(async (req, res) => {
  const { blood_group, city } = req.query;

  const stock = (blood_group || city)
    ? await BloodStock.findByGroupAndCity(blood_group, city)
    : await BloodStock.findAll();

  res.status(200).json({ success: true, count: stock.length, data: stock });
});

// @route  POST /api/stock
// @access Private (admin, hospital)
const createStock = asyncHandler(async (req, res) => {
  const { blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date } = req.body;

  if (!blood_bank_id || !blood_group || units_available === undefined) {
    return res.status(400).json({ success: false, message: 'blood_bank_id, blood_group and units_available are required' });
  }

  const stock_id = await BloodStock.create({ blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date });
  res.status(201).json({ success: true, message: 'Blood stock added successfully', data: { stock_id } });
});

// @route  PUT /api/stock/:id
// @access Private (admin, hospital)
const updateStock = asyncHandler(async (req, res) => {
  const stock = await BloodStock.findById(req.params.id);
  if (!stock) {
    return res.status(404).json({ success: false, message: 'Stock record not found' });
  }

  const { units_available, units_reserved, minimum_threshold, expiry_date } = req.body;
  await BloodStock.update(req.params.id, { units_available, units_reserved, minimum_threshold, expiry_date, last_restocked: new Date().toISOString().slice(0, 10) });

  res.status(200).json({ success: true, message: 'Blood stock updated successfully' });
});

// @route  DELETE /api/stock/:id
// @access Private (admin)
const deleteStock = asyncHandler(async (req, res) => {
  const stock = await BloodStock.findById(req.params.id);
  if (!stock) {
    return res.status(404).json({ success: false, message: 'Stock record not found' });
  }
  await BloodStock.delete(req.params.id);
  res.status(200).json({ success: true, message: 'Blood stock deleted successfully' });
});

module.exports = { getStock, createStock, updateStock, deleteStock };