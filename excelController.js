const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const excelService = require('./excelService');
const asyncHandler = require('./asyncHandler');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ============================================================
// IMPORT
// ============================================================

// @route  POST /api/import-excel?type=donors|hospitals|stock
// @access Private (admin)
const importExcel = asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No Excel file uploaded (field name must be "excelFile")' });
  }
  if (!['donors', 'hospitals', 'stock'].includes(type)) {
    excelService.deleteFile(req.file.path);
    return res.status(400).json({ success: false, message: 'type must be one of: donors, hospitals, stock' });
  }

  let rows;
  try {
    rows = excelService.parseExcelFile(req.file.path);
  } catch (err) {
    excelService.deleteFile(req.file.path);
    return res.status(400).json({ success: false, message: 'Could not read Excel file. Ensure it is a valid .xlsx file.' });
  }

  if (rows.length === 0) {
    excelService.deleteFile(req.file.path);
    return res.status(400).json({ success: false, message: 'Excel file has no data rows' });
  }

  let result;
  if (type === 'donors') result = await importDonors(rows);
  if (type === 'hospitals') result = await importHospitals(rows);
  if (type === 'stock') result = await importStock(rows);

  excelService.deleteFile(req.file.path);

  res.status(200).json({
    success: true,
    message: `Import complete: ${result.successCount} succeeded, ${result.errors.length} failed`,
    data: result
  });
});

// Expected columns: full_name, email, phone, blood_group, city, date_of_birth (YYYY-MM-DD), gender
async function importDonors(rows) {
  const errors = [];
  let successCount = 0;
  const defaultPassword = await bcrypt.hash('Donor@123', 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for header row

    try {
      if (!row.full_name || !row.email || !row.phone || !row.blood_group || !row.date_of_birth || !row.gender) {
        throw new Error('Missing required field(s)');
      }
      if (!VALID_BLOOD_GROUPS.includes(row.blood_group)) {
        throw new Error(`Invalid blood_group: ${row.blood_group}`);
      }

      const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [row.email]);
      if (existing.length > 0) {
        throw new Error('Email already exists, skipped');
      }

      const [userResult] = await pool.query(
        `INSERT INTO users (full_name, email, password, phone, role, city, is_verified)
         VALUES (?, ?, ?, ?, 'donor', ?, TRUE)`,
        [row.full_name, row.email, defaultPassword, row.phone, row.city || null]
      );

      await pool.query(
        `INSERT INTO donors (user_id, blood_group, date_of_birth, gender) VALUES (?, ?, ?, ?)`,
        [userResult.insertId, row.blood_group, row.date_of_birth, row.gender.toLowerCase()]
      );

      successCount++;
    } catch (err) {
      errors.push({ row: rowNum, email: row.email || 'N/A', reason: err.message });
    }
  }

  return { successCount, errors };
}

