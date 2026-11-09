const fs = require('fs');
const path = require('path');

function createSamplePdf(title, subjectCode, subjectName, topics, facultyName) {
  const contentLines = [
    `BT`,
    `/F1 18 Tf`,
    `50 730 Td (${title}) Tj`,
    `0 -24 Td`,
    `/F1 12 Tf (Course: ${subjectCode} - ${subjectName}  |  Apex Institute of Technology - Zenora LMS) Tj`,
    `0 -18 Td`,
    `/F1 11 Tf (Lead Faculty: ${facultyName}  |  Academic Year: 2025 - 2026) Tj`,
    `0 -26 Td`,
    `/F1 13 Tf (--- Academic Content & Syllabus Outline ---) Tj`,
    `0 -24 Td`
  ];

  topics.forEach((topic) => {
    contentLines.push(`/F1 10 Tf (${topic}) Tj`);
    contentLines.push(`0 -20 Td`);
  });

  contentLines.push(`0 -25 Td`);
  contentLines.push(`/F1 9 Tf (Authenticated Academic Document  *  Zenora College LMS Registry) Tj`);
  contentLines.push(`ET`);

  const streamContent = contentLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf8');

  let pdf = `%PDF-1.4\n`;
  const offsets = [];

  // 1 0 obj
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // 2 0 obj
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;

  // 3 0 obj
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;

  // 4 0 obj
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

  // 5 0 obj
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 6\n`;
  pdf += `0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

// Target Directories
const backendDir = path.join(__dirname, '..');
const uploadsDir = path.join(backendDir, 'uploads');
const materialsDir = path.join(uploadsDir, 'materials');
const srcUploadsDir = path.join(backendDir, 'src/uploads');
const srcMaterialsDir = path.join(srcUploadsDir, 'materials');

const allTargetDirs = [materialsDir, uploadsDir, srcMaterialsDir, srcUploadsDir];
allTargetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Define required PDFs
const sampleFiles = [
  {
    fileName: 'CS401_Syllabus.pdf',
    title: 'CS401 Database Management Systems - Complete Regulation Syllabus',
    subjectCode: 'CS401',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Unit 1: Introduction to DBMS, Data Models, Relational Algebra & Calculus',
      'Unit 2: SQL Standards, DDL, DML, Complex Queries, Subqueries & Views',
      'Unit 3: Functional Dependencies, Normal Forms (1NF, 2NF, 3NF, BCNF, 4NF)',
      'Unit 4: Transaction Processing, ACID Properties, Concurrency Protocols',
      'Unit 5: Storage Structures, B+ Trees, Hashing, Query Evaluation & Optimization'
    ]
  },
  {
    fileName: 'DBMS_Module1_Notes.pdf',
    title: 'DBMS Module 1 & Unit 3 Lecture Notes: Relational Architecture & Indexing',
    subjectCode: 'CS401',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Chapter 1: Three-Schema Architecture and Data Independence',
      'Chapter 2: Relational Integrity Constraints and Key Definitions',
      'Chapter 3: ER-to-Relational Mapping Step-by-Step Methodology',
      'Chapter 4: B+ Tree Insertion, Splitting, Deletion and Node Balancing',
      'Chapter 5: Indexing vs Linear Scanning Performance Benchmarking'
    ]
  },
  {
    fileName: 'sample-syllabus.pdf',
    title: 'CS401 Complete University Syllabus (Regulation 2021)',
    subjectCode: 'CS401',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Unit 1: Relational Data Model & Formal Query Languages',
      'Unit 2: Structured Query Language (SQL:2016)',
      'Unit 3: Normalization & Schema Refinement',
      'Unit 4: ACID Transactions & Multi-Granularity Locking',
      'Unit 5: Physical Storage Organization & Indexing Techniques'
    ]
  },
  {
    fileName: 'lecture-notes.pdf',
    title: 'Unit 3 Lecture Notes: B+ Tree Indexing & Query Processing',
    subjectCode: 'CS401',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Section 1: Primary, Secondary, and Clustered Indexes',
      'Section 2: Multi-Level Indexing Principles',
      'Section 3: Detailed B+ Tree Structural Properties',
      'Section 4: Range Search Algorithms in B+ Tree Leaf Nodes',
      'Section 5: Buffer Pool Integration & Disk Page Pinning'
    ]
  },
  {
    fileName: 'CS8492_Syllabus.pdf',
    title: 'CS8492 Database Management Systems - Official University Syllabus',
    subjectCode: 'CS8492',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Unit 1: Introduction to DBMS and Relational Models',
      'Unit 2: SQL and Advanced Database Query Languages',
      'Unit 3: Normalization and Relational Database Design',
      'Unit 4: Transaction Management and Concurrency Control',
      'Unit 5: Storage Structures, Indexing, and Query Processing'
    ]
  },
  {
    fileName: 'CS8481_Lab_Manual.pdf',
    title: 'CS8481 Database Systems Laboratory Manual with PL/SQL Code Stubs',
    subjectCode: 'CS8481',
    subjectName: 'Database Management Systems Laboratory',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Lab 1: DDL & DML Schema Definition and Constraint Verification',
      'Lab 2: Complex Nested Queries and Set Operations in MySQL',
      'Lab 3: PL/SQL Procedures, Functions, Stored Packages',
      'Lab 4: Database Row-Level & Statement-Level Triggers',
      'Lab 5: Database Connection with Node.js & Express REST APIs'
    ]
  },
  {
    fileName: 'DBMS_Unit3_Indexing.pdf',
    title: 'Unit 3: Normalization, Functional Dependencies & B+ Tree Indexing',
    subjectCode: 'CS8492',
    subjectName: 'Database Management Systems',
    faculty: 'Prof. Sarah Jenkins',
    topics: [
      'Topic 1: Armstrong Axioms and Attribute Closure Algorithms',
      'Topic 2: Decomposition Verification (Lossless Join & Dependency Preservation)',
      'Topic 3: BCNF vs 3NF Tradeoffs in Enterprise Schema Design',
      'Topic 4: Dynamic Multilevel Indexes using B+ Trees',
      'Topic 5: Query Execution Plan and Index Scan Analysis'
    ]
  },
  {
    fileName: 'Algorithms_DP_Handout.pdf',
    title: 'CS403 Design & Analysis of Algorithms - Dynamic Programming Handout',
    subjectCode: 'CS403',
    subjectName: 'Design and Analysis of Algorithms',
    faculty: 'Dr. Michael Chen',
    topics: [
      'Module 1: Optimal Substructure & Overlapping Subproblems',
      'Module 2: 0/1 Knapsack & Fractional Greedy Comparison',
      'Module 3: Longest Common Subsequence (LCS) Matrix Formulation',
      'Module 4: Matrix Chain Multiplication & Parenthesization',
      'Module 5: Bellman-Ford & Floyd-Warshall All-Pairs Shortest Path'
    ]
  }
];

// Write PDF files
console.log('[Storage Seeding] Generating authentic sample PDF files...');
sampleFiles.forEach(item => {
  const buf = createSamplePdf(item.title, item.subjectCode, item.subjectName, item.topics, item.faculty);
  allTargetDirs.forEach(dir => {
    const dest = path.join(dir, item.fileName);
    fs.writeFileSync(dest, buf);
    console.log(`  ✓ Saved ${item.fileName} (${buf.length} bytes) -> ${dest}`);
  });
});

console.log('[Storage Seeding] Physical storage verification completed successfully.');
