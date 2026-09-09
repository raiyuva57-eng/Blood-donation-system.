const { pool } = require('./db');
const BloodRequest = require('./BloodRequest');
const asyncHandler = require('./asyncHandler');

// @route  GET /api/requests
// @access Private (role-aware: admin/hospital see all, donor/patient see their own)
const getRequests = asyncHandler(async (req, res) => {
  const { status, urgency, blood_group, limit, offset } = req.query;

  let requests;
  if (req.user.role === 'donor') {
    requests = await BloodRequest.findByDonorUserId(req.user.user_id);
  } else if (req.user.role === 'patient') {
    requests = await BloodRequest.findByPatientUserId(req.user.user_id);
  } else {
    // admin, hospital
    requests = await BloodRequest.findAll({ status, urgency, blood_group, limit, offset });
  }

  res.status(200).json({ success: true, count: requests.length, data: requests });
});

// @route  GET /api/requests/:id
// @access Private
const getRequestById = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }
  res.status(200).json({ success: true, data: request });
});

// @route  POST /api/requests
// @access Private (patient creates a request for themselves; admin can create for anyone)
const createRequest = asyncHandler(async (req, res) => {
  const { blood_group, units_required, urgency, required_by_date, notes, hospital_id, blood_bank_id, patient_id: bodyPatientId } = req.body;

  if (!blood_group || !units_required) {
    return res.status(400).json({ success: false, message: 'blood_group and units_required are required' });
  }

  let patient_id = bodyPatientId;

  if (req.user.role === 'patient') {
    const [rows] = await pool.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.user_id]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No patient profile found for this account' });
    }
    patient_id = rows[0].patient_id;
  }

  if (!patient_id) {
    return res.status(400).json({ success: false, message: 'patient_id is required' });
  }

  const request_id = await BloodRequest.create({
    patient_id, blood_group, units_required, urgency, required_by_date, notes, hospital_id, blood_bank_id
  });

  // Notify all available donors with matching blood group
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, related_request_id)
     SELECT u.user_id, 'New Blood Request', CONCAT('A patient needs ', ?, ' blood urgently.'), 
            CASE WHEN ? = 'emergency' THEN 'emergency' ELSE 'info' END, ?
     FROM donors d JOIN users u ON d.user_id = u.user_id
     WHERE d.blood_group = ? AND d.availability_status = 'available' AND d.is_eligible = TRUE`,
    [blood_group, urgency || 'normal', request_id, blood_group]
  );

  res.status(201).json({ success: true, message: 'Blood request created successfully', data: { request_id } });
});

// @route  PUT /api/requests/:id
// @access Private (donor accepts/rejects; hospital verifies; admin/patient update status)
const updateRequest = asyncHandler(async (req, res) => {
  const { status, donor_id, hospital_id, blood_bank_id, units_required, urgency, notes, hospital_verified } = req.body;

  const request = await BloodRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }

  // Donor accepting/rejecting a request assigned to them
  if (req.user.role === 'donor' && status) {
    const [rows] = await pool.query('SELECT donor_id FROM donors WHERE user_id = ?', [req.user.user_id]);
    const donorRecord = rows[0];
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Donors can only accept or reject requests' });
    }
    await BloodRequest.update(req.params.id, { status, donor_id: status === 'accepted' ? donorRecord.donor_id : null });
    return res.status(200).json({ success: true, message: `Request ${status} successfully` });
  }

  await BloodRequest.update(req.params.id, { status, donor_id, hospital_id, blood_bank_id, units_required, urgency, notes, hospital_verified });
  res.status(200).json({ success: true, message: 'Blood request updated successfully' });
});

// @route  DELETE /api/requests/:id
// @access Private (admin, or patient cancelling own request)
const deleteRequest = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }
  await BloodRequest.delete(req.params.id);
  res.status(200).json({ success: true, message: 'Blood request deleted successfully' });
});

module.exports = { getRequests, getRequestById, createRequest, updateRequest, deleteRequest };