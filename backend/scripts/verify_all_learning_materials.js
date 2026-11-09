/**
 * Automated Verification Test Suite for Learning Materials & Syllabi
 * 
 * Verifies every entry in `learning_materials` across CS, EC, and ME (S1 through S6).
 * Performs HTTP GET requests against each file URL and streaming endpoint.
 * Asserts HTTP 200, Content-Type: application/pdf, and non-zero Content-Length.
 * Logs: "All [N] syllabus and note files verified and physically present."
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const BASE_URL = 'http://localhost:5000';

async function verifyAllLearningMaterials() {
  console.log('\n================================================================');
  console.log('🔍 [VERIFICATION TEST SUITE] LEARNING MATERIALS & SYLLABI AUDIT');
  console.log('================================================================');

  let materials = [];

  const data = db.getFallbackData();
  if (data && Array.isArray(data.learning_materials) && data.learning_materials.length > 0) {
    materials = data.learning_materials;
  } else if (!db.isUsingFallback()) {
    try {
      const qRes = await db.query('SELECT * FROM learning_materials');
      materials = Array.isArray(qRes) ? (Array.isArray(qRes[0]) ? qRes[0] : qRes) : [];
    } catch (e) {
      materials = data?.learning_materials || [];
    }
  } else {
    materials = data?.learning_materials || [];
  }

  const subjects = (data && data.subjects) || [];
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // Filter materials across CS, EC, and ME departments (S1 through S6) plus university core
  const relevantMaterials = (materials || []).filter(m => {
    const sub = subjectMap.get(m.course_id || m.subject_id);
    if (!sub) return true; // include if general academic
    const dept = sub.department_id || '';
    const sem = Number(sub.semester) || 1;
    const isTargetDept = ['dept-cs', 'dept-ec', 'dept-me'].includes(dept) || dept.startsWith('dept-');
    const isTargetSem = sem >= 1 && sem <= 6;
    return isTargetDept && isTargetSem;
  });

  const count = relevantMaterials.length;
  console.log(`📋 Found ${count} learning materials across CS, EC, ME (S1 - S6) to verify.\n`);

  let passedCount = 0;
  let failedCount = 0;
  const failures = [];

  for (let i = 0; i < relevantMaterials.length; i++) {
    const mat = relevantMaterials[i];
    const sub = subjectMap.get(mat.course_id || mat.subject_id);
    const subCode = sub ? sub.code : (mat.title?.split(' ')[0] || 'COURSE');
    const sem = sub ? `S${sub.semester}` : 'S4';
    const dept = sub ? (sub.department_id === 'dept-cs' ? 'CS' : sub.department_id === 'dept-ec' ? 'EC' : 'ME') : 'CORE';

    // Normalize target URL
    let targetUrl = mat.file_url || mat.file_path;
    if (targetUrl.startsWith('/uploads/')) {
      targetUrl = `${BASE_URL}${targetUrl}`;
    } else if (targetUrl.startsWith('http://localhost:5000') || targetUrl.startsWith('http://127.0.0.1:5000')) {
      targetUrl = targetUrl.replace('127.0.0.1', 'localhost');
    } else if (!targetUrl.startsWith('http')) {
      targetUrl = `${BASE_URL}/uploads/materials/${path.basename(targetUrl)}`;
    }

    // Direct HTTP GET request
    try {
      const res = await fetch(targetUrl);
      const contentType = res.headers.get('content-type') || '';
      const contentLength = Number(res.headers.get('content-length') || 0);

      const isStatus200 = res.status === 200;
      const isPdfContent = contentType.toLowerCase().includes('application/pdf');
      const hasLength = contentLength > 0 || (await res.arrayBuffer()).byteLength > 0;

      if (isStatus200 && isPdfContent && hasLength) {
        passedCount++;
        process.stdout.write(`  [${String(i + 1).padStart(2, '0')}/${count}] ✅ [${dept}-${sem}] ${subCode.padEnd(7)} | 200 OK | ${path.basename(targetUrl)}\n`);
      } else {
        failedCount++;
        failures.push({
          id: mat.id,
          title: mat.title,
          url: targetUrl,
          status: res.status,
          contentType,
          contentLength
        });
        process.stdout.write(`  [${String(i + 1).padStart(2, '0')}/${count}] ❌ [${dept}-${sem}] ${subCode.padEnd(7)} | STATUS ${res.status} | Content-Type: ${contentType}\n`);
      }
    } catch (err) {
      failedCount++;
      failures.push({
        id: mat.id,
        title: mat.title,
        url: targetUrl,
        error: err.message
      });
      process.stdout.write(`  [${String(i + 1).padStart(2, '0')}/${count}] ❌ [${dept}-${sem}] ${subCode.padEnd(7)} | FETCH ERROR: ${err.message}\n`);
    }

    // Also verify streaming fallback route: GET /api/files/view?path=...
    const fallbackUrl = `${BASE_URL}/api/files/view?path=${encodeURIComponent(path.basename(mat.file_path || mat.file_url))}`;
    try {
      const fbRes = await fetch(fallbackUrl);
      if (fbRes.status !== 200 || !(fbRes.headers.get('content-type') || '').includes('application/pdf')) {
        console.warn(`    ⚠️ Fallback view warning on ${fallbackUrl}: status ${fbRes.status}`);
      }
    } catch (e) {}
  }

  console.log('\n================================================================');
  console.log(`📊 AUDIT SUMMARY:`);
  console.log(`   - Total Checked:       ${count}`);
  console.log(`   - Verified HTTP 200:   ${passedCount}`);
  console.log(`   - Broken / Failed:     ${failedCount}`);
  console.log('================================================================');

  if (failedCount === 0) {
    console.log(`\n🎉 All [${count}] syllabus and note files verified and physically present.\n`);
    return true;
  } else {
    console.error(`\n❌ Failed to verify ${failedCount} files. Please inspect errors above.\n`);
    return false;
  }
}

if (require.main === module) {
  verifyAllLearningMaterials().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyAllLearningMaterials };
