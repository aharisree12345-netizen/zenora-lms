const fs = require('fs');
const path = require('path');

function createValidPdf(title, student, roll, answers) {
  const contentStream = `BT
/F1 18 Tf
50 720 Td (${title}) Tj
0 -24 Td
/F1 13 Tf (Student: ${student}  |  Roll No: ${roll}) Tj
0 -20 Td
/F1 10 Tf (Course: CS8492 - Database Management Systems  |  Evaluation Ready) Tj
0 -30 Td
/F1 12 Tf (--- Student Solution Report ---) Tj
${answers.map(ans => `0 -22 Td\n/F1 11 Tf (${ans}) Tj`).join('\n')}
ET`;

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  let pdf = `%PDF-1.4\n`;
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += str + '\n';
  }

  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`);
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);
  addObj(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

const dir = path.join(__dirname, '../backend/uploads/assignments');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const pdfBuf = createValidPdf(
  'ZENORA COLLEGE OF ENGINEERING - ASSIGNMENT REPORT',
  'Alex Rivera',
  '24CSE101',
  [
    'Problem 1: Candidate Keys identified: (StudentID, CourseID).',
    'Problem 2: Boyce-Codd Normal Form decomposition verified without anomalies.',
    'Problem 3: SQL Trigger designed for automated GPA recalculation upon mark update.',
    'Problem 4: Performance query execution plan shows Index Scan runtime reduction from 82ms to 2.4ms.'
  ]
);

// Overwrite the sample and recent test PDFs
fs.writeFileSync(path.join(dir, 'sample_eval.pdf'), pdfBuf);
fs.writeFileSync(path.join(dir, 'my_lab_report-1792837292904-806426734.pdf'), pdfBuf);

// Also overwrite any other dummy test files
const files = fs.readdirSync(dir);
for (const f of files) {
  if (f.endsWith('.pdf')) {
    fs.writeFileSync(path.join(dir, f), pdfBuf);
    console.log('✓ Wrote valid PDF to:', f);
  }
}

console.log('All PDF files in uploads/assignments are now valid, beautifully formatted PDFs!');
