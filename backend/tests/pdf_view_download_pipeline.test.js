/**
 * PDF View & Download Pipeline End-to-End Verification Test
 * Validates:
 * 1. Physical non-empty, compliant PDF files on disk
 * 2. Express static routes & CORS headers
 * 3. Guaranteed file stream download & view controllers
 * 4. Assignments & Syllabus specific download controllers
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const bodyBuf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer: bodyBuf,
          text: () => bodyBuf.toString('utf8'),
          json: () => {
            try {
              return JSON.parse(bodyBuf.toString('utf8'));
            } catch (e) {
              return null;
            }
          }
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 ZENORA LMS - PDF VIEW & DOWNLOAD PIPELINE AUDIT & TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 1: Physical File Storage & Validity on Server Disk
  // -------------------------------------------------------------
  console.log('📂 1. Physical Storage Verification & PDF Standard Validity:');
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const targetFiles = [
    {
      name: 'retail_sales_schema.pdf',
      rel: 'assignments/retail_sales_schema.pdf',
      full: path.join(uploadsDir, 'assignments', 'retail_sales_schema.pdf')
    },
    {
      name: 'student_solution_cs24001.pdf',
      rel: 'assignments/student_solution_cs24001.pdf',
      full: path.join(uploadsDir, 'assignments', 'student_solution_cs24001.pdf')
    },
    {
      name: 'CS401_Syllabus.pdf',
      rel: 'materials/CS401_Syllabus.pdf',
      full: path.join(uploadsDir, 'materials', 'CS401_Syllabus.pdf')
    }
  ];

  for (const file of targetFiles) {
    const exists = fs.existsSync(file.full);
    assert(exists, `Physical file exists: ${file.rel}`);
    if (exists) {
      const stat = fs.statSync(file.full);
      assert(stat.size > 500, `File size is non-empty (>500 bytes)`, `${stat.size} bytes`);

      const head = Buffer.alloc(10);
      const fd = fs.openSync(file.full, 'r');
      fs.readSync(fd, head, 0, 10, 0);
      fs.closeSync(fd);
      const magic = head.toString('ascii');
      assert(magic.startsWith('%PDF-1.'), `Valid standard PDF-1.x binary header`, `Header: ${magic.slice(0, 8)}`);
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Express Static File Serving & CORS Headers
  // -------------------------------------------------------------
  console.log('\n🌐 2. Express Static PDF Route & CORS Headers:');
  for (const file of targetFiles) {
    const url = `${BASE_URL}/uploads/${file.rel}`;
    const res = await makeRequest(url);
    assert(res.status === 200, `Static GET /uploads/${file.rel} returns HTTP 200`, `Status: ${res.status}`);
    assert(res.headers['content-type'] && res.headers['content-type'].includes('application/pdf'),
      `Content-Type is application/pdf`, `Type: ${res.headers['content-type']}`);
    assert(res.buffer.subarray(0, 5).toString('ascii') === '%PDF-',
      `Payload binary stream starts with %PDF-`, `Length: ${res.buffer.length} bytes`);
    assert(res.headers['access-control-allow-origin'] === '*',
      `CORS Access-Control-Allow-Origin: * present`, `CORS: ${res.headers['access-control-allow-origin']}`);
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Guaranteed Stream Download Endpoint: GET /api/files/download
  // -------------------------------------------------------------
  console.log('\n📥 3. Guaranteed Stream Controller: GET /api/files/download?path=:path:');
  for (const file of targetFiles) {
    const downloadUrl = `${BASE_URL}/api/files/download?path=/uploads/${file.rel}`;
    const res = await makeRequest(downloadUrl);
    assert(res.status === 200, `GET /api/files/download for ${file.name} returns HTTP 200`);
    assert(res.headers['content-type'] && res.headers['content-type'].includes('application/pdf'),
      `Content-Type is application/pdf`);
    assert(res.headers['content-disposition'] && res.headers['content-disposition'].includes('attachment'),
      `Content-Disposition header triggers attachment download`, res.headers['content-disposition']);
    assert(res.headers['content-disposition'] && res.headers['content-disposition'].includes(file.name),
      `Content-Disposition specifies correct filename`, file.name);
    assert(res.buffer.subarray(0, 5).toString('ascii') === '%PDF-',
      `Streamed payload is authentic non-empty PDF binary`, `${res.buffer.length} bytes`);
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: Inline View Stream Controller: GET /api/files/view
  // -------------------------------------------------------------
  console.log('\n👁️ 4. Guaranteed Stream View Controller: GET /api/files/view?path=:path:');
  const viewUrl = `${BASE_URL}/api/files/view?path=/uploads/materials/CS401_Syllabus.pdf`;
  const viewRes = await makeRequest(viewUrl);
  assert(viewRes.status === 200, `GET /api/files/view returns HTTP 200`);
  assert(viewRes.headers['content-type'] && viewRes.headers['content-type'].includes('application/pdf'),
    `Content-Type is application/pdf`);
  assert(viewRes.headers['content-disposition'] && viewRes.headers['content-disposition'].includes('inline'),
    `Content-Disposition header specifies inline display`, viewRes.headers['content-disposition']);
  assert(viewRes.buffer.length > 1000, `Streamed full syllabus PDF data`, `${viewRes.buffer.length} bytes`);

  // -------------------------------------------------------------
  // TEST GROUP 5: Assignments & Materials Specific Endpoints
  // -------------------------------------------------------------
  console.log('\n📚 5. Module-Specific Download & View Endpoints:');

  // Login as student to test assignment submission download
  const loginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'student@apex.edu', password: 'Student@123' })
  });
  const token = loginRes.json()?.token;
  assert(Boolean(token), 'Student authentication successful for assignment download');

  if (token) {
    const subDlUrl = `${BASE_URL}/api/assignments/submissions/subm-alex-01/download`;
    const subDlRes = await makeRequest(subDlUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(subDlRes.status === 200 || subDlRes.status === 302,
      `Assignment submission download returns HTTP 200/302`, `Status: ${subDlRes.status}`);
    if (subDlRes.status === 200) {
      assert(subDlRes.buffer.length > 500, `Downloaded student solution PDF payload`, `${subDlRes.buffer.length} bytes`);
    }
  }

  // Materials module endpoints
  const matDlRes = await makeRequest(`${BASE_URL}/api/materials/mat-cs-01/download`);
  assert(matDlRes.status === 200, `Materials endpoint GET /api/materials/mat-cs-01/download returns HTTP 200`);
  assert(matDlRes.headers['content-type'] && matDlRes.headers['content-type'].includes('application/pdf'),
    `Material download returns application/pdf`);
  assert(matDlRes.headers['content-disposition'] && matDlRes.headers['content-disposition'].includes('attachment'),
    `Material download has attachment disposition`);

  const matViewRes = await makeRequest(`${BASE_URL}/api/materials/mat-cs-01/view`);
  assert(matViewRes.status === 200, `Materials endpoint GET /api/materials/mat-cs-01/view returns HTTP 200`);
  assert(matViewRes.headers['content-disposition'] && matViewRes.headers['content-disposition'].includes('inline'),
    `Material view has inline disposition`);

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[Test Execution Error]', err);
  process.exit(1);
});
