import ExcelJS from 'exceljs';

export interface RegistrationExportRow {
  serialNumber: number;
  teamUid: string;
  teamName: string;
  eventDomain: string;
  selectedChallenge: string;
  teamLeadName: string;
  teamLeadEmail: string;
  teamLeadPhone: string;
  collegeName: string;
  p1Name: string;
  p1Email: string;
  p1Phone: string;
  p2Name: string;
  p2Email: string;
  p2Phone: string;
  p3Name: string;
  p3Email: string;
  p3Phone: string;
  totalMembers: number;
  registrationDate: string;
  paymentAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  transactionReference: string;
  registrationStatus: string;
}

export async function generateRegistrationsExcel(
  rows: RegistrationExportRow[],
  sheetTitle: string = 'Hackathon Registrations'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Hackathon Administration Platform';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetTitle, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define 25 exact required columns
  worksheet.columns = [
    { header: 'Serial Number', key: 'serialNumber', width: 14 },
    { header: 'Team ID', key: 'teamUid', width: 18 },
    { header: 'Team Name', key: 'teamName', width: 24 },
    { header: 'Event Domain', key: 'eventDomain', width: 32 },
    { header: 'Selected Challenge', key: 'selectedChallenge', width: 24 },
    { header: 'Team Lead Name', key: 'teamLeadName', width: 22 },
    { header: 'Team Lead Email', key: 'teamLeadEmail', width: 28 },
    { header: 'Team Lead Contact', key: 'teamLeadPhone', width: 18 },
    { header: 'College Name', key: 'collegeName', width: 32 },
    { header: 'Participant 1 Name', key: 'p1Name', width: 22 },
    { header: 'Participant 1 Email', key: 'p1Email', width: 28 },
    { header: 'Participant 1 Contact', key: 'p1Phone', width: 18 },
    { header: 'Participant 2 Name', key: 'p2Name', width: 22 },
    { header: 'Participant 2 Email', key: 'p2Email', width: 28 },
    { header: 'Participant 2 Contact', key: 'p2Phone', width: 18 },
    { header: 'Participant 3 Name', key: 'p3Name', width: 22 },
    { header: 'Participant 3 Email', key: 'p3Email', width: 28 },
    { header: 'Participant 3 Contact', key: 'p3Phone', width: 18 },
    { header: 'Total Team Members', key: 'totalMembers', width: 18 },
    { header: 'Registration Date', key: 'registrationDate', width: 22 },
    { header: 'Payment Amount', key: 'paymentAmount', width: 16 },
    { header: 'Payment Status', key: 'paymentStatus', width: 16 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Transaction Reference', key: 'transactionReference', width: 26 },
    { header: 'Registration Status', key: 'registrationStatus', width: 18 },
  ];

  // Header styling: #171717 background, #FFFFFF text, bold
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF171717' },
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFD71935' } },
    };
  });

  // Enable Auto Filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 25 },
  };

  // Add rows with styling
  rows.forEach((r, idx) => {
    const row = worksheet.addRow({
      serialNumber: r.serialNumber || idx + 1,
      teamUid: r.teamUid,
      teamName: r.teamName,
      eventDomain: r.eventDomain,
      selectedChallenge: r.selectedChallenge || 'N/A',
      teamLeadName: r.teamLeadName,
      teamLeadEmail: r.teamLeadEmail,
      teamLeadPhone: r.teamLeadPhone,
      collegeName: r.collegeName,
      p1Name: r.p1Name || 'N/A',
      p1Email: r.p1Email || 'N/A',
      p1Phone: r.p1Phone || 'N/A',
      p2Name: r.p2Name || 'N/A',
      p2Email: r.p2Email || 'N/A',
      p2Phone: r.p2Phone || 'N/A',
      p3Name: r.p3Name || 'N/A',
      p3Email: r.p3Email || 'N/A',
      p3Phone: r.p3Phone || 'N/A',
      totalMembers: r.totalMembers,
      registrationDate: r.registrationDate,
      paymentAmount: r.paymentAmount,
      paymentStatus: r.paymentStatus,
      paymentMethod: r.paymentMethod,
      transactionReference: r.transactionReference || 'N/A',
      registrationStatus: r.registrationStatus,
    });

    row.height = 20;

    // Alternate row background with light grey (#E8EAED)
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF171717' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 19 || colNumber === 21 ? 'center' : 'left',
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' },
        };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE8EAED' } },
        right: { style: 'thin', color: { argb: 'FFE8EAED' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

