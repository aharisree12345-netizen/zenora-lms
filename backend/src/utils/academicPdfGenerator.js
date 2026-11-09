/**
 * Standard Academic PDF Document Generator for Zenora LMS
 * Generates valid Adobe PDF 1.4 documents with institutional headers,
 * curriculum topics, regulation specifications, and digital verification seal.
 */

function escapePdfText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function generateAcademicPdfBuffer(options = {}) {
  const institution = escapePdfText(options.institution || 'ZENORA INSTITUTE OF TECHNOLOGY');
  const subHeader = escapePdfText(options.subHeader || 'AUTONOMOUS INSTITUTION • AFFILIATED TO STATE UNIVERSITY • NAAC A++ (3.71 CGPA)');
  const regulation = escapePdfText(options.regulation || 'CBCS REGULATIONS 2021 • CURRICULUM SYLLABUS & LECTURE NOTES');
  
  const title = escapePdfText(options.title || 'Official Academic Course Document');
  const courseCode = escapePdfText(options.courseCode || 'CORE');
  const courseName = escapePdfText(options.courseName || 'Curriculum Course');
  const department = escapePdfText(options.department || 'Academic Department');
  const semester = escapePdfText(options.semester || 'Semester 4 (S4)');
  const category = escapePdfText(options.category || 'Official Course Material');
  const faculty = escapePdfText(options.faculty || 'Department Faculty Board');
  const dateStr = escapePdfText(options.date || 'Academic Year 2025 - 2026');

  const defaultTopics = [
    'Unit 1: Foundations, System Models, and Theoretical Architecture',
    'Unit 2: Core Algorithmic Principles, Data Structures, and Mathematical Formulation',
    'Unit 3: Implementation Strategies, Query & Runtime Optimization, and Industry Standards',
    'Unit 4: Case Studies, Cloud Integration Patterns, and Applied Laboratory Work',
    'Unit 5: System Verification, Performance Benchmarking, and Evaluation Rubrics'
  ];

  const topics = (options.topics && options.topics.length > 0 ? options.topics : defaultTopics)
    .map(t => escapePdfText(t));

  const verifyId = `ZEN-DOC-${options.courseCode || 'ACAD'}-${Date.now().toString().slice(-6)}`;

  // Construct standard PDF text content stream
  const commands = [];
  commands.push('BT');

  // Institutional Header Banner
  commands.push('/F1 16 Tf');
  commands.push(`50 745 Td (${institution}) Tj`);

  commands.push('0 -18 Td');
  commands.push('/F1 8.5 Tf');
  commands.push(`(${subHeader}) Tj`);

  commands.push('0 -14 Td');
  commands.push('/F1 8 Tf');
  commands.push(`(${regulation}) Tj`);

  commands.push('0 -18 Td');
  commands.push('/F1 10 Tf');
  commands.push('(_____________________________________________________________________________________________________) Tj');

  // Document Title & Course Metadata
  commands.push('0 -24 Td');
  commands.push('/F1 13 Tf');
  commands.push(`(${title}) Tj`);

  commands.push('0 -18 Td');
  commands.push('/F1 9.5 Tf');
  commands.push(`(Course: ${courseCode} - ${courseName}  |  Department: ${department}) Tj`);

  commands.push('0 -15 Td');
  commands.push('/F1 9 Tf');
  commands.push(`(Term: ${semester}  |  Category: ${category}  |  Session: ${dateStr}) Tj`);

  commands.push('0 -15 Td');
  commands.push('/F1 9 Tf');
  commands.push(`(Course Instructor / Faculty: ${faculty}  |  Grading Scheme: Continuous Internal Assessment) Tj`);

  commands.push('0 -16 Td');
  commands.push('/F1 10 Tf');
  commands.push('(-------------------------------------------------------------------------------------------------------------------------------------) Tj');

  // Course Units & Learning Objectives
  commands.push('0 -20 Td');
  commands.push('/F1 11 Tf');
  commands.push('(SYLLABUS MODULES, TOPICS & LEARNING OUTCOMES:) Tj');

  topics.forEach(topic => {
    commands.push('0 -17 Td');
    commands.push('/F1 8.5 Tf');
    commands.push(`(• ${topic}) Tj`);
  });

  commands.push('0 -22 Td');
  commands.push('/F1 10 Tf');
  commands.push('(-------------------------------------------------------------------------------------------------------------------------------------) Tj');

  // Examination & Approval Footer
  commands.push('0 -18 Td');
  commands.push('/F1 8 Tf');
  commands.push('(Examination Scheme: Internal Assessment 40%  |  End-Semester University Examination 60%  |  Minimum Passing: 50%) Tj');

  commands.push('0 -14 Td');
  commands.push('/F1 8 Tf');
  commands.push('(Approved and verified for academic instruction under Autonomous Regulation 2021 by Academic Council.) Tj');

  commands.push('0 -16 Td');
  commands.push('/F1 8 Tf');
  commands.push(`(Digital Verification ID: ${verifyId}  |  Office of the Controller of Examinations - Zenora LMS) Tj`);

  commands.push('ET');

  const contentStream = commands.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj');
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

module.exports = {
  generateAcademicPdfBuffer,
  escapePdfText
};
