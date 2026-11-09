const fs = require('fs');
const path = require('path');

function createPdfContent(title, code, instructor, subtitle, bullets) {
  let streamLines = [
    'BT',
    '/F1 18 Tf',
    `50 730 Td (${title.replace(/[()]/g, '')}) Tj`,
    '0 -24 Td',
    `/F1 12 Tf (Course: ${code}  |  Apex Institute of Technology - Zenora LMS) Tj`,
    '0 -18 Td',
    `/F1 11 Tf (Lead Faculty: ${instructor}  |  Academic Year: 2025 - 2026) Tj`,
    '0 -26 Td',
    `/F1 13 Tf (--- ${subtitle.replace(/[()]/g, '')} ---) Tj`,
    '0 -24 Td'
  ];

  bullets.forEach(b => {
    streamLines.push(
      `/F1 10 Tf (${b.replace(/[()]/g, '')}) Tj`,
      '0 -20 Td'
    );
  });

  streamLines.push(
    '0 -25 Td',
    '/F1 9 Tf (Authenticated Academic Document  *  Zenora College LMS Registry) Tj',
    'ET'
  );

  const streamText = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamText, 'utf8');

  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamText}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000228 00000 n 
0000001250 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1330
%%EOF`;
}

const pdfCatalog = [
  {
    filename: 'sample-syllabus.pdf',
    title: 'University Academic Syllabus & Course Specification',
    code: 'CS8492 - Database Systems & Architecture',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Official University Curriculum & Learning Outcomes',
    bullets: [
      'Unit 1: Relational Model, Relational Algebra, and Tuple Relational Calculus',
      'Unit 2: SQL Dialects, Complex Joins, Subqueries, Views, and Constraints',
      'Unit 3: Normalization Theories (1NF, 2NF, 3NF, BCNF) and Functional Dependencies',
      'Unit 4: Transaction Processing, ACID Guarantees, Serializability, and 2PL Protocols',
      'Unit 5: B+ Tree Indexing, Hash Partitions, and Cost-based Query Optimization'
    ]
  },
  {
    filename: 'lecture-notes.pdf',
    title: 'Comprehensive Lecture Notes & Study Guide',
    code: 'CS8492 - Unit 3 Relational Normalization & Indexing',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Theoretical Foundations & Practical Decomposition Walkthroughs',
    bullets: [
      'Topic 1: Functional Dependencies, Armstrong Axioms, and Minimal Cover Computations',
      'Topic 2: Boyce-Codd Normal Form (BCNF) Lossless Join and Dependency Preservation',
      'Topic 3: Multivalued Dependencies and 4th Normal Form Decompositions',
      'Topic 4: Internal Node Splitting in B+ Trees with M=4 Fanout Matrix Examples',
      'Topic 5: Practice Examination Problem Set with Full Step-by-Step Solutions'
    ]
  },
  {
    filename: 'CS8492_Syllabus.pdf',
    title: 'CS8492 Complete University Syllabus (Regulation 2021)',
    code: 'CS8492 - Database Management Systems',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Course Outcomes, Evaluation Scheme & Reference Texts',
    bullets: [
      'CO 1: Construct conceptual Entity-Relationship models and relational schemas',
      'CO 2: Design normalized relational schemas avoiding data redundancies',
      'CO 3: Formulate advanced SQL queries and stored PL/SQL procedures',
      'CO 4: Analyze database transactions for serializability and isolation levels',
      'Reference: Database System Concepts (7th Edition) by Silberschatz, Korth, Sudarshan'
    ]
  },
  {
    filename: 'DBMS_Unit3_Indexing.pdf',
    title: 'Unit 3 Lecture Notes: B+ Tree Indexing & Query Processing',
    code: 'CS8492 - Advanced Database Topics',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Node Insertion, Deletion, and Range Query Cost Calculations',
    bullets: [
      '1. Physical Storage Architecture: Blocks, Pages, Slotted Pages, and Records',
      '2. Primary vs Secondary Indexing: Clustered vs Unclustered Indexing Tradeoffs',
      '3. B+ Tree Structure: Root, Internal, and Leaf Nodes linked lists',
      '4. Insertion Algorithm: Recursive node splitting and root promotion',
      '5. Query Optimizer: Selectivity estimation and Index-Scan vs Sequential-Scan'
    ]
  },
  {
    filename: 'CS8481_Lab_Manual.pdf',
    title: 'DBMS Laboratory Manual with PL/SQL Code Stubs',
    code: 'CS8481 - Database Systems Laboratory',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Laboratory Experiments 1 through 12 Instructions',
    bullets: [
      'Lab 1: DDL commands - Table creation, primary keys, and foreign key cascades',
      'Lab 2: DML commands - Data population, updates, and correlated subqueries',
      'Lab 3: Database Views and Security authorization grant/revoke permissions',
      'Lab 4: PL/SQL procedures, in/out parameters, functions, and exception handling',
      'Lab 5: Database Triggers for auditing and automated ledger record synchronization'
    ]
  },
  {
    filename: 'Algorithms_DP_Handout.pdf',
    title: 'Algorithms Handout: Dynamic Programming & Optimal BST',
    code: 'CS8491 - Design & Analysis of Algorithms',
    instructor: 'Dr. Marcus Vance',
    subtitle: 'Memoization, Tabulation & Optimal Substructure Proofs',
    bullets: [
      'Section 1: Elements of Dynamic Programming - Overlapping Subproblems',
      'Section 2: Matrix Chain Multiplication - Recurrence relations and cost table',
      'Section 3: Optimal Binary Search Trees - Probability-weighted search costs',
      'Section 4: Floyd-Warshall All-Pairs Shortest Path Algorithm with O(V^3) Complexity',
      'Section 5: 0/1 Knapsack Problem vs Fractional Knapsack Greedy Strategy'
    ]
  },
  {
    filename: 'cs8491_syllabus.pdf',
    title: 'CS8491 Design & Analysis of Algorithms - Syllabus',
    code: 'CS8491 - Core Computer Science',
    instructor: 'Dr. Marcus Vance',
    subtitle: 'Curriculum & Examination Scheme',
    bullets: [
      'Unit 1: Asymptotic Notations and Divide-and-Conquer Recurrences',
      'Unit 2: Greedy Techniques - Prim, Kruskal, Dijkstra, and Huffman Coding',
      'Unit 3: Dynamic Programming - LCS, Matrix Chain, and Bellman-Ford',
      'Unit 4: Backtracking and Branch-and-Bound - N-Queens, TSP, and Subset Sum',
      'Unit 5: Computational Complexity - P, NP, NP-Complete, and Approximation'
    ]
  },
  {
    filename: 'cs8492_syllabus.pdf',
    title: 'CS8492 Database Management Systems - Syllabus',
    code: 'CS8492 - Core Computer Science',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Curriculum & Examination Scheme',
    bullets: [
      'Unit 1: Introduction to DBMS and Relational Models',
      'Unit 2: SQL and Advanced Database Query Languages',
      'Unit 3: Normalization and Relational Database Design',
      'Unit 4: Transaction Management and Concurrency Control',
      'Unit 5: Storage Structures, Indexing, and Query Processing'
    ]
  },
  {
    filename: 'cs8493_syllabus.pdf',
    title: 'CS8493 Operating Systems - Syllabus',
    code: 'CS8493 - Core Computer Science',
    instructor: 'Prof. Alan Turing',
    subtitle: 'Curriculum & Examination Scheme',
    bullets: [
      'Unit 1: Operating System Architectures and System Call Interfaces',
      'Unit 2: Process Management, Threads, and CPU Scheduling Algorithms',
      'Unit 3: Process Synchronization, Semaphores, Monitors, and Deadlocks',
      'Unit 4: Memory Management, Paging, Virtual Memory, and Page Replacement',
      'Unit 5: File Systems, Storage Allocation, Disk Scheduling, and I/O'
    ]
  },
  {
    filename: 'cs8481_syllabus.pdf',
    title: 'CS8481 Database Laboratory - Syllabus',
    code: 'CS8481 - Practical Laboratory',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Curriculum & Lab Assessment Scheme',
    bullets: [
      'Lab Module 1: Schema Definition and Integrity Constraints',
      'Lab Module 2: Complex SQL Queries and Aggregate Functions',
      'Lab Module 3: Database Views, Indexes, and Query Plans',
      'Lab Module 4: Stored Procedures, Functions, and Cursors',
      'Lab Module 5: Database Triggers and Application Integration'
    ]
  },
  {
    filename: 'ma8402_syllabus.pdf',
    title: 'MA8402 Probability & Queueing Theory - Syllabus',
    code: 'MA8402 - Mathematics',
    instructor: 'Dr. John Nash',
    subtitle: 'Curriculum & Examination Scheme',
    bullets: [
      'Unit 1: Random Variables and Standard Probability Distributions',
      'Unit 2: Two-Dimensional Random Variables and Joint Densities',
      'Unit 3: Random Processes, Markov Chains, and Poisson Processes',
      'Unit 4: Queueing Models - M/M/1, M/M/C, Finite and Infinite Buffers',
      'Unit 5: Advanced Queueing Networks and Non-Markovian Queues'
    ]
  },
  {
    filename: 'cloud_architecture_blueprints_2026.pdf',
    title: 'Cloud Architecture Blueprints 2026',
    code: 'CS801-CLOUD - Distributed Systems',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Official Course Curriculum & Lecture Reference Guide',
    bullets: [
      'Section 1: Microservices Deconstruction Patterns and Domain Driven Design',
      'Section 2: Circuit Breaker implementation with resilient retry mechanisms',
      'Section 3: Kubernetes ingress controller setup and horizontal pod autoscaling',
      'Section 4: Event-driven asynchronous messaging using Kafka and RabbitMQ',
      'Section 5: Chaos engineering and multi-region active-active synchronization'
    ]
  },
  {
    filename: 'database_systems_schema_guide.pdf',
    title: 'Database Systems & Relational Schema Guide',
    code: 'CS802-DBMS - Database Systems',
    instructor: 'Prof. Sarah Jenkins',
    subtitle: 'Schema Design, Normalization & Query Tuning Masterclass',
    bullets: [
      '1. Boyce-Codd Normal Form (BCNF) decomposition proofs',
      '2. B+ Tree indexing mechanics and node split algorithms',
      '3. Two-phase locking (2PL) and serializability schedules',
      '4. Query optimization cost estimation and index selectivity',
      '5. ACID guarantees under distributed snapshot isolation'
    ]
  },
  {
    filename: 'fullstack_react_native_cheatsheet.pdf',
    title: 'Fullstack React Native & Web Architecture Cheatsheet',
    code: 'CS803-WEB - Modern Web Architecture',
    instructor: 'Prof. David Miller',
    subtitle: 'Cross-Platform Mobile & Web Development Handbook',
    bullets: [
      '1. React Native Web compatibility layer and unified styling tokens',
      '2. State management with Context API and custom persistent hooks',
      '3. Glassmorphic UI design systems with animated micro-interactions',
      '4. RESTful API integration, JWT authentication, and token refresh',
      '5. Production bundle optimization and offline-first data caching'
    ]
  },
  {
    filename: 'data_structures_algorithms_handbook.pdf',
    title: 'Data Structures & Algorithms Comprehensive Handbook',
    code: 'CS804-DSA - Algorithms',
    instructor: 'Dr. Marcus Vance',
    subtitle: 'Complete Guide to Graph Traversal, Dynamic Programming & Trees',
    bullets: [
      '1. Red-Black and AVL self-balancing tree rotations',
      '2. Graph search: Dijkstra, Bellman-Ford, and A* shortest path',
      '3. Dynamic programming: 0/1 Knapsack and Longest Common Subsequence',
      '4. Disjoint Set Union (DSU) with path compression and union by rank',
      '5. Amortized time complexity analysis for dynamic arrays and splay trees'
    ]
  }
];

const targetDirs = [
  path.join(__dirname, '../uploads/materials'),
  path.join(__dirname, '../uploads/assets'),
  path.join(__dirname, '../uploads')
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let createdCount = 0;
pdfCatalog.forEach(item => {
  const content = createPdfContent(item.title, item.code, item.instructor, item.subtitle, item.bullets);
  targetDirs.forEach(dir => {
    const dest = path.join(dir, item.filename);
    fs.writeFileSync(dest, content, 'utf8');
  });
  createdCount++;
  console.log(`Generated and synced: ${item.filename}`);
});

console.log(`\nSuccessfully created and synced ${createdCount} PDF files across all target directories!`);
