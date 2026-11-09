const fs = require('fs');
const path = require('path');
const http = require('http');

async function testStaticPdfServing() {
  const uploadsDir = path.join(__dirname, '../backend/uploads/assignments');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create a minimal valid PDF 1.4 binary content
  const samplePdfPath = path.join(uploadsDir, 'sample_eval.pdf');
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 24 Tf 100 700 Td (Student Assignment Report) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer << /Root 1 0 R /Size 5 >>
startxref
310
%%EOF`;

  fs.writeFileSync(samplePdfPath, minimalPdf);
  console.log('✓ Created sample test PDF at:', samplePdfPath);

  // Request the PDF from the running Express server
  const url = 'http://localhost:5000/uploads/assignments/sample_eval.pdf';
  console.log('Fetching:', url);

  const res = await fetch(url);
  console.log('HTTP Status:', res.status);
  console.log('Headers:');
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }

  const contentType = res.headers.get('content-type');
  const contentDisp = res.headers.get('content-disposition');
  const corsOrigin = res.headers.get('access-control-allow-origin');
  const corp = res.headers.get('cross-origin-resource-policy');
  const xfo = res.headers.get('x-frame-options');

  let passed = true;
  if (!contentType || !contentType.includes('application/pdf')) {
    console.error('❌ Content-Type does not include application/pdf!');
    passed = false;
  } else {
    console.log('✓ Content-Type is application/pdf');
  }

  if (!contentDisp || !contentDisp.includes('inline')) {
    console.error('❌ Content-Disposition does not include inline!');
    passed = false;
  } else {
    console.log('✓ Content-Disposition is inline');
  }

  if (corsOrigin !== '*') {
    console.error('❌ Access-Control-Allow-Origin is not * !');
    passed = false;
  } else {
    console.log('✓ Access-Control-Allow-Origin is *');
  }

  if (corp !== 'cross-origin') {
    console.error('❌ Cross-Origin-Resource-Policy is not cross-origin!');
    passed = false;
  } else {
    console.log('✓ Cross-Origin-Resource-Policy is cross-origin');
  }

  if (xfo === 'SAMEORIGIN') {
    console.error('❌ X-Frame-Options is SAMEORIGIN (will block cross-port iframes)!');
    passed = false;
  } else {
    console.log('✓ X-Frame-Options is permissive / ALLOWALL (iframe embed enabled)');
  }

  if (passed) {
    console.log('\n🎉 ALL STATIC PDF SERVING CHECKS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

testStaticPdfServing().catch(err => {
  console.error(err);
  process.exit(1);
});
