const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const MATERIALS_DIR = path.join(__dirname, '../uploads/materials');

async function runPipelineTests() {
  console.log('================================================================');
  console.log('🧪 ZENORA LMS – PDF VIEW & DOWNLOAD PIPELINE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(desc, ok, details = '') {
    if (ok) {
      console.log(`✅ PASS: ${desc}`);
      if (details) console.log(`   ℹ️  ${details}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      if (details) console.error(`   ⚠️  ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST SUITE 1: Physical Storage Verification
  // -------------------------------------------------------------
  console.log('\n--- [1. Physical Storage Verification] ---');
  const expectedFiles = [
    'CS401_Syllabus.pdf',
    'DBMS_Module1_Notes.pdf',
    'sample-syllabus.pdf',
    'lecture-notes.pdf',
    'CS8492_Syllabus.pdf',
    'CS8481_Lab_Manual.pdf',
    'Algorithms_DP_Handout.pdf'
  ];

  for (const fileName of expectedFiles) {
    const filePath = path.join(MATERIALS_DIR, fileName);
    const exists = fs.existsSync(filePath);
    let validHeader = false;
    let size = 0;
    if (exists) {
      size = fs.statSync(filePath).size;
      const buf = fs.readFileSync(filePath);
      validHeader = buf.toString('utf8', 0, 8).startsWith('%PDF-');
    }
    record(
      `File "${fileName}" exists and has valid PDF magic header`,
      exists && validHeader && size > 500,
      `Path: ${filePath} | Size: ${size} bytes | Header: %PDF`
    );
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: Express Static Public Serving
  // -------------------------------------------------------------
  console.log('\n--- [2. Express Static Public Uploads Serving] ---');
  try {
    const res1 = await fetch(`${BACKEND_URL}/uploads/materials/CS401_Syllabus.pdf`);
    const ct1 = res1.headers.get('content-type');
    const buf1 = await res1.arrayBuffer();
    const str1 = Buffer.from(buf1).toString('utf8', 0, 8);
    record(
      'GET /uploads/materials/CS401_Syllabus.pdf returns HTTP 200 with application/pdf',
      res1.status === 200 && ct1.includes('application/pdf') && str1.startsWith('%PDF-'),
      `Status: ${res1.status} | Content-Type: ${ct1} | Bytes: ${buf1.byteLength}`
    );
  } catch (e) {
    record('GET /uploads/materials/CS401_Syllabus.pdf', false, e.message);
  }

  try {
    const res2 = await fetch(`${BACKEND_URL}/uploads/materials/DBMS_Module1_Notes.pdf`);
    const ct2 = res2.headers.get('content-type');
    const buf2 = await res2.arrayBuffer();
    record(
      'GET /uploads/materials/DBMS_Module1_Notes.pdf returns HTTP 200 with application/pdf',
      res2.status === 200 && ct2.includes('application/pdf') && buf2.byteLength > 500,
      `Status: ${res2.status} | Content-Type: ${ct2} | Bytes: ${buf2.byteLength}`
    );
  } catch (e) {
    record('GET /uploads/materials/DBMS_Module1_Notes.pdf', false, e.message);
  }

  try {
    const res3 = await fetch(`${BACKEND_URL}/uploads/CS401_Syllabus.pdf`);
    record(
      'GET /uploads/CS401_Syllabus.pdf fallback route returns HTTP 200',
      res3.status === 200,
      `Status: ${res3.status}`
    );
  } catch (e) {
    record('GET /uploads/CS401_Syllabus.pdf', false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: Database Records (file_url and file_path fields)
  // -------------------------------------------------------------
  console.log('\n--- [3. Database Metadata & file_path Verification] ---');
  let materialsList = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/materials`);
    const json = await res.json();
    materialsList = json.data || [];
    record(
      'GET /api/materials returns valid academic documents list',
      res.status === 200 && json.success && materialsList.length >= 4,
      `Retrieved ${materialsList.length} documents`
    );

    const cs401Mat = materialsList.find(m => m.id === 'mat-cs-01');
    record(
      'Material "mat-cs-01" (CS401 Syllabus) has authentic file_url and file_path',
      cs401Mat && cs401Mat.file_url.includes('CS401_Syllabus.pdf') && cs401Mat.file_path.includes('CS401_Syllabus.pdf'),
      `file_url: ${cs401Mat?.file_url} | file_path: ${cs401Mat?.file_path}`
    );

    const dbmsNotes = materialsList.find(m => m.id === 'mat-cs-02');
    record(
      'Material "mat-cs-02" (DBMS Module 1 Notes) has authentic file_url and file_path',
      dbmsNotes && dbmsNotes.file_url.includes('DBMS_Module1_Notes.pdf') && dbmsNotes.file_path.includes('DBMS_Module1_Notes.pdf'),
      `file_url: ${dbmsNotes?.file_url} | file_path: ${dbmsNotes?.file_path}`
    );
  } catch (e) {
    record('GET /api/materials', false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: Dedicated Download Route GET /api/materials/:id/download
  // -------------------------------------------------------------
  console.log('\n--- [4. Dedicated Download Route Verification] ---');
  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/mat-cs-01/download`);
    const ct = res.headers.get('content-type');
    const cd = res.headers.get('content-disposition');
    const buf = await res.arrayBuffer();
    const str = Buffer.from(buf).toString('utf8', 0, 8);

    record(
      'GET /api/materials/mat-cs-01/download returns attachment headers and PDF binary',
      res.status === 200 &&
      ct.includes('application/pdf') &&
      cd && cd.includes('attachment') && cd.includes('.pdf') &&
      str.startsWith('%PDF-') &&
      buf.byteLength > 1000,
      `Status: ${res.status} | Content-Type: ${ct} | Content-Disposition: ${cd} | Bytes: ${buf.byteLength}`
    );
  } catch (e) {
    record('GET /api/materials/mat-cs-01/download', false, e.message);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/mat-cs-02/download`);
    const ct = res.headers.get('content-type');
    const cd = res.headers.get('content-disposition');
    const buf = await res.arrayBuffer();

    record(
      'GET /api/materials/mat-cs-02/download (DBMS Notes) delivers authentic download',
      res.status === 200 && ct.includes('application/pdf') && cd.includes('attachment') && buf.byteLength > 1000,
      `Content-Disposition: ${cd} | Bytes: ${buf.byteLength}`
    );
  } catch (e) {
    record('GET /api/materials/mat-cs-02/download', false, e.message);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/CS401_Syllabus.pdf/download`);
    const cd = res.headers.get('content-disposition');
    record(
      'GET /api/materials/CS401_Syllabus.pdf/download resolves by filename correctly',
      res.status === 200 && cd.includes('attachment'),
      `Content-Disposition: ${cd}`
    );
  } catch (e) {
    record('GET /api/materials/CS401_Syllabus.pdf/download', false, e.message);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/download/DBMS_Module1_Notes.pdf`);
    const cd = res.headers.get('content-disposition');
    record(
      'GET /api/materials/download/:id alias route delivers attachment',
      res.status === 200 && cd.includes('attachment'),
      `Content-Disposition: ${cd}`
    );
  } catch (e) {
    record('GET /api/materials/download/DBMS_Module1_Notes.pdf', false, e.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: Dedicated Inline View Route GET /api/materials/:id/view
  // -------------------------------------------------------------
  console.log('\n--- [5. Dedicated Inline View Route Verification] ---');
  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/mat-cs-01/view`);
    const ct = res.headers.get('content-type');
    const cd = res.headers.get('content-disposition');
    const xfo = res.headers.get('x-frame-options');
    const corp = res.headers.get('cross-origin-resource-policy');
    const buf = await res.arrayBuffer();

    record(
      'GET /api/materials/mat-cs-01/view serves inline PDF with iframe framing headers',
      res.status === 200 &&
      ct.includes('application/pdf') &&
      cd && cd.includes('inline') &&
      xfo === 'ALLOWALL' &&
      corp === 'cross-origin' &&
      buf.byteLength > 1000,
      `Status: ${res.status} | Content-Type: ${ct} | Content-Disposition: ${cd} | X-Frame-Options: ${xfo}`
    );
  } catch (e) {
    record('GET /api/materials/mat-cs-01/view', false, e.message);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/materials/view/CS401_Syllabus.pdf`);
    const cd = res.headers.get('content-disposition');
    record(
      'GET /api/materials/view/:id alias route serves inline stream',
      res.status === 200 && cd.includes('inline'),
      `Content-Disposition: ${cd}`
    );
  } catch (e) {
    record('GET /api/materials/view/CS401_Syllabus.pdf', false, e.message);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PIPELINE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPipelineTests().catch(err => {
  console.error('[Fatal Test Error]', err);
  process.exit(1);
});
