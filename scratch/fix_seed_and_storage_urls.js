const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../backend/uploads/assignments');
const samplePdf = path.join(uploadsDir, 'sample_eval.pdf');

if (!fs.existsSync(samplePdf)) {
  console.error('sample_eval.pdf does not exist');
  process.exit(1);
}

const sampleBuf = fs.readFileSync(samplePdf);

// 1. Create matching real PDF files in uploads/assignments
const pdfNames = [
  '24CSE101_Assignment1.pdf',
  '24CSE102_Assignment1.pdf',
  '24CSE103_Assignment1.pdf',
  'retail_sales_schema.pdf',
  'dp_problem_set.pdf'
];

for (const name of pdfNames) {
  const target = path.join(uploadsDir, name);
  fs.writeFileSync(target, sampleBuf);
  console.log('✓ Created valid PDF at:', target);
}

// 2. Update zenora_lms.json
const jsonPath = path.join(__dirname, '../backend/data/zenora_lms.json');
if (fs.existsSync(jsonPath)) {
  let content = fs.readFileSync(jsonPath, 'utf8');
  content = content.replace(/https:\/\/zenora\.edu\/submissions\/24CSE102_Assignment1\.pdf/g, '/uploads/assignments/24CSE102_Assignment1.pdf');
  content = content.replace(/https:\/\/zenora\.edu\/submissions\/24CSE103_Assignment1\.pdf/g, '/uploads/assignments/24CSE103_Assignment1.pdf');
  content = content.replace(/https:\/\/zenora\.edu\/assignments\/retail_sales_schema\.pdf/g, '/uploads/assignments/retail_sales_schema.pdf');
  content = content.replace(/https:\/\/zenora\.edu\/assignments\/dp_problem_set\.pdf/g, '/uploads/assignments/dp_problem_set.pdf');
  fs.writeFileSync(jsonPath, content, 'utf8');
  console.log('✓ Updated backend/data/zenora_lms.json attachment URLs to local /uploads/assignments/...');
}

// 3. Update seeds/seed.js
const seedPath = path.join(__dirname, '../backend/src/seeds/seed.js');
if (fs.existsSync(seedPath)) {
  let seedContent = fs.readFileSync(seedPath, 'utf8');
  seedContent = seedContent.replace(/https:\/\/zenora\.edu\/submissions\/24CSE102_Assignment1\.pdf/g, '/uploads/assignments/24CSE102_Assignment1.pdf');
  seedContent = seedContent.replace(/https:\/\/zenora\.edu\/submissions\/24CSE103_Assignment1\.pdf/g, '/uploads/assignments/24CSE103_Assignment1.pdf');
  seedContent = seedContent.replace(/https:\/\/zenora\.edu\/assignments\/retail_sales_schema\.pdf/g, '/uploads/assignments/retail_sales_schema.pdf');
  seedContent = seedContent.replace(/https:\/\/zenora\.edu\/assignments\/dp_problem_set\.pdf/g, '/uploads/assignments/dp_problem_set.pdf');
  fs.writeFileSync(seedPath, seedContent, 'utf8');
  console.log('✓ Updated backend/src/seeds/seed.js');
}

console.log('✓ Seed and storage URLs synced!');
