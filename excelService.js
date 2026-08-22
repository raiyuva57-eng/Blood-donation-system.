const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');

const excelService = {
  // ---- IMPORT: read an uploaded .xlsx file into an array of row objects ----
  parseExcelFile: (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
    return rows;
  },

  deleteFile: (filePath) => {
    fs.unlink(filePath, (err) => {
      if (err) console.warn('Could not delete temp upload file:', err.message);
    });
  },

  // ---- EXPORT: build a styled .xlsx workbook and stream it back ----
  buildWorkbook: async ({ sheetName, columns, rows }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Blood Donation Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20
    }));

    // Header row styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB91C1C' } // medical red theme
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 22;

    rows.forEach((row) => worksheet.addRow(row));

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Alternate row shading for readability
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }
    });

    return workbook;
  },

  sendWorkbook: async (res, workbook, filename) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }
};

module.exports = excelService;