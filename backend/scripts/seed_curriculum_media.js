const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const uploadsDir = path.join(__dirname, '../uploads');
const mediaDir = path.join(uploadsDir, 'media');
const materialsDir = path.join(uploadsDir, 'materials');
const assetsDir = path.join(uploadsDir, 'assets');

[mediaDir, materialsDir, assetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper to generate spec-compliant PDF documents with Helvetica font
function createCoursePdf(courseCode, title, instructor, topics) {
  const contentStream = `BT
/F1 18 Tf
50 730 Td (${title}) Tj
0 -24 Td
/F1 12 Tf (Course Code: ${courseCode}  |  Apex Institute of Technology) Tj
0 -18 Td
/F1 11 Tf (Lead Instructor: ${instructor}  |  Academic Year: 2025 - 2026) Tj
0 -26 Td
/F1 13 Tf (--- Official Course Curriculum & Lecture Reference Guide ---) Tj
${topics.map(t => `0 -22 Td\n/F1 10 Tf (${t.replace(/[\(\)]/g, '')}) Tj`).join('\n')}
0 -35 Td
/F1 9 Tf (Verified by Academic Dean of Computer Science & Engineering - Zenora LMS) Tj
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

// Download remote video helper
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 50000) {
      console.log(`[Media Asset] File already cached: ${path.basename(destPath)} (${fs.statSync(destPath).size} bytes)`);
      return resolve(destPath);
    }

    console.log(`[Media Asset] Downloading sample video from ${url} -> ${destPath}...`);
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        return reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`[Media Asset] Successfully saved: ${path.basename(destPath)} (${fs.statSync(destPath).size} bytes)`);
          resolve(destPath);
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function runSeedCurriculum() {
  console.log('\n======================================================');
  console.log('🎥 SEEDING ZENORA LMS MULTIMEDIA & COURSE CURRICULUM');
  console.log('======================================================\n');

  // 1. Download Demo MP4 Video
  const videoDest = path.join(mediaDir, 'demo_lesson.mp4');
  const sampleVideoDest = path.join(mediaDir, 'sample_video.mp4');
  try {
    await downloadFile('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', videoDest);
    if (!fs.existsSync(sampleVideoDest)) {
      fs.copyFileSync(videoDest, sampleVideoDest);
    }
  } catch (err) {
    console.warn('[Warning] Remote download failed, attempting secondary mirror:', err.message);
    try {
      await downloadFile('https://www.w3schools.com/html/mov_bbb.mp4', videoDest);
      if (!fs.existsSync(sampleVideoDest)) {
        fs.copyFileSync(videoDest, sampleVideoDest);
      }
    } catch (e2) {
      console.error('[Error] Secondary download failed:', e2.message);
    }
  }

  // 2. Generate Real PDF Documents
  console.log('\nGenerating course reference PDFs in uploads/materials...');
  const pdf1 = createCoursePdf('CS801-CLOUD', 'Cloud Architecture Blueprints 2026', 'Prof. Sarah Jenkins', [
    'Section 1: Microservices Deconstruction Patterns and Domain Driven Design',
    'Section 2: Circuit Breaker implementation with resilient retry mechanisms',
    'Section 3: Kubernetes ingress controller setup and horizontal pod autoscaling',
    'Section 4: Event-driven asynchronous messaging using Kafka and RabbitMQ',
    'Section 5: Chaos engineering and multi-region active-active synchronization'
  ]);
  fs.writeFileSync(path.join(materialsDir, 'cloud_architecture_blueprints_2026.pdf'), pdf1);
  fs.writeFileSync(path.join(assetsDir, 'cloud_architecture_blueprints_2026.pdf'), pdf1);

  const pdf2 = createCoursePdf('CS602-WEB', 'Full-Stack React Native & Node.js Cheatsheet', 'Prof. Sarah Jenkins', [
    'Section 1: Cross-platform styling principles and Glassmorphism design tokens',
    'Section 2: Navigation stacks, modal routes, and tab state management',
    'Section 3: JWT token lifecycle, refresh tokens, and RBAC authorization',
    'Section 4: MySQL schema design, foreign key constraints, and connection pooling',
    'Section 5: Production web bundling and mobile deployment pipelines'
  ]);
  fs.writeFileSync(path.join(materialsDir, 'fullstack_react_native_cheatsheet.pdf'), pdf2);
  fs.writeFileSync(path.join(assetsDir, 'fullstack_react_native_cheatsheet.pdf'), pdf2);

  const pdf3 = createCoursePdf('CS503-DBMS', 'Relational Database Systems & High-Performance SQL', 'Dr. Marcus Sterling', [
    'Section 1: Relational Algebra, Tuple Calculus, and Entity-Relationship modeling',
    'Section 2: Functional Dependencies and Normal Forms (1NF, 2NF, 3NF, BCNF)',
    'Section 3: B+ Tree index structures and execution plan cost analysis',
    'Section 4: ACID transactions, Two-Phase Locking, and MVCC concurrency',
    'Section 5: High-availability replication, read replicas, and sharding strategies'
  ]);
  fs.writeFileSync(path.join(materialsDir, 'database_systems_schema_guide.pdf'), pdf3);
  fs.writeFileSync(path.join(assetsDir, 'database_systems_schema_guide.pdf'), pdf3);

  const pdf4 = createCoursePdf('CS404-DSA', 'Data Structures & Algorithmic Problem Solving Handbook', 'Dr. Priya Sharma', [
    'Section 1: Asymptotic complexity analysis (Big-O, Big-Omega, Big-Theta)',
    'Section 2: Balanced Search Trees (AVL, Red-Black) and Priority Queues',
    'Section 3: Graph algorithms: Dijkstra, Bellman-Ford, Kruskal, and Prim',
    'Section 4: Dynamic Programming paradigms: Memoization vs Tabulation',
    'Section 5: String matching algorithms: KMP and Rabin-Karp implementations'
  ]);
  fs.writeFileSync(path.join(materialsDir, 'data_structures_algorithms_handbook.pdf'), pdf4);
  fs.writeFileSync(path.join(assetsDir, 'data_structures_algorithms_handbook.pdf'), pdf4);

  console.log('✅ Generated 4 course reference PDFs.');

  // 3. Update zenora_lms.json
  const dataPath = path.join(__dirname, '../data/zenora_lms.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Ensure categories exist
  if (!data.course_categories) data.course_categories = [];
  const requiredCategories = [
    {
      id: 'cat-cloud-01',
      organization_id: 'org-apex-01',
      name: 'Cloud Computing & DevOps',
      slug: 'cloud-devops',
      description: 'AWS, Azure, Kubernetes, Microservices architecture, and CI/CD',
      icon: 'cloud-outline',
      is_global: true
    },
    {
      id: 'cat-web-02',
      organization_id: 'org-apex-01',
      name: 'Full-Stack & Mobile Development',
      slug: 'fullstack-mobile',
      description: 'React Native, Node.js, Next.js, and modern APIs',
      icon: 'phone-portrait-outline',
      is_global: true
    },
    {
      id: 'cat-db-03',
      organization_id: 'org-apex-01',
      name: 'Database Systems & Data Engineering',
      slug: 'database-systems',
      description: 'MySQL, PostgreSQL, query optimization, indexing, and transactional isolation',
      icon: 'server-outline',
      is_global: true
    },
    {
      id: 'cat-dsa-04',
      organization_id: 'org-apex-01',
      name: 'Data Structures & Algorithms',
      slug: 'data-structures-algorithms',
      description: 'Asymptotic complexity, trees, graphs, dynamic programming, and optimization',
      icon: 'code-working-outline',
      is_global: true
    },
    {
      id: 'cat-ai-03',
      organization_id: 'org-apex-01',
      name: 'AI & Data Science',
      slug: 'ai-data-science',
      description: 'PyTorch, Machine Learning models, and predictive pipelines',
      icon: 'hardware-chip-outline',
      is_global: true
    }
  ];

  requiredCategories.forEach(reqCat => {
    const existing = data.course_categories.find(c => c.id === reqCat.id);
    if (!existing) {
      data.course_categories.push(reqCat);
    } else {
      Object.assign(existing, reqCat);
    }
  });

  // 4. Seed Courses
  const seededCourses = [
    {
      id: 'course-cloud-01',
      organization_id: 'org-apex-01',
      instructor_id: 'user-instructor-01',
      category_id: 'cat-cloud-01',
      title: 'Advanced Cloud Architecture & Microservices',
      slug: 'advanced-cloud-architecture-microservices',
      subtitle: 'Master enterprise-scale resilient systems, Kubernetes, and event-driven patterns',
      description: 'This comprehensive course equips engineers and architects with the tools to design, deploy, and maintain zero-downtime distributed systems. Explore containerization, service mesh, CQRS, disaster recovery, and multi-region synchronization.',
      thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop',
      difficulty_level: 'intermediate',
      estimated_duration_hours: 32,
      language: 'English',
      status: 'published',
      visibility: 'public',
      price: 49.99,
      is_free: false,
      enrolment_mode: 'open',
      prerequisites: 'Basic understanding of networking, Linux command line, and Docker concepts.',
      learning_objectives: '["Architect multi-region fault-tolerant systems in AWS/GCP","Deploy microservices using Kubernetes and Helm charts","Implement the Circuit Breaker and Saga patterns","Build observability dashboards with Prometheus and Grafana"]',
      start_date: '2026-02-01',
      end_date: '2026-11-30',
      created_at: '2026-10-23T04:21:40.937Z'
    },
    {
      id: 'course-react-02',
      organization_id: 'org-apex-01',
      instructor_id: 'user-instructor-01',
      category_id: 'cat-web-02',
      title: 'Full-Stack React Native & Node.js Masterclass',
      slug: 'full-stack-react-native-nodejs-masterclass',
      subtitle: 'Build and ship cross-platform iOS, Android, and Web applications with Express and MySQL',
      description: 'Learn modern mobile application development from scratch. From reusable design systems and offline-first state management to secure JWT authentication and high-concurrency MySQL schemas.',
      thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=350&fit=crop',
      difficulty_level: 'all_levels',
      estimated_duration_hours: 45,
      language: 'English',
      status: 'published',
      visibility: 'public',
      price: 0,
      is_free: true,
      enrolment_mode: 'open',
      prerequisites: 'Foundational JavaScript (ES6+) knowledge.',
      learning_objectives: '["Build cross-platform applications targeting Web, iOS, and Android","Design normalized MySQL schemas with foreign keys and transactions","Implement role-based authorization and session security","Export mobile bundles and deploy web production builds"]',
      start_date: '2026-01-15',
      end_date: '2026-12-31',
      created_at: '2026-10-23T04:21:40.937Z'
    },
    {
      id: 'course-db-03',
      organization_id: 'org-apex-01',
      instructor_id: 'user-instructor-01',
      category_id: 'cat-db-03',
      title: 'Relational Database Systems & High-Performance SQL',
      slug: 'relational-database-systems-high-performance-sql',
      subtitle: 'Master relational algebra, B-Tree indexing, Boyce-Codd normal forms, and ACID transaction isolation',
      description: 'A deep architectural dive into relational database engine internals. Learn how query optimizers execute plans, write high-concurrency transactional queries, prevent race conditions, and scale with read replicas and connection pools.',
      thumbnail_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=350&fit=crop',
      difficulty_level: 'intermediate',
      estimated_duration_hours: 28,
      language: 'English',
      status: 'published',
      visibility: 'public',
      price: 29.99,
      is_free: false,
      enrolment_mode: 'open',
      prerequisites: 'Foundational understanding of basic SQL syntax.',
      learning_objectives: '["Master Boyce-Codd (BCNF) schema normalization","Tune complex multi-table joins using execution plan analysis","Implement two-phase locking and repeatable read isolation","Architect zero-downtime database migration scripts"]',
      start_date: '2026-02-15',
      end_date: '2026-12-31',
      created_at: '2026-01-10T00:00:00Z'
    },
    {
      id: 'course-dsa-04',
      organization_id: 'org-apex-01',
      instructor_id: 'user-faculty-02',
      category_id: 'cat-dsa-04',
      title: 'Data Structures & Algorithmic Problem Solving',
      slug: 'data-structures-algorithmic-problem-solving',
      subtitle: 'Deep dive into asymptotic analysis, balanced search trees, graph traversals, and dynamic programming',
      description: 'Comprehensive curriculum designed to master fundamental and advanced algorithmic techniques. Solve competitive programming problems, analyze time/space complexity, implement balanced trees, and optimize memory access patterns.',
      thumbnail_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=350&fit=crop',
      difficulty_level: 'advanced',
      estimated_duration_hours: 40,
      language: 'English',
      status: 'published',
      visibility: 'public',
      price: 0,
      is_free: true,
      enrolment_mode: 'open',
      prerequisites: 'Proficiency in at least one modern language (JavaScript, Python, C++, or Java).',
      learning_objectives: '["Calculate asymptotic bounds using the Master Theorem","Implement self-balancing AVL and Red-Black Trees from scratch","Solve network flow and shortest path graph challenges","Formulate dynamic programming states and transitions"]',
      start_date: '2026-03-01',
      end_date: '2026-12-31',
      created_at: '2026-01-10T00:00:00Z'
    }
  ];

  if (!data.courses) data.courses = [];
  seededCourses.forEach(sc => {
    const existing = data.courses.find(c => c.id === sc.id);
    if (!existing) {
      data.courses.push(sc);
    } else {
      Object.assign(existing, sc);
    }
  });

  // 5. Seed Sections
  const seededSections = [
    // Course 1: Cloud
    {
      id: 'sec-cloud-01',
      course_id: 'course-cloud-01',
      title: 'Module 1: Distributed Architectures & Deconstruction',
      description: 'Fundamentals of microservice decomposition, service boundaries, and fault domains',
      sort_order: 1
    },
    {
      id: 'sec-cloud-02',
      course_id: 'course-cloud-01',
      title: 'Module 2: Container Orchestration & Resiliency',
      description: 'Deploying high-availability Kubernetes pods, ingress routes, and circuit breaker patterns',
      sort_order: 2
    },
    // Course 2: React Native
    {
      id: 'sec-react-01',
      course_id: 'course-react-02',
      title: 'Module 1: Cross-Platform UI & Navigation Architecture',
      description: 'Mastering responsive layouts, glassmorphic themes, and navigation patterns',
      sort_order: 1
    },
    {
      id: 'sec-react-02',
      course_id: 'course-react-02',
      title: 'Module 2: RESTful API Integration & Offline State',
      description: 'Connecting to Express/MySQL backends with secure JWT and resilient offline caches',
      sort_order: 2
    },
    // Course 3: Database Systems
    {
      id: 'sec-db-01',
      course_id: 'course-db-03',
      title: 'Module 1: Relational Modeling & Schema Optimization',
      description: 'Normalization theories, functional dependency matrices, and Boyce-Codd normal form',
      sort_order: 1
    },
    {
      id: 'sec-db-02',
      course_id: 'course-db-03',
      title: 'Module 2: Transaction Isolation & Indexing Engines',
      description: 'Deep dive into B-Tree indexes, query execution plans, and ACID locking models',
      sort_order: 2
    },
    // Course 4: Data Structures
    {
      id: 'sec-dsa-01',
      course_id: 'course-dsa-04',
      title: 'Module 1: Asymptotic Analysis & Balanced Trees',
      description: 'Time/space complexity analysis and self-balancing tree implementations',
      sort_order: 1
    },
    {
      id: 'sec-dsa-02',
      course_id: 'course-dsa-04',
      title: 'Module 2: Graph Traversals & Dynamic Programming',
      description: 'Shortest paths, minimum spanning trees, and multi-dimensional DP tables',
      sort_order: 2
    }
  ];

  if (!data.course_sections) data.course_sections = [];
  seededSections.forEach(ss => {
    const existing = data.course_sections.find(s => s.id === ss.id);
    if (!existing) {
      data.course_sections.push(ss);
    } else {
      Object.assign(existing, ss);
    }
  });

  // 6. Seed Lessons
  const localVideoUrl = 'http://localhost:5000/uploads/media/demo_lesson.mp4';
  const seededLessons = [
    // Course 1 Lessons
    {
      id: 'les-cloud-101',
      section_id: 'sec-cloud-01',
      course_id: 'course-cloud-01',
      title: '1.1 Introduction to Cloud Architecture & Monolith Deconstruction',
      description: 'Video walkthrough breaking monolithic systems into bounded contexts and decoupled microservices.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 18,
      is_preview: true,
      sort_order: 1
    },
    {
      id: 'les-cloud-102',
      section_id: 'sec-cloud-01',
      course_id: 'course-cloud-01',
      title: '1.2 Resiliency Engineering: Circuit Breakers & Retries',
      description: 'In-depth notes on fault domain isolation, half-open circuit states, and exponential backoff retry algorithms.',
      content_type: 'text',
      content_body: 'A circuit breaker prevents an application from repeatedly attempting to execute an operation that is likely to fail. Allowing it to continue without waiting for the fault to be fixed or wasting CPU cycles while it determines that the fault is long-lasting.',
      duration_minutes: 25,
      is_preview: false,
      sort_order: 2
    },
    {
      id: 'les-cloud-103',
      section_id: 'sec-cloud-01',
      course_id: 'course-cloud-01',
      title: '1.3 System Blueprints & Cloud Architecture Whitepaper',
      description: 'Official architecture document and multi-region deployment blueprints in PDF format.',
      content_type: 'pdf',
      content_url: 'http://localhost:5000/uploads/materials/cloud_architecture_blueprints_2026.pdf',
      duration_minutes: 30,
      is_preview: true,
      sort_order: 3
    },
    {
      id: 'les-cloud-201',
      section_id: 'sec-cloud-02',
      course_id: 'course-cloud-01',
      title: '2.1 Kubernetes Ingress, Service Discovery & Helm Charts',
      description: 'Interactive video demonstration configuring ingress rules, health check probes, and Helm release templates.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 22,
      is_preview: false,
      sort_order: 1
    },

    // Course 2 Lessons
    {
      id: 'les-react-101',
      section_id: 'sec-react-01',
      course_id: 'course-react-02',
      title: '1.1 Cross-Platform Architecture with React Native & Expo',
      description: 'Full video walkthrough configuring unified design tokens, typography, and responsive styling across Web and iOS.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 24,
      is_preview: true,
      sort_order: 1
    },
    {
      id: 'les-react-102',
      section_id: 'sec-react-01',
      course_id: 'course-react-02',
      title: '1.2 Modern UI Engineering & Glassmorphism Design Tokens',
      description: 'Practical guide to glassmorphic elevation, linear gradients, and micro-interactions.',
      content_type: 'text',
      content_body: 'Design systems require predictable theme constants. In React Native Web, using clean theme tokens with StyleSheet.create ensures consistent rendering across desktop browsers, mobile touch devices, and tablets.',
      duration_minutes: 15,
      is_preview: false,
      sort_order: 2
    },
    {
      id: 'les-react-103',
      section_id: 'sec-react-01',
      course_id: 'course-react-02',
      title: '1.3 Full-Stack React Native Cheat Sheet & API Guide',
      description: 'Complete reference PDF detailing lifecycle hooks, AsyncStorage, and Express/JWT authentication endpoints.',
      content_type: 'pdf',
      content_url: 'http://localhost:5000/uploads/materials/fullstack_react_native_cheatsheet.pdf',
      duration_minutes: 20,
      is_preview: true,
      sort_order: 3
    },
    {
      id: 'les-react-201',
      section_id: 'sec-react-02',
      course_id: 'course-react-02',
      title: '2.1 Secure JWT Authentication & Role-Based Access Control',
      description: 'Hands-on video on protecting private API routes, verifying tokens, and RBAC middleware.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 28,
      is_preview: false,
      sort_order: 1
    },

    // Course 3 Lessons
    {
      id: 'les-db-101',
      section_id: 'sec-db-01',
      course_id: 'course-db-03',
      title: '1.1 Relational Schema Normalization (1NF through BCNF)',
      description: 'Interactive lecture and video deconstructing data anomalies, candidate keys, and lossless join decompositions.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 25,
      is_preview: true,
      sort_order: 1
    },
    {
      id: 'les-db-102',
      section_id: 'sec-db-01',
      course_id: 'course-db-03',
      title: '1.2 Database Systems Architecture & Schema Guide',
      description: 'Comprehensive PDF reference containing entity relationship diagrams, table constraints, and normalization formulas.',
      content_type: 'pdf',
      content_url: 'http://localhost:5000/uploads/materials/database_systems_schema_guide.pdf',
      duration_minutes: 30,
      is_preview: true,
      sort_order: 2
    },
    {
      id: 'les-db-201',
      section_id: 'sec-db-02',
      course_id: 'course-db-03',
      title: '2.1 B-Tree Indexing Strategies & Query Execution Plans',
      description: 'Video analyzing EXPLAIN query plans, compound indexes, and covering index performance improvements.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 32,
      is_preview: false,
      sort_order: 1
    },

    // Course 4 Lessons
    {
      id: 'les-dsa-101',
      section_id: 'sec-dsa-01',
      course_id: 'course-dsa-04',
      title: '1.1 Asymptotic Analysis & Big-O Foundations',
      description: 'Video foundation on analyzing loop invariants, recurrence relations, and worst/best/average case complexity.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 20,
      is_preview: true,
      sort_order: 1
    },
    {
      id: 'les-dsa-102',
      section_id: 'sec-dsa-01',
      course_id: 'course-dsa-04',
      title: '1.2 Data Structures & Algorithms Problem Solving Handbook',
      description: 'Authoritative PDF handbook covering AVL rotations, graph traversal templates, and dynamic programming patterns.',
      content_type: 'pdf',
      content_url: 'http://localhost:5000/uploads/materials/data_structures_algorithms_handbook.pdf',
      duration_minutes: 35,
      is_preview: true,
      sort_order: 2
    },
    {
      id: 'les-dsa-201',
      section_id: 'sec-dsa-02',
      course_id: 'course-dsa-04',
      title: '2.1 Shortest Paths: Dijkstra & Bellman-Ford Algorithms',
      description: 'Video tutorial tracing weighted directed graphs with priority queues and edge relaxation loops.',
      content_type: 'video',
      content_url: localVideoUrl,
      duration_minutes: 30,
      is_preview: false,
      sort_order: 1
    }
  ];

  if (!data.lessons) data.lessons = [];
  seededLessons.forEach(sl => {
    const existing = data.lessons.find(l => l.id === sl.id);
    if (!existing) {
      data.lessons.push(sl);
    } else {
      Object.assign(existing, sl);
    }
  });

  // 7. Seed Learning Materials
  const seededMaterials = [
    {
      id: 'mat-cloud-01',
      lesson_id: 'les-cloud-101',
      course_id: 'course-cloud-01',
      title: 'Cloud Architecture System Blueprints 2026.pdf',
      file_url: 'http://localhost:5000/uploads/materials/cloud_architecture_blueprints_2026.pdf',
      file_type: 'pdf',
      file_size_bytes: pdf1.length,
      is_downloadable: true
    },
    {
      id: 'mat-cloud-02',
      lesson_id: 'les-cloud-103',
      course_id: 'course-cloud-01',
      title: 'Microservices Fault Tolerance & Circuit Breakers Guide.pdf',
      file_url: 'http://localhost:5000/uploads/materials/cloud_architecture_blueprints_2026.pdf',
      file_type: 'pdf',
      file_size_bytes: pdf1.length,
      is_downloadable: true
    },
    {
      id: 'mat-react-01',
      lesson_id: 'les-react-101',
      course_id: 'course-react-02',
      title: 'Full-Stack React Native & Express Architecture Cheatsheet.pdf',
      file_url: 'http://localhost:5000/uploads/materials/fullstack_react_native_cheatsheet.pdf',
      file_type: 'pdf',
      file_size_bytes: pdf2.length,
      is_downloadable: true
    },
    {
      id: 'mat-db-01',
      lesson_id: 'les-db-101',
      course_id: 'course-db-03',
      title: 'Relational Database Schema Design & Normalization Matrix.pdf',
      file_url: 'http://localhost:5000/uploads/materials/database_systems_schema_guide.pdf',
      file_type: 'pdf',
      file_size_bytes: pdf3.length,
      is_downloadable: true
    },
    {
      id: 'mat-dsa-01',
      lesson_id: 'les-dsa-101',
      course_id: 'course-dsa-04',
      title: 'Data Structures & Algorithms Problem Solving Reference.pdf',
      file_url: 'http://localhost:5000/uploads/materials/data_structures_algorithms_handbook.pdf',
      file_type: 'pdf',
      file_size_bytes: pdf4.length,
      is_downloadable: true
    }
  ];

  if (!data.learning_materials) data.learning_materials = [];
  seededMaterials.forEach(sm => {
    const existing = data.learning_materials.find(m => m.id === sm.id);
    if (!existing) {
      data.learning_materials.push(sm);
    } else {
      Object.assign(existing, sm);
    }
  });

  // Ensure student Alex Rivera (user-student-01) is enrolled in all 4 courses with progress records
  const studentUser = (data.users || []).find(u => u.id === 'user-student-01');
  if (studentUser) {
    if (!data.enrolments) data.enrolments = [];
    const enrolCourseIds = ['course-cloud-01', 'course-react-02', 'course-db-03', 'course-dsa-04'];
    enrolCourseIds.forEach((cId, idx) => {
      const enrId = `enr-alex-${cId}`;
      const existingEnr = data.enrolments.find(e => e.course_id === cId && e.user_id === 'user-student-01');
      if (!existingEnr) {
        data.enrolments.push({
          id: enrId,
          organization_id: 'org-apex-01',
          user_id: 'user-student-01',
          course_id: cId,
          enrolment_type: 'self',
          status: 'active',
          access_start_date: '2026-01-01',
          access_expiry_date: '2026-12-31',
          completed_at: null,
          progress_percentage: idx === 0 ? 60 : (idx === 1 ? 100 : 35),
          created_at: new Date().toISOString()
        });
      }
    });
  }

  // Save updated json
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Successfully updated zenora_lms.json with 4 populated courses, multimedia lessons, and materials.');
}

module.exports = { runSeedCurriculum };

if (require.main === module) {
  runSeedCurriculum().catch(err => {
    console.error('[Curriculum Seed Error]', err);
    process.exit(1);
  });
}