// Expected columns: hospital_name, license_number, email, phone, address, city, state, pincode, hospital_type
async function importHospitals(rows) {
  const errors = [];
  let successCount = 0;
  const defaultPassword = await bcrypt.hash('Hospital@123', 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (!row.hospital_name || !row.license_number || !row.email || !row.phone || !row.address || !row.city || !row.state) {
        throw new Error('Missing required field(s)');
      }

      const [existingUser] = await pool.query('SELECT user_id FROM users WHERE email = ?', [row.email]);
      const [existingLicense] = await pool.query('SELECT hospital_id FROM hospitals WHERE license_number = ?', [row.license_number]);
      if (existingUser.length > 0) throw new Error('Email already exists, skipped');
      if (existingLicense.length > 0) throw new Error('License number already exists, skipped');

      const [userResult] = await pool.query(
        `INSERT INTO users (full_name, email, password, phone, role, address, city, state, pincode, is_verified)
         VALUES (?, ?, ?, ?, 'hospital', ?, ?, ?, ?, TRUE)`,
        [row.hospital_name, row.email, defaultPassword, row.phone, row.address, row.city, row.state, row.pincode || null]
      );

      await pool.query(
        `INSERT INTO hospitals (user_id, hospital_name, license_number, hospital_type, address, city, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userResult.insertId, row.hospital_name, row.license_number, row.hospital_type || 'private', row.address, row.city, row.state, row.pincode || null]
      );

      successCount++;
    } catch (err) {
      errors.push({ row: rowNum, hospital_name: row.hospital_name || 'N/A', reason: err.message });
    }
  }

  return { successCount, errors };
}

// Expected columns: blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date
async function importStock(rows) {
  const errors = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (!row.blood_bank_id || !row.blood_group || row.units_available === null || row.units_available === undefined) {
        throw new Error('Missing required field(s)');
      }
      if (!VALID_BLOOD_GROUPS.includes(row.blood_group)) {
        throw new Error(`Invalid blood_group: ${row.blood_group}`);
      }

      const [bankExists] = await pool.query('SELECT blood_bank_id FROM blood_banks WHERE blood_bank_id = ?', [row.blood_bank_id]);
      if (bankExists.length === 0) throw new Error(`blood_bank_id ${row.blood_bank_id} does not exist`);

      await pool.query(
        `INSERT INTO blood_stock (blood_bank_id, blood_group, units_available, minimum_threshold, expiry_date, last_restocked)
         VALUES (?, ?, ?, ?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE units_available = units_available + VALUES(units_available), last_restocked = CURDATE()`,
        [row.blood_bank_id, row.blood_group, Number(row.units_available), row.minimum_threshold || 10, row.expiry_date || null]
      );

      successCount++;
    } catch (err) {
      errors.push({ row: rowNum, blood_group: row.blood_group || 'N/A', reason: err.message });
    }
  }

  return { successCount, errors };
}

// ============================================================
// EXPORT
// ============================================================

// @route  GET /api/export-excel?type=donors|patients|requests|stock|donations
// @access Private (admin)
const exportExcel = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const exporters = {
    donors: exportDonors,
    patients: exportPatients,
    requests: exportRequests,
    stock: exportStock,
    donations: exportDonations
  };

  if (!exporters[type]) {
    return res.status(400).json({ success: false, message: 'type must be one of: donors, patients, requests, stock, donations' });
  }

  await exporters[type](res);
});

async function exportDonors(res) {
  const [rows] = await pool.query(
    `SELECT u.full_name, u.email, u.phone, u.city, d.blood_group, d.gender,
            d.date_of_birth, d.last_donation_date, d.total_donations, d.availability_status, d.is_eligible
     FROM donors d JOIN users u ON d.user_id = u.user_id ORDER BY u.full_name`
  );

  const workbook = await require('./excelService').buildWorkbook({
    sheetName: 'Donors',
    columns: [
      { header: 'Full Name', key: 'full_name', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Blood Group', key: 'blood_group', width: 12 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'date_of_birth', width: 15 },
      { header: 'Last Donation', key: 'last_donation_date', width: 15 },
      { header: 'Total Donations', key: 'total_donations', width: 16 },
      { header: 'Availability', key: 'availability_status', width: 14 },
      { header: 'Eligible', key: 'is_eligible', width: 10 }
    ],
    rows
  });

  await require('./excelService').sendWorkbook(res, workbook, `donors_export_${Date.now()}.xlsx`);
}

async function exportPatients(res) {
  const [rows] = await pool.query(
    `SELECT u.full_name, u.email, u.phone, u.city, p.blood_group_needed, p.medical_condition, p.emergency_contact
     FROM patients p JOIN users u ON p.user_id = u.user_id ORDER BY u.full_name`
  );

  const workbook = await require('./excelService').buildWorkbook({
    sheetName: 'Patients',
    columns: [
      { header: 'Full Name', key: 'full_name', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Blood Group Needed', key: 'blood_group_needed', width: 18 },
      { header: 'Medical Condition', key: 'medical_condition', width: 24 },
      { header: 'Emergency Contact', key: 'emergency_contact', width: 18 }
    ],
    rows
  });

  await require('./excelService').sendWorkbook(res, workbook, `patients_export_${Date.now()}.xlsx`);
}

async function exportRequests(res) {
  const [rows] = await pool.query(
    `SELECT br.request_id, u.full_name AS patient_name, br.blood_group, br.units_required,
            br.urgency, br.status, br.required_by_date, br.created_at
     FROM blood_requests br
     JOIN patients p ON br.patient_id = p.patient_id
     JOIN users u ON p.user_id = u.user_id
     ORDER BY br.created_at DESC`
  );

  const workbook = await require('./excelService').buildWorkbook({
    sheetName: 'Blood Requests',
    columns: [
      { header: 'Request ID', key: 'request_id', width: 12 },
      { header: 'Patient Name', key: 'patient_name', width: 22 },
      { header: 'Blood Group', key: 'blood_group', width: 12 },
      { header: 'Units Required', key: 'units_required', width: 15 },
      { header: 'Urgency', key: 'urgency', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Required By', key: 'required_by_date', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ],
    rows
  });

  await require('./excelService').sendWorkbook(res, workbook, `requests_export_${Date.now()}.xlsx`);
}

async function exportStock(res) {
  const [rows] = await pool.query(
    `SELECT bb.bank_name, bb.city, bs.blood_group, bs.units_available, bs.units_reserved,
            bs.minimum_threshold, bs.expiry_date, bs.last_restocked
     FROM blood_stock bs JOIN blood_banks bb ON bs.blood_bank_id = bb.blood_bank_id
     ORDER BY bb.bank_name, bs.blood_group`
  );

  const workbook = await require('./excelService').buildWorkbook({
    sheetName: 'Blood Stock',
    columns: [
      { header: 'Blood Bank', key: 'bank_name', width: 24 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Blood Group', key: 'blood_group', width: 12 },
      { header: 'Units Available', key: 'units_available', width: 16 },
      { header: 'Units Reserved', key: 'units_reserved', width: 16 },
      { header: 'Min Threshold', key: 'minimum_threshold', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Last Restocked', key: 'last_restocked', width: 16 }
    ],
    rows
  });

  await require('./excelService').sendWorkbook(res, workbook, `stock_export_${Date.now()}.xlsx`);
}

async function exportDonations(res) {
  const [rows] = await pool.query(
    `SELECT dh.donation_id, u.full_name AS donor_name, dh.blood_group, dh.units_donated,
            dh.donation_date, dh.certificate_number, dh.status
     FROM donation_history dh
     JOIN donors d ON dh.donor_id = d.donor_id
     JOIN users u ON d.user_id = u.user_id
     ORDER BY dh.donation_date DESC`
  );

  const workbook = await require('./excelService').buildWorkbook({
    sheetName: 'Donation History',
    columns: [
      { header: 'Donation ID', key: 'donation_id', width: 14 },
      { header: 'Donor Name', key: 'donor_name', width: 22 },
      { header: 'Blood Group', key: 'blood_group', width: 12 },
      { header: 'Units Donated', key: 'units_donated', width: 15 },
      { header: 'Donation Date', key: 'donation_date', width: 15 },
      { header: 'Certificate No.', key: 'certificate_number', width: 18 },
      { header: 'Status', key: 'status', width: 12 }
    ],
    rows
  });

  await require('./excelService').sendWorkbook(res, workbook, `donations_export_${Date.now()}.xlsx`);
}

module.exports = { importExcel, exportExcel };
