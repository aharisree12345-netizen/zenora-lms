const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function runSeed() {
  console.log('[Seed] Initializing Zenora College LMS 3-Year / 6-Semester Academic Model...');
  await db.initDatabase();

  const passwordHashAdmin = bcrypt.hashSync('Admin@123', 10);
  const passwordHashFaculty = bcrypt.hashSync('Faculty@123', 10);
  const passwordHashStudent = bcrypt.hashSync('Student@123', 10);

  const fallback = db.getFallbackData();

  // 1. Departments: CS (Computer Science), EC (Electronics), ME (Mechanical), BS (Basic Sciences)
  fallback.departments = [
    {
      id: 'dept-cs',
      name: 'Computer Science & Engineering',
      code: 'CS',
      hod_name: 'Dr. Marcus Sterling, Ph.D.',
      contact_email: 'hod.cs@zenora.edu',
      description: 'Department of Computer Science & Engineering – Accredited NBA Tier-1',
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'dept-ec',
      name: 'Electronics & Communication Engineering',
      code: 'EC',
      hod_name: 'Dr. Robert Taylor, Ph.D.',
      contact_email: 'hod.ec@zenora.edu',
      description: 'Department of Electronics & Communication – VLSI, Embedded Systems & Signal Processing',
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'dept-me',
      name: 'Mechanical Engineering',
      code: 'ME',
      hod_name: 'Dr. James Anderson, Ph.D.',
      contact_email: 'hod.me@zenora.edu',
      description: 'Department of Mechanical Engineering – Robotics, Thermal Power & CAD/CAM',
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'dept-bs',
      name: 'Basic Sciences & Humanities',
      code: 'BS',
      hod_name: 'Dr. Priya Sharma, Ph.D.',
      contact_email: 'hod.bs@zenora.edu',
      description: 'Department of Basic Sciences & Humanities – Mathematics, Physics, Chemistry & Technical English',
      created_at: '2026-01-01T00:00:00Z'
    }
  ];

  // 2. Academic Years: 3-Year College Model (S1 to S6)
  fallback.academic_years = [
    {
      id: 'ay-2024-2027',
      year_name: '2024 - 2027',
      start_date: '2024-06-15',
      end_date: '2027-05-30',
      is_current: false,
      description: 'Senior Cohort (Year 3: S5 & S6)',
      created_at: '2024-06-01T00:00:00Z'
    },
    {
      id: 'ay-2025-2028',
      year_name: '2025 - 2028',
      start_date: '2025-06-15',
      end_date: '2028-05-30',
      is_current: true,
      description: 'Current Intermediate Cohort (Year 2: S3 & S4)',
      created_at: '2025-06-01T00:00:00Z'
    },
    {
      id: 'ay-2026-2029',
      year_name: '2026 - 2029',
      start_date: '2026-06-15',
      end_date: '2029-05-30',
      is_current: false,
      description: 'Junior Cohort (Year 1: S1 & S2)',
      created_at: '2026-06-01T00:00:00Z'
    }
  ];

  // 3. Batches / Classes across S1 to S6 for CS, EC, ME
  fallback.batches = [
    // CS Batches (S1 to S6)
    { id: 'batch-cs-s1', department_id: 'dept-cs', academic_year_id: 'ay-2026-2029', name: 'CS-S1', semester: 1, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-03', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-cs-s2', department_id: 'dept-cs', academic_year_id: 'ay-2026-2029', name: 'CS-S2', semester: 2, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-03', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-cs-s3', department_id: 'dept-cs', academic_year_id: 'ay-2025-2028', name: 'CS-S3', semester: 3, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-01', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-cs-s4', department_id: 'dept-cs', academic_year_id: 'ay-2025-2028', name: 'CS-2024-2028-SecA', semester: 4, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-01', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-cs-s5', department_id: 'dept-cs', academic_year_id: 'ay-2024-2027', name: 'CS-S5', semester: 5, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-02', created_at: '2024-06-01T00:00:00Z' },
    { id: 'batch-cs-s6', department_id: 'dept-cs', academic_year_id: 'ay-2024-2027', name: 'CS-S6', semester: 6, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-02', created_at: '2024-06-01T00:00:00Z' },

    // EC Batches (S1 to S6)
    { id: 'batch-ec-s1', department_id: 'dept-ec', academic_year_id: 'ay-2026-2029', name: 'EC-S1', semester: 1, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-03', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-ec-s2', department_id: 'dept-ec', academic_year_id: 'ay-2026-2029', name: 'EC-S2', semester: 2, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-02', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-ec-s3', department_id: 'dept-ec', academic_year_id: 'ay-2025-2028', name: 'EC-S3', semester: 3, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-02', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-ec-s4', department_id: 'dept-ec', academic_year_id: 'ay-2025-2028', name: 'EC-S4', semester: 4, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-01', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-ec-s5', department_id: 'dept-ec', academic_year_id: 'ay-2024-2027', name: 'EC-S5', semester: 5, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-01', created_at: '2024-06-01T00:00:00Z' },
    { id: 'batch-ec-s6', department_id: 'dept-ec', academic_year_id: 'ay-2024-2027', name: 'EC-S6', semester: 6, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-ec-01', created_at: '2024-06-01T00:00:00Z' },

    // ME Batches (S1 to S6)
    { id: 'batch-me-s1', department_id: 'dept-me', academic_year_id: 'ay-2026-2029', name: 'ME-S1', semester: 1, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-03', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-me-s2', department_id: 'dept-me', academic_year_id: 'ay-2026-2029', name: 'ME-S2', semester: 2, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-03', created_at: '2026-06-01T00:00:00Z' },
    { id: 'batch-me-s3', department_id: 'dept-me', academic_year_id: 'ay-2025-2028', name: 'ME-S3', semester: 3, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-02', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-me-s4', department_id: 'dept-me', academic_year_id: 'ay-2025-2028', name: 'ME-S4', semester: 4, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-02', created_at: '2025-06-01T00:00:00Z' },
    { id: 'batch-me-s5', department_id: 'dept-me', academic_year_id: 'ay-2024-2027', name: 'ME-S5', semester: 5, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-01', created_at: '2024-06-01T00:00:00Z' },
    { id: 'batch-me-s6', department_id: 'dept-me', academic_year_id: 'ay-2024-2027', name: 'ME-S6', semester: 6, section: 'A', shift: 'Regular', faculty_advisor_id: 'user-faculty-me-01', created_at: '2024-06-01T00:00:00Z' }
  ];

  // 4. Users: Admins, Faculty (3 CS, 3 EC, 3 ME, 2 BS), and Students
  fallback.users = [
    // Super Admin & Dean
    {
      id: 'user-admin-01',
      role: 'super_admin',
      name: 'Dr. Julian Vance (Dean of Academics)',
      email: 'admin@zenora.com',
      password_hash: passwordHashAdmin,
      phone: '+1 (555) 019-2831',
      department_id: 'dept-cs',
      designation: 'Dean of Academic Affairs',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'user-admin-02',
      role: 'super_admin',
      name: 'Academic Controller',
      email: 'admin@apex.edu',
      password_hash: passwordHashAdmin,
      phone: '+1 (555) 019-2832',
      department_id: 'dept-cs',
      designation: 'Chief Academic Registrar',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z'
    },

    // --- CS Faculty (3 Members) ---
    {
      id: 'user-faculty-01',
      role: 'faculty',
      name: 'Prof. Sarah Jenkins',
      email: 'faculty@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 234-5678',
      department_id: 'dept-cs',
      designation: 'Associate Professor & Class Advisor (CS-S4)',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-02',
      role: 'faculty',
      name: 'Dr. Marcus Sterling',
      email: 'marcus@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 345-6789',
      department_id: 'dept-cs',
      designation: 'Professor & Head of CS Department',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-03',
      role: 'faculty',
      name: 'Prof. Alan Turing',
      email: 'cs.faculty3@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 345-1111',
      department_id: 'dept-cs',
      designation: 'Assistant Professor (Operating Systems & Architecture)',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },

    // --- EC Faculty (3 Members) ---
    {
      id: 'user-faculty-ec-01',
      role: 'faculty',
      name: 'Dr. Robert Taylor',
      email: 'ec.faculty1@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 456-1001',
      department_id: 'dept-ec',
      designation: 'Professor & Head of EC Department',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-ec-02',
      role: 'faculty',
      name: 'Dr. Meera Nambiar',
      email: 'ec.faculty2@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 456-1002',
      department_id: 'dept-ec',
      designation: 'Associate Professor & Class Advisor (EC-S2)',
      avatar_url: 'https://images.unsplash.com/photo-1534751516642-a171edd2521d?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-ec-03',
      role: 'faculty',
      name: 'Prof. Vikram Malhotra',
      email: 'ec.faculty3@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 456-1003',
      department_id: 'dept-ec',
      designation: 'Assistant Professor (Signals & Circuit Theory)',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },

    // --- ME Faculty (3 Members) ---
    {
      id: 'user-faculty-me-01',
      role: 'faculty',
      name: 'Dr. James Anderson',
      email: 'me.faculty1@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 567-2001',
      department_id: 'dept-me',
      designation: 'Professor & Head of ME Department',
      avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-me-02',
      role: 'faculty',
      name: 'Prof. Rajesh Kulkarni',
      email: 'me.faculty2@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 567-2002',
      department_id: 'dept-me',
      designation: 'Associate Professor (Solid & Fluid Mechanics)',
      avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-me-03',
      role: 'faculty',
      name: 'Prof. David Miller',
      email: 'me.faculty3@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 567-2003',
      department_id: 'dept-me',
      designation: 'Assistant Professor & Class Advisor (ME-S6)',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },

    // --- Common / Basic Sciences Faculty (2 Members) ---
    {
      id: 'user-faculty-bs-01',
      role: 'faculty',
      name: 'Dr. Priya Sharma',
      email: 'priya@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 678-3001',
      department_id: 'dept-bs',
      designation: 'Associate Professor of Applied Mathematics & HOD (BS)',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },
    {
      id: 'user-faculty-bs-02',
      role: 'faculty',
      name: 'Prof. Catherine Vance',
      email: 'bs.comm@apex.edu',
      password_hash: passwordHashFaculty,
      phone: '+1 (555) 678-3002',
      department_id: 'dept-bs',
      designation: 'Assistant Professor of Technical Communication',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-05T00:00:00Z'
    },

    // --- Students (Targeted to Specific Department, Semester Pairs) ---
    // Primary Student: Alex Rivera (CS, Semester 4 -> CS-S4)
    {
      id: 'user-student-01',
      role: 'student',
      name: 'Alex Rivera',
      email: 'student@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6541',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Dedicated Test Student: Rohit Sharma (CS, S4, CS-2024-2028-SecA)
    {
      id: 'user-student-rohit',
      role: 'student',
      name: 'Rohit Sharma',
      email: 'rohit@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6199',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Test Student 2: Jessica Chen (EC, Semester 2 -> EC-S2)
    {
      id: 'user-student-02',
      role: 'student',
      name: 'Jessica Chen',
      email: 'jessica@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6542',
      department_id: 'dept-ec',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Test Student 3: David Kumar (ME, Semester 6 -> ME-S6)
    {
      id: 'user-student-03',
      role: 'student',
      name: 'David Kumar',
      email: 'david@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6543',
      department_id: 'dept-me',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Additional Students in CS-S4 (Cohort of Alex Rivera)
    {
      id: 'user-student-04',
      role: 'student',
      name: 'Samantha Rao',
      email: 'samantha@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6544',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    {
      id: 'user-student-05',
      role: 'student',
      name: 'Michael Brown',
      email: 'michael@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6545',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    {
      id: 'user-student-06',
      role: 'student',
      name: 'Kevin Zhang',
      email: 'kevin@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6546',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    {
      id: 'user-student-07',
      role: 'student',
      name: 'Anita Patel',
      email: 'anita@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6547',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Additional Students in EC-S2 (Cohort of Jessica Chen)
    {
      id: 'user-student-08',
      role: 'student',
      name: 'Ryan Cooper',
      email: 'ryan@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6548',
      department_id: 'dept-ec',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    },
    // Additional Students in ME-S6 (Cohort of David Kumar)
    {
      id: 'user-student-09',
      role: 'student',
      name: 'Daniel Evans',
      email: 'daniel@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6549',
      department_id: 'dept-me',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    }
  ];

  // 5. Faculty Profiles
  fallback.faculty_profiles = [
    { id: 'prof-fac-01', user_id: 'user-faculty-01', staff_id: 'FAC-CS-001', department_id: 'dept-cs', designation: 'Associate Professor & Class Advisor', qualification: 'M.Tech, Ph.D.', specialization: 'Database Systems & Cloud Computing', status: 'active' },
    { id: 'prof-fac-02', user_id: 'user-faculty-02', staff_id: 'FAC-CS-002', department_id: 'dept-cs', designation: 'Professor & Head of Department', qualification: 'Ph.D., Post-Doc', specialization: 'Design & Analysis of Algorithms', status: 'active' },
    { id: 'prof-fac-03', user_id: 'user-faculty-03', staff_id: 'FAC-CS-003', department_id: 'dept-cs', designation: 'Assistant Professor', qualification: 'M.E., Ph.D.', specialization: 'Operating Systems & System Architecture', status: 'active' },
    { id: 'prof-fac-04', user_id: 'user-faculty-ec-01', staff_id: 'FAC-EC-001', department_id: 'dept-ec', designation: 'Professor & Head of Department', qualification: 'Ph.D.', specialization: 'VLSI System Design', status: 'active' },
    { id: 'prof-fac-05', user_id: 'user-faculty-ec-02', staff_id: 'FAC-EC-002', department_id: 'dept-ec', designation: 'Associate Professor', qualification: 'M.Tech, Ph.D.', specialization: 'Microprocessors & Embedded Systems', status: 'active' },
    { id: 'prof-fac-06', user_id: 'user-faculty-ec-03', staff_id: 'FAC-EC-003', department_id: 'dept-ec', designation: 'Assistant Professor', qualification: 'M.Tech', specialization: 'Circuit Theory & Wireless Communication', status: 'active' },
    { id: 'prof-fac-07', user_id: 'user-faculty-me-01', staff_id: 'FAC-ME-001', department_id: 'dept-me', designation: 'Professor & Head of Department', qualification: 'Ph.D.', specialization: 'Thermal Power & Fluid Mechanics', status: 'active' },
    { id: 'prof-fac-08', user_id: 'user-faculty-me-02', staff_id: 'FAC-ME-002', department_id: 'dept-me', designation: 'Associate Professor', qualification: 'M.Tech, Ph.D.', specialization: 'Mechanics of Solids & CAD', status: 'active' },
    { id: 'prof-fac-09', user_id: 'user-faculty-me-03', staff_id: 'FAC-ME-003', department_id: 'dept-me', designation: 'Assistant Professor', qualification: 'M.E.', specialization: 'Robotics & Industrial Automation', status: 'active' },
    { id: 'prof-fac-10', user_id: 'user-faculty-bs-01', staff_id: 'FAC-BS-001', department_id: 'dept-bs', designation: 'Associate Professor & HOD', qualification: 'M.Sc., M.Phil., Ph.D.', specialization: 'Probability, Graph Theory & Queuing Models', status: 'active' },
    { id: 'prof-fac-11', user_id: 'user-faculty-bs-02', staff_id: 'FAC-BS-002', department_id: 'dept-bs', designation: 'Assistant Professor', qualification: 'M.A., M.Phil.', specialization: 'Technical Communication & Professional Ethics', status: 'active' }
  ];

  // 6. Student Profiles: Assigned to specific (Department, Semester) pairs
  fallback.student_profiles = [
    // CS-S4 (Alex Rivera & Classmates)
    {
      id: 'prof-std-01',
      user_id: 'user-student-01',
      roll_no: 'CS24-001',
      register_no: '312224104001',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2025,
      admission_date: '2025-06-15',
      date_of_birth: '2005-08-15',
      guardian_name: 'Arthur Rivera',
      parent_name: 'Arthur Rivera',
      phone_number: '+1 (555) 987-6541',
      blood_group: 'O+',
      status: 'active',
      notes: 'Honor roll student, departmental representative (CS-S4).'
    },
    // Test Student: Rohit Sharma
    {
      id: 'prof-std-rohit',
      user_id: 'user-student-rohit',
      roll_no: '24CSE199',
      register_no: '312224104199',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2024,
      admission_date: '2024-06-15',
      date_of_birth: '2005-04-30',
      guardian_name: 'Girish Sharma',
      parent_name: 'Girish Sharma',
      phone_number: '+1 (555) 987-6199',
      blood_group: 'B+',
      status: 'active',
      notes: 'Dedicated Test Student - CS 2024-2028 Cohort'
    },
    {
      id: 'prof-std-04',
      user_id: 'user-student-04',
      roll_no: 'CS24-002',
      register_no: '312224104002',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2025,
      admission_date: '2025-06-15',
      date_of_birth: '2005-09-30',
      guardian_name: 'Krishna Rao',
      parent_name: 'Krishna Rao',
      phone_number: '+1 (555) 987-6544',
      blood_group: 'AB+',
      status: 'active',
      notes: 'Maintains consistent 90%+ internal assessment average.'
    },
    {
      id: 'prof-std-05',
      user_id: 'user-student-05',
      roll_no: 'CS24-003',
      register_no: '312224104003',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2025,
      admission_date: '2025-06-18',
      date_of_birth: '2005-04-05',
      guardian_name: 'William Brown',
      parent_name: 'William Brown',
      phone_number: '+1 (555) 987-6545',
      blood_group: 'O-',
      status: 'active',
      notes: 'Lead organizer of college competitive programming club.'
    },
    {
      id: 'prof-std-06',
      user_id: 'user-student-06',
      roll_no: 'CS24-004',
      register_no: '312224104004',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2025,
      admission_date: '2025-06-18',
      date_of_birth: '2005-01-20',
      guardian_name: 'Ming Zhang',
      parent_name: 'Ming Zhang',
      phone_number: '+1 (555) 987-6546',
      blood_group: 'B+',
      status: 'active',
      notes: 'Database lab student assistant.'
    },
    {
      id: 'prof-std-07',
      user_id: 'user-student-07',
      roll_no: 'CS24-005',
      register_no: '312224104005',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2025,
      admission_date: '2025-06-18',
      date_of_birth: '2005-07-12',
      guardian_name: 'Suresh Patel',
      parent_name: 'Suresh Patel',
      phone_number: '+1 (555) 987-6547',
      blood_group: 'A+',
      status: 'active',
      notes: 'Web development club member.'
    },

    // EC-S2 (Jessica Chen & Classmates)
    {
      id: 'prof-std-02',
      user_id: 'user-student-02',
      roll_no: 'EC25-014',
      register_no: '312225106014',
      batch_id: 'batch-ec-s2',
      department: 'EC',
      current_semester: 2,
      admission_year: 2026,
      admission_date: '2026-06-15',
      date_of_birth: '2006-02-20',
      guardian_name: 'Wei Chen',
      parent_name: 'Wei Chen',
      phone_number: '+1 (555) 987-6542',
      blood_group: 'A+',
      status: 'active',
      notes: 'Top rank in S1 Circuit Analysis; student rep (EC-S2).'
    },
    {
      id: 'prof-std-08',
      user_id: 'user-student-08',
      roll_no: 'EC25-015',
      register_no: '312225106015',
      batch_id: 'batch-ec-s2',
      department: 'EC',
      current_semester: 2,
      admission_year: 2026,
      admission_date: '2026-06-15',
      date_of_birth: '2006-05-18',
      guardian_name: 'Thomas Cooper',
      parent_name: 'Thomas Cooper',
      phone_number: '+1 (555) 987-6548',
      blood_group: 'B-',
      status: 'active',
      notes: 'Electronics hardware project enthusiast.'
    },

    // ME-S6 (David Kumar & Classmates)
    {
      id: 'prof-std-03',
      user_id: 'user-student-03',
      roll_no: 'ME23-088',
      register_no: '312223114088',
      batch_id: 'batch-me-s6',
      department: 'ME',
      current_semester: 6,
      admission_year: 2024,
      admission_date: '2024-06-16',
      date_of_birth: '2004-11-12',
      guardian_name: 'Ramesh Kumar',
      parent_name: 'Ramesh Kumar',
      phone_number: '+1 (555) 987-6543',
      blood_group: 'B+',
      status: 'active',
      notes: 'Robotics team captain & SAE collegiate participant (ME-S6).'
    },
    {
      id: 'prof-std-09',
      user_id: 'user-student-09',
      roll_no: 'ME23-089',
      register_no: '312223114089',
      batch_id: 'batch-me-s6',
      department: 'ME',
      current_semester: 6,
      admission_year: 2024,
      admission_date: '2024-06-16',
      date_of_birth: '2004-03-24',
      guardian_name: 'Paul Evans',
      parent_name: 'Paul Evans',
      phone_number: '+1 (555) 987-6549',
      blood_group: 'O+',
      status: 'active',
      notes: 'CAD/CAM design lead and capstone researcher.'
    }
  ];

  // 7. Subjects (College Curriculum across S1 to S6)
  fallback.subjects = [
    // --- CS Core Subjects (S1 to S6) ---
    { id: 'sub-cs101', department_id: 'dept-cs', code: 'CS101', name: 'Programming in C & Computational Logic', semester: 1, credits: 3, type: 'theory', description: 'C syntax, control flow, functions, pointers, file I/O' },
    { id: 'sub-cs201', department_id: 'dept-cs', code: 'CS201', name: 'Python Programming & Object Design', semester: 2, credits: 3, type: 'theory', description: 'Data structures in Python, OOP, modules, exception handling' },
    { id: 'sub-cs301', department_id: 'dept-cs', code: 'CS301', name: 'Data Structures & Algorithmic Analysis', semester: 3, credits: 4, type: 'theory', description: 'Stacks, queues, linked lists, trees, graphs, sorting' },
    { id: 'sub-cs401', department_id: 'dept-cs', code: 'CS401', name: 'Database Management Systems (DBMS)', semester: 4, credits: 4, type: 'theory', description: 'Relational model, SQL, normalization, transactions, indexing' },
    { id: 'sub-cs402', department_id: 'dept-cs', code: 'CS402', name: 'Design and Analysis of Algorithms (DAA)', semester: 4, credits: 4, type: 'theory', description: 'Divide & conquer, greedy, dynamic programming, NP-completeness' },
    { id: 'sub-cs403', department_id: 'dept-cs', code: 'CS403', name: 'Operating Systems Principles (OS)', semester: 4, credits: 4, type: 'theory', description: 'Process management, concurrency, memory paging, deadlocks' },
    { id: 'sub-cs404', department_id: 'dept-cs', code: 'CS404', name: 'Computer Networks (CN)', semester: 4, credits: 4, type: 'theory', description: 'OSI/TCP-IP models, routing protocols, cryptography, socket APIs' },
    { id: 'sub-cs501', department_id: 'dept-cs', code: 'CS501', name: 'Computer Networks & Security Protocols', semester: 5, credits: 4, type: 'theory', description: 'OSI/TCP-IP models, routing protocols, cryptography, socket APIs' },
    { id: 'sub-cs502', department_id: 'dept-cs', code: 'CS502', name: 'Cloud Computing & Distributed Systems', semester: 5, credits: 4, type: 'theory', description: 'Virtualization, microservices, consensus, Docker & Kubernetes' },
    { id: 'sub-cs601', department_id: 'dept-cs', code: 'CS601', name: 'Artificial Intelligence & Machine Learning', semester: 6, credits: 4, type: 'theory', description: 'Supervised/unsupervised learning, neural networks, heuristics' },
    { id: 'sub-cs602', department_id: 'dept-cs', code: 'CS602', name: 'Compiler Engineering & Automata Theory', semester: 6, credits: 4, type: 'theory', description: 'Lexical analysis, parsing, intermediate code generation, optimization' },

    // --- EC Core Subjects (S1 to S6) ---
    { id: 'sub-ec101', department_id: 'dept-ec', code: 'EC101', name: 'Basic Electronics & Network Analysis', semester: 1, credits: 3, type: 'theory', description: 'Kirchhoff laws, diodes, transistors, network theorems' },
    { id: 'sub-ec201', department_id: 'dept-ec', code: 'EC201', name: 'Electronic Devices & Amplifier Circuits', semester: 2, credits: 4, type: 'theory', description: 'BJT, MOSFET modeling, multistage amplifiers, feedback' },
    { id: 'sub-ec202', department_id: 'dept-ec', code: 'EC202', name: 'Digital Electronics & Logic Design', semester: 2, credits: 4, type: 'theory', description: 'Boolean algebra, combinational & sequential logic, state machines' },
    { id: 'sub-ec301', department_id: 'dept-ec', code: 'EC301', name: 'Analog Circuits & Linear ICs', semester: 3, credits: 4, type: 'theory', description: 'Op-amps, timers, filters, waveform generators' },
    { id: 'sub-ec401', department_id: 'dept-ec', code: 'EC401', name: 'Signals and Systems', semester: 4, credits: 4, type: 'theory', description: 'Fourier, Laplace, and Z-transforms, convolution, stability' },
    { id: 'sub-ec402', department_id: 'dept-ec', code: 'EC402', name: 'Microprocessors and Microcontrollers', semester: 4, credits: 4, type: 'theory', description: '8086, ARM Cortex architecture, assembly, peripheral interfacing' },
    { id: 'sub-ec501', department_id: 'dept-ec', code: 'EC501', name: 'Digital Communication Engineering', semester: 5, credits: 4, type: 'theory', description: 'PCM, digital modulation schemes (QAM, PSK), channel coding' },
    { id: 'sub-ec601', department_id: 'dept-ec', code: 'EC601', name: 'VLSI System Design', semester: 6, credits: 4, type: 'theory', description: 'CMOS logic, Verilog HDL, layout design, timing analysis' },

    // --- ME Core Subjects (S1 to S6) ---
    { id: 'sub-me101', department_id: 'dept-me', code: 'ME101', name: 'Basic Mechanical Engineering & Workshop', semester: 1, credits: 3, type: 'theory', description: 'Power transmission, manufacturing processes, boilers' },
    { id: 'sub-me201', department_id: 'dept-me', code: 'ME201', name: 'Engineering Graphics & CAD Modeling', semester: 2, credits: 4, type: 'theory', description: 'Orthographic projections, isometric views, 3D CAD modeling' },
    { id: 'sub-me301', department_id: 'dept-me', code: 'ME301', name: 'Thermodynamics & Heat Transfer', semester: 3, credits: 4, type: 'theory', description: 'Laws of thermodynamics, Carnot cycle, conduction, convection' },
    { id: 'sub-me401', department_id: 'dept-me', code: 'ME401', name: 'Mechanics of Solids & Strength of Materials', semester: 4, credits: 4, type: 'theory', description: 'Stress, strain, bending moments, torsional deflection, Mohr circle' },
    { id: 'sub-me402', department_id: 'dept-me', code: 'ME402', name: 'Fluid Mechanics & Hydraulic Machinery', semester: 4, credits: 4, type: 'theory', description: 'Bernoulli theorem, boundary layers, pumps, turbines' },
    { id: 'sub-me501', department_id: 'dept-me', code: 'ME501', name: 'Thermal Engineering & Gas Turbines', semester: 5, credits: 4, type: 'theory', description: 'Steam cycles, IC engines, compressors, refrigeration' },
    { id: 'sub-me601', department_id: 'dept-me', code: 'ME601', name: 'Robotics and Industrial Automation', semester: 6, credits: 4, type: 'theory', description: 'Kinematics, manipulators, PLC controllers, sensors, vision systems' },
    { id: 'sub-me602', department_id: 'dept-me', code: 'ME602', name: 'Power Plant Engineering & Renewable Energy', semester: 6, credits: 4, type: 'theory', description: 'Nuclear, solar, wind, and thermal generation systems' },

    // --- BS Shared Basic Science Subjects ---
    { id: 'sub-bs101', department_id: 'dept-bs', code: 'BS101', name: 'Engineering Mathematics I (Calculus & Matrices)', semester: 1, credits: 4, type: 'theory', description: 'Differential calculus, eigenvalues, multiple integrals' },
    { id: 'sub-bs102', department_id: 'dept-bs', code: 'BS102', name: 'Technical English & Professional Communication', semester: 1, credits: 3, type: 'theory', description: 'Technical writing, presentations, collaborative discussions' },
    { id: 'sub-bs201', department_id: 'dept-bs', code: 'BS201', name: 'Engineering Mathematics II (Differential Equations)', semester: 2, credits: 4, type: 'theory', description: 'Vector calculus, analytic functions, complex integration' },
    { id: 'sub-bs301', department_id: 'dept-bs', code: 'BS301', name: 'Discrete Mathematics & Graph Theory', semester: 3, credits: 4, type: 'theory', description: 'Propositional logic, set theory, combinatorics, trees' },
    { id: 'sub-bs401', department_id: 'dept-bs', code: 'BS401', name: 'Probability and Queueing Theory', semester: 4, credits: 4, type: 'theory', description: 'Random variables, Markov chains, birth-death queuing models' }
  ];

  // 8. Faculty Subject Assignments
  fallback.faculty_subject_assignments = [
    // CS Assignments
    { id: 'fsa-cs-01', faculty_id: 'user-faculty-01', subject_id: 'sub-cs401', batch_id: 'batch-cs-s4', academic_year_id: 'ay-2025-2028' },
    { id: 'fsa-cs-02', faculty_id: 'user-faculty-01', subject_id: 'sub-cs404', batch_id: 'batch-cs-s4', academic_year_id: 'ay-2025-2028' },
    { id: 'fsa-cs-03', faculty_id: 'user-faculty-02', subject_id: 'sub-cs403', batch_id: 'batch-cs-s4', academic_year_id: 'ay-2025-2028' },
    { id: 'fsa-cs-04', faculty_id: 'user-faculty-03', subject_id: 'sub-cs402', batch_id: 'batch-cs-s4', academic_year_id: 'ay-2025-2028' },
    { id: 'fsa-cs-05', faculty_id: 'user-faculty-bs-01', subject_id: 'sub-bs401', batch_id: 'batch-cs-s4', academic_year_id: 'ay-2025-2028' },
    // EC Assignments
    { id: 'fsa-ec-01', faculty_id: 'user-faculty-ec-01', subject_id: 'sub-ec601', batch_id: 'batch-ec-s6', academic_year_id: 'ay-2024-2027' },
    { id: 'fsa-ec-02', faculty_id: 'user-faculty-ec-02', subject_id: 'sub-ec201', batch_id: 'batch-ec-s2', academic_year_id: 'ay-2026-2029' },
    { id: 'fsa-ec-03', faculty_id: 'user-faculty-ec-03', subject_id: 'sub-ec202', batch_id: 'batch-ec-s2', academic_year_id: 'ay-2026-2029' },
    { id: 'fsa-ec-04', faculty_id: 'user-faculty-bs-01', subject_id: 'sub-bs201', batch_id: 'batch-ec-s2', academic_year_id: 'ay-2026-2029' },
    // ME Assignments
    { id: 'fsa-me-01', faculty_id: 'user-faculty-me-01', subject_id: 'sub-me602', batch_id: 'batch-me-s6', academic_year_id: 'ay-2024-2027' },
    { id: 'fsa-me-02', faculty_id: 'user-faculty-me-02', subject_id: 'sub-me401', batch_id: 'batch-me-s4', academic_year_id: 'ay-2025-2028' },
    { id: 'fsa-me-03', faculty_id: 'user-faculty-me-03', subject_id: 'sub-me601', batch_id: 'batch-me-s6', academic_year_id: 'ay-2024-2027' }
  ];

  // 9. Student Subject Enrollments
  fallback.student_subject_enrollments = [];
  // Enroll CS-S4 students (user-student-01, 04, 05, 06, 07, user-student-rohit)
  const csS4Students = ['user-student-01', 'user-student-04', 'user-student-05', 'user-student-06', 'user-student-07', 'user-student-rohit'];
  const csS4Subjects = ['sub-cs401', 'sub-cs402', 'sub-cs403', 'sub-cs404', 'sub-bs401'];
  csS4Students.forEach(stId => {
    csS4Subjects.forEach(subId => {
      fallback.student_subject_enrollments.push({
        id: `enr-${stId}-${subId}`,
        student_id: stId,
        subject_id: subId,
        status: 'enrolled',
        enrolled_at: '2025-06-15T00:00:00Z'
      });
    });
  });

  // Enroll EC-S2 students (user-student-02, 08)
  const ecS2Students = ['user-student-02', 'user-student-08'];
  const ecS2Subjects = ['sub-ec201', 'sub-ec202', 'sub-bs201'];
  ecS2Students.forEach(stId => {
    ecS2Subjects.forEach(subId => {
      fallback.student_subject_enrollments.push({
        id: `enr-${stId}-${subId}`,
        student_id: stId,
        subject_id: subId,
        status: 'enrolled',
        enrolled_at: '2026-06-15T00:00:00Z'
      });
    });
  });

  // Enroll ME-S6 students (user-student-03, 09)
  const meS6Students = ['user-student-03', 'user-student-09'];
  const meS6Subjects = ['sub-me601', 'sub-me602'];
  meS6Students.forEach(stId => {
    meS6Subjects.forEach(subId => {
      fallback.student_subject_enrollments.push({
        id: `enr-${stId}-${subId}`,
        student_id: stId,
        subject_id: subId,
        status: 'enrolled',
        enrolled_at: '2024-06-15T00:00:00Z'
      });
    });
  });

  // 10. Dynamic Attendance Records
  // For user-student-01 (Alex Rivera, CS-S4): 28 sessions held across 5 S4 subjects: 27 present, 1 absent = 96.4%
  fallback.attendance = [];
  const s4AttendanceDates = [
    { date: '2026-10-05', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-05', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-06', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-06', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-07', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-07', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-08', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-08', slot: 'Period 4 (11:45 AM - 12:40 PM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-09', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-09', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-12', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-12', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-13', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-13', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-14', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-14', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-15', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-15', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' }, // Alex absent here
    { date: '2026-10-16', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-16', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-19', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-19', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-20', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-20', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-21', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-21', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-22', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-22', slot: 'Period 4 (11:45 AM - 12:40 PM)', sub: 'sub-cs403', fac: 'user-faculty-02' }
  ];

  // Seed for all 5 CS-S4 students across these 28 sessions
  s4AttendanceDates.forEach((s, idx) => {
    csS4Students.forEach(stId => {
      // Alex Rivera is absent on Oct 15 in CS402
      const isAbsent = (stId === 'user-student-01' && s.date === '2026-10-15' && s.sub === 'sub-cs402');
      fallback.attendance.push({
        id: `att-seed-${stId}-${idx + 1}`,
        student_id: stId,
        subject_id: s.sub,
        batch_id: 'batch-cs-s4',
        department: 'CS',
        semester: 4,
        faculty_id: s.fac,
        date: s.date,
        session_slot: s.slot,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Medical Leave application submitted' : 'Attended',
        created_at: `${s.date}T10:00:00.000Z`,
        updated_at: `${s.date}T10:00:00.000Z`
      });
    });
  });

  // Seed for EC-S2 (Jessica Chen, user-student-02: 12 sessions, 12 present = 100%)
  const ecS2Dates = ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16'];
  ecS2Dates.forEach((d, idx) => {
    ecS2Students.forEach(stId => {
      fallback.attendance.push({
        id: `att-seed-ec-${stId}-${idx + 1}`,
        student_id: stId,
        subject_id: 'sub-ec201',
        batch_id: 'batch-ec-s2',
        department: 'EC',
        semester: 2,
        faculty_id: 'user-faculty-ec-02',
        date: d,
        session_slot: 'Period 1 (08:45 AM - 09:40 AM)',
        status: 'present',
        remarks: 'Attended',
        created_at: `${d}T10:00:00.000Z`,
        updated_at: `${d}T10:00:00.000Z`
      });
    });
  });

  // Seed for ME-S6 (David Kumar, user-student-03: 15 sessions, 14 present, 1 absent = 93.3%)
  const meS6Dates = ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-12', '2026-10-13', '2026-10-15', '2026-10-19', '2026-10-20'];
  meS6Dates.forEach((d, idx) => {
    meS6Students.forEach(stId => {
      const isAbsent = (stId === 'user-student-03' && d === '2026-10-15');
      fallback.attendance.push({
        id: `att-seed-me-${stId}-${idx + 1}`,
        student_id: stId,
        subject_id: 'sub-me601',
        batch_id: 'batch-me-s6',
        department: 'ME',
        semester: 6,
        faculty_id: 'user-faculty-me-03',
        date: d,
        session_slot: 'Period 2 (09:40 AM - 10:35 AM)',
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'On Duty: SAE Competition' : 'Attended',
        created_at: `${d}T10:00:00.000Z`,
        updated_at: `${d}T10:00:00.000Z`
      });
    });
  });

  // 11. Department & Semester-Specific Academic Announcements (Notice Board)
  fallback.academic_announcements = [
    {
      id: 'anc-cs-s4-01',
      title: 'CS-S4 Continuous Assessment Test (CAT-2) Question Pattern & Unit Coverage',
      content: 'The Department of Computer Science announces that CAT-2 for Semester 4 will cover Unit 3 (B+ Trees & Query Optimization) and Unit 4 (Transaction Processing & Concurrency). Detailed question paper blueprint and formula sheets are available.',
      priority: 'important',
      target_department: 'CS',
      target_semester: '4',
      target_type: 'batch',
      department_id: 'dept-cs',
      batch_id: 'batch-cs-s4',
      subject_id: 'sub-cs401',
      posted_by: 'user-faculty-01',
      date: '2026-10-20',
      created_at: '2026-10-20T09:00:00.000Z'
    },
    {
      id: 'anc-cs-s4-02',
      title: 'DBMS Laboratory (CS404) Mini-Project Demonstration & Viva Schedule',
      content: 'All Semester 4 Computer Science students must finalize their SQL relational schemas, stored procedures, and frontend connection code. Mini-project evaluation will be conducted in Database Lab 104.',
      priority: 'important',
      target_department: 'CS',
      target_semester: '4',
      target_type: 'batch',
      department_id: 'dept-cs',
      batch_id: 'batch-cs-s4',
      subject_id: 'sub-cs404',
      posted_by: 'user-faculty-01',
      date: '2026-10-22',
      created_at: '2026-10-22T11:00:00.000Z'
    },
    {
      id: 'anc-ec-s2-01',
      title: 'EC-S2 Analog Circuits Hardware Kit Distribution & Lab Manual',
      content: 'Second semester Electronics students can collect their breadboards, op-amp ICs, and component kits from the Microelectronics Lab. Attendance is compulsory for all lab sessions.',
      priority: 'important',
      target_department: 'EC',
      target_semester: '2',
      target_type: 'department',
      department_id: 'dept-ec',
      batch_id: 'batch-ec-s2',
      subject_id: 'sub-ec201',
      posted_by: 'user-faculty-ec-02',
      date: '2026-10-18',
      created_at: '2026-10-18T10:30:00.000Z'
    },
    {
      id: 'anc-me-s6-01',
      title: 'ME-S6 Final Year Capstone Project Defense & Industrial Review',
      content: 'Sixth semester Mechanical students are required to submit draft reports and working CAD/CAM simulation models to their project guides before external evaluation.',
      priority: 'important',
      target_department: 'ME',
      target_semester: '6',
      target_type: 'department',
      department_id: 'dept-me',
      batch_id: 'batch-me-s6',
      subject_id: 'sub-me601',
      posted_by: 'user-faculty-me-01',
      date: '2026-10-15',
      created_at: '2026-10-15T14:00:00.000Z'
    },
    {
      id: 'anc-all-01',
      title: 'Anna University End-Semester Even Examinations (3-Year Model Regulations)',
      content: 'The Controller of Examinations has published the final examination timetable for S2, S4, and S6. Hall tickets will be downloadable through the Student Portal starting November 10. Students must have >=75% attendance to qualify.',
      priority: 'important',
      target_department: 'ALL',
      target_semester: 'ALL',
      target_type: 'college',
      department_id: null,
      batch_id: null,
      subject_id: null,
      posted_by: 'user-admin-01',
      date: '2026-10-10',
      created_at: '2026-10-10T08:00:00.000Z'
    },
    {
      id: 'anc-all-02',
      title: 'Zenora College Annual Technical & Innovation Symposium (Zenith 2026)',
      content: 'All departments (CS, EC, ME) are invited to register for Zenith 2026. Events include Paper Presentations, Coding Hackathons, Hardware Demonstrations, and CAD Design challenges.',
      priority: 'normal',
      target_department: 'ALL',
      target_semester: 'ALL',
      target_type: 'college',
      department_id: null,
      batch_id: null,
      subject_id: null,
      posted_by: 'user-admin-01',
      date: '2026-10-12',
      created_at: '2026-10-12T12:00:00.000Z'
    }
  ];

  // 12. Department & Semester-Specific Academic Events (Calendar)
  fallback.academic_events = [
    {
      id: 'evt-cs-s4-01',
      title: 'CS-S4 Continuous Assessment Test (CAT-2)',
      description: 'Internal assessment test for Semester 4 Computer Science students covering DBMS (CS401), OS (CS402), and DAA (CS403).',
      event_type: 'internal_exam',
      start_date: '2026-11-09T09:30:00.000Z',
      end_date: '2026-11-13T16:30:00.000Z',
      target_department: 'CS',
      target_semester: '4',
      target_batch: 'batch-cs-s4',
      created_by: 'user-faculty-01',
      created_at: '2026-10-01T09:00:00.000Z',
      updated_at: '2026-10-01T09:00:00.000Z'
    },
    {
      id: 'evt-cs-s4-02',
      title: 'CS401 DBMS Mini-Project Final Code Freeze',
      description: 'Final submission deadline for relational SQL schemas, normalization documentation, and backend API integration.',
      event_type: 'assignment_deadline',
      start_date: '2026-10-30T17:00:00.000Z',
      end_date: '2026-10-30T23:59:00.000Z',
      target_department: 'CS',
      target_semester: '4',
      target_batch: 'batch-cs-s4',
      created_by: 'user-faculty-01',
      created_at: '2026-10-15T14:20:00.000Z',
      updated_at: '2026-10-15T14:20:00.000Z'
    },
    {
      id: 'evt-ec-s2-01',
      title: 'EC-S2 Analog Circuits Practical Assessment',
      description: 'Laboratory assessment and circuit breadboard debugging test for Semester 2 Electronics students.',
      event_type: 'internal_exam',
      start_date: '2026-11-04T09:30:00.000Z',
      end_date: '2026-11-06T16:30:00.000Z',
      target_department: 'EC',
      target_semester: '2',
      target_batch: 'batch-ec-s2',
      created_by: 'user-faculty-ec-02',
      created_at: '2026-10-08T11:00:00.000Z',
      updated_at: '2026-10-08T11:00:00.000Z'
    },
    {
      id: 'evt-me-s6-01',
      title: 'ME-S6 Capstone Project Defense & Industrial Review',
      description: 'Final year mechanical project viva-voce conducted with external Anna University evaluators.',
      event_type: 'semester_exam',
      start_date: '2026-11-16T08:30:00.000Z',
      end_date: '2026-11-20T17:30:00.000Z',
      target_department: 'ME',
      target_semester: '6',
      target_batch: 'batch-me-s6',
      created_by: 'user-faculty-me-01',
      created_at: '2026-10-10T09:00:00.000Z',
      updated_at: '2026-10-10T09:00:00.000Z'
    },
    {
      id: 'evt-all-01',
      title: 'End-Semester University Theory Examinations (S2, S4, S6)',
      description: 'University board theory examinations across all engineering departments (Regulation 2021). Hall tickets mandatory.',
      event_type: 'semester_exam',
      start_date: '2026-11-23T10:00:00.000Z',
      end_date: '2026-12-08T17:00:00.000Z',
      target_department: 'ALL',
      target_semester: 'ALL',
      target_batch: 'ALL',
      created_by: 'user-admin-01',
      created_at: '2026-10-05T10:30:00.000Z',
      updated_at: '2026-10-05T10:30:00.000Z'
    },
    {
      id: 'evt-all-02',
      title: 'Deepavali Festival Holiday Break',
      description: 'College closed on account of Deepavali festival celebrations.',
      event_type: 'holiday',
      start_date: '2026-11-01T00:00:00.000Z',
      end_date: '2026-11-02T23:59:59.000Z',
      target_department: 'ALL',
      target_semester: 'ALL',
      target_batch: 'ALL',
      created_by: 'user-admin-01',
      created_at: '2026-10-01T08:00:00.000Z',
      updated_at: '2026-10-01T08:00:00.000Z'
    }
  ];

  // 13. Exams (Structured with Department and Semester)
  fallback.exams = [
    {
      id: 'exam-cs401-cat1',
      title: 'CAT-1: Database Management Systems',
      code: 'EXAM-CS401-01',
      subject_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      department_id: 'dept-cs',
      department_code: 'CS',
      semester: 4,
      exam_type: 'internal',
      date: '2026-10-12',
      start_time: '10:00 AM',
      duration_minutes: 90,
      max_marks: 50.00,
      max_total_marks: 50.00,
      passing_marks: 25.00,
      status: 'published',
      created_by: 'user-faculty-01',
      created_at: '2026-10-01T09:00:00Z'
    },
    {
      id: 'exam-cs403-cat1',
      title: 'CAT-1: Design and Analysis of Algorithms',
      code: 'EXAM-CS403-01',
      subject_id: 'sub-cs403',
      batch_id: 'batch-cs-s4',
      department_id: 'dept-cs',
      department_code: 'CS',
      semester: 4,
      exam_type: 'internal',
      date: '2026-10-14',
      start_time: '10:00 AM',
      duration_minutes: 90,
      max_marks: 50.00,
      max_total_marks: 50.00,
      passing_marks: 25.00,
      status: 'published',
      created_by: 'user-faculty-02',
      created_at: '2026-10-01T09:00:00Z'
    },
    {
      id: 'exam-ec201-mid',
      title: 'Midterm: Electronic Devices & Circuits',
      code: 'EXAM-EC201-01',
      subject_id: 'sub-ec201',
      batch_id: 'batch-ec-s2',
      department_id: 'dept-ec',
      department_code: 'EC',
      semester: 2,
      exam_type: 'internal',
      date: '2026-10-15',
      start_time: '09:30 AM',
      duration_minutes: 90,
      max_marks: 50.00,
      max_total_marks: 50.00,
      passing_marks: 25.00,
      status: 'published',
      created_by: 'user-faculty-ec-02',
      created_at: '2026-10-01T09:00:00Z'
    },
    {
      id: 'exam-me601-final',
      title: 'End-Sem: Robotics & Industrial Automation',
      code: 'EXAM-ME601-01',
      subject_id: 'sub-me601',
      batch_id: 'batch-me-s6',
      department_id: 'dept-me',
      department_code: 'ME',
      semester: 6,
      exam_type: 'semester',
      date: '2026-11-25',
      start_time: '10:00 AM',
      duration_minutes: 180,
      max_marks: 100.00,
      max_total_marks: 100.00,
      passing_marks: 50.00,
      status: 'published',
      created_by: 'user-faculty-me-03',
      created_at: '2026-10-01T09:00:00Z'
    }
  ];

  // 14. Exam Questions & Marks for CS401
  fallback.exam_questions = [
    { id: 'q-cs401-01', exam_id: 'exam-cs401-cat1', question_number: 1, question_label: 'Q1', section_part: 'Part A', max_marks: 2.00, topic_coverage: 'ACID Properties in Transactions', sort_order: 1 },
    { id: 'q-cs401-02', exam_id: 'exam-cs401-cat1', question_number: 2, question_label: 'Q2', section_part: 'Part A', max_marks: 2.00, topic_coverage: '3NF vs BCNF Decomposition', sort_order: 2 },
    { id: 'q-cs401-03', exam_id: 'exam-cs401-cat1', question_number: 3, question_label: 'Q3', section_part: 'Part A', max_marks: 2.00, topic_coverage: 'Primary Key vs Candidate Key', sort_order: 3 },
    { id: 'q-cs401-04', exam_id: 'exam-cs401-cat1', question_number: 4, question_label: 'Q4', section_part: 'Part A', max_marks: 2.00, topic_coverage: 'SQL Nested Subqueries & LIMIT', sort_order: 4 },
    { id: 'q-cs401-05', exam_id: 'exam-cs401-cat1', question_number: 5, question_label: 'Q5', section_part: 'Part A', max_marks: 2.00, topic_coverage: 'Conflict Serializability', sort_order: 5 },
    { id: 'q-cs401-06', exam_id: 'exam-cs401-cat1', question_number: 6, question_label: 'Q6', section_part: 'Part B', max_marks: 10.00, topic_coverage: 'B+ Tree Index Insertion & Node Splitting', sort_order: 6 },
    { id: 'q-cs401-07', exam_id: 'exam-cs401-cat1', question_number: 7, question_label: 'Q7', section_part: 'Part B', max_marks: 10.00, topic_coverage: 'ER Schema to Relational Schema Conversion', sort_order: 7 },
    { id: 'q-cs401-08', exam_id: 'exam-cs401-cat1', question_number: 8, question_label: 'Q8', section_part: 'Part B', max_marks: 10.00, topic_coverage: 'Two-Phase Locking (2PL) Protocols', sort_order: 8 },
    { id: 'q-cs401-09', exam_id: 'exam-cs401-cat1', question_number: 9, question_label: 'Q9', section_part: 'Part B', max_marks: 10.00, topic_coverage: 'Relational Query Plan Optimization', sort_order: 9 }
  ];

  fallback.exam_marks = [
    // Alex Rivera: 45.5 / 50 in CS401 CAT-1
    { id: 'em-alex-1', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-01', student_id: 'user-student-01', marks_obtained: 2.0 },
    { id: 'em-alex-2', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-02', student_id: 'user-student-01', marks_obtained: 2.0 },
    { id: 'em-alex-3', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-03', student_id: 'user-student-01', marks_obtained: 2.0 },
    { id: 'em-alex-4', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-04', student_id: 'user-student-01', marks_obtained: 1.5 },
    { id: 'em-alex-5', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-05', student_id: 'user-student-01', marks_obtained: 2.0 },
    { id: 'em-alex-6', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-06', student_id: 'user-student-01', marks_obtained: 9.0 },
    { id: 'em-alex-7', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-07', student_id: 'user-student-01', marks_obtained: 9.5 },
    { id: 'em-alex-8', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-08', student_id: 'user-student-01', marks_obtained: 8.5 },
    { id: 'em-alex-9', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-09', student_id: 'user-student-01', marks_obtained: 9.0 },
    // Rohit Sharma: 45.5 / 50 (91.0% -> Grade 'O') in CS401 CAT-1
    { id: 'em-rohit-1', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-01', student_id: 'user-student-rohit', marks_obtained: 2.0 },
    { id: 'em-rohit-2', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-02', student_id: 'user-student-rohit', marks_obtained: 2.0 },
    { id: 'em-rohit-3', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-03', student_id: 'user-student-rohit', marks_obtained: 2.0 },
    { id: 'em-rohit-4', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-04', student_id: 'user-student-rohit', marks_obtained: 1.5 },
    { id: 'em-rohit-5', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-05', student_id: 'user-student-rohit', marks_obtained: 2.0 },
    { id: 'em-rohit-6', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-06', student_id: 'user-student-rohit', marks_obtained: 9.0 },
    { id: 'em-rohit-7', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-07', student_id: 'user-student-rohit', marks_obtained: 9.5 },
    { id: 'em-rohit-8', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-08', student_id: 'user-student-rohit', marks_obtained: 8.5 },
    { id: 'em-rohit-9', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-09', student_id: 'user-student-rohit', marks_obtained: 9.0 }
  ];

  // 15. Study Materials & Syllabus Notes
  fallback.subject_materials = [
    {
      id: 'mat-cs-01',
      subject_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      title: 'CS401 Complete University Syllabus (Regulation 2021)',
      description: 'Official university syllabus outline, course outcomes, examination scheme and textbook references.',
      category: 'syllabus',
      file_url: 'http://localhost:5000/uploads/materials/CS401_Syllabus.pdf',
      file_path: 'uploads/materials/CS401_Syllabus.pdf',
      file_type: 'pdf',
      file_size: '1.4 MB',
      uploaded_by: 'user-faculty-01',
      created_at: '2026-02-01T10:00:00Z'
    },
    {
      id: 'mat-cs-02',
      subject_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      title: 'DBMS Module 1 & Unit 3 Lecture Notes: Relational Architecture & Indexing',
      description: 'Detailed lecture slides with B+ tree node insertion, deletion, and relational query plan calculations.',
      category: 'lecture_notes',
      file_url: 'http://localhost:5000/uploads/materials/DBMS_Module1_Notes.pdf',
      file_path: 'uploads/materials/DBMS_Module1_Notes.pdf',
      file_type: 'pdf',
      file_size: '2.8 MB',
      uploaded_by: 'user-faculty-01',
      created_at: '2026-02-15T14:30:00Z'
    },
    {
      id: 'mat-cs-03',
      subject_id: 'sub-cs404',
      batch_id: 'batch-cs-s4',
      title: 'DBMS Laboratory Manual with PL/SQL Code Stubs',
      description: 'Exercises 1 through 12 including ER diagrams, nested queries, procedures, triggers, and cursors.',
      category: 'lab_manual',
      file_url: 'http://localhost:5000/uploads/materials/CS8481_Lab_Manual.pdf',
      file_path: 'uploads/materials/CS8481_Lab_Manual.pdf',
      file_type: 'pdf',
      file_size: '3.5 MB',
      uploaded_by: 'user-faculty-01',
      created_at: '2026-02-05T09:00:00Z'
    },
    {
      id: 'mat-cs-04',
      subject_id: 'sub-cs403',
      batch_id: 'batch-cs-s4',
      title: 'Algorithms Design & Dynamic Programming Handout',
      description: 'Analysis of optimal substructure, 0/1 knapsack, matrix chain multiplication, and Floyd-Warshall proofs.',
      category: 'lecture_notes',
      file_url: 'http://localhost:5000/uploads/materials/Algorithms_DP_Handout.pdf',
      file_path: 'uploads/materials/Algorithms_DP_Handout.pdf',
      file_type: 'pdf',
      file_size: '1.8 MB',
      uploaded_by: 'user-faculty-02',
      created_at: '2026-02-20T11:00:00Z'
    },
    {
      id: 'mat-cs-05',
      subject_id: 'sub-cs8492',
      batch_id: 'batch-cse-4a',
      title: 'CS8492 Database Management Systems Official Regulation Syllabus',
      description: 'Anna University & Autonomous Board Regulation 2021 curriculum and lecture hours breakdown.',
      category: 'syllabus',
      file_url: 'http://localhost:5000/uploads/materials/CS8492_Syllabus.pdf',
      file_path: 'uploads/materials/CS8492_Syllabus.pdf',
      file_type: 'pdf',
      file_size: '1.4 MB',
      uploaded_by: 'user-faculty-01',
      created_at: '2026-02-22T08:30:00Z'
    }
  ];

  // 15b. Explicit Syllabus & Notes Registry Table
  fallback.syllabus_notes = [...fallback.subject_materials];


  // 16. Assignments
  fallback.assignments = [
    {
      id: 'asg-cs401-01',
      subject_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      title: 'Relational Schema Normalization & Complex SQL Queries',
      description: 'Decompose dataset into 3NF and BCNF. Write SQL queries to identify top performance.',
      due_date: '2026-10-30T23:59:59Z',
      max_marks: 20.00,
      attachment_url: '/uploads/assignments/retail_sales_schema.pdf',
      created_by: 'user-faculty-01',
      created_at: '2026-10-10T10:00:00Z'
    }
  ];

  fallback.assignment_submissions = [
    {
      id: 'subm-alex-01',
      assignment_id: 'asg-cs401-01',
      student_id: 'user-student-01',
      submission_text: 'Completed 3NF and BCNF decomposition tables with complete functional dependency closure analysis.',
      attachment_url: '/uploads/assignments/student_solution_cs24001.pdf',
      file_name: 'student_solution_cs24001.pdf',
      status: 'graded',
      marks_awarded: 19.00,
      feedback: 'Excellent work on BCNF decomposition! Well-structured SQL queries.',
      submitted_at: '2026-10-25T14:20:00Z',
      graded_by: 'user-faculty-01',
      graded_at: '2026-10-26T16:00:00Z'
    }
  ];

  // 17. Quizzes and Assessment Data
  if (!fallback.quizzes || fallback.quizzes.length === 0) {
    fallback.quizzes = [
      {
        id: 'quiz-cloud-01',
        title: 'Distributed Systems & Cloud Architecture Midterm Exam',
        subject_id: 'sub-cs401',
        course_id: 'sub-cs401',
        batch_id: 'batch-cs-s4',
        duration_minutes: 45,
        total_points: 50,
        passing_percentage: 60,
        max_attempts: 10,
        instructions: 'Please answer all questions carefully. Each question carries equal points.',
        created_by: 'user-faculty-01',
        created_at: '2026-03-01T09:00:00Z'
      }
    ];

    fallback.quiz_questions = [
      { id: 'qq-01', quiz_id: 'quiz-cloud-01', question_text: 'Which architectural design pattern prevents an application from executing an operation that is guaranteed to fail in an overloaded downstream service?', question_type: 'multiple_choice', points: 10, sort_order: 1 },
      { id: 'qq-02', quiz_id: 'quiz-cloud-01', question_text: 'In relational database theory, which Normal Form guarantees the absence of transitive functional dependencies on candidate keys?', question_type: 'multiple_choice', points: 10, sort_order: 2 },
      { id: 'qq-03', quiz_id: 'quiz-cloud-01', question_text: 'What is the primary objective of a Write-Ahead Log (WAL) in transaction management?', question_type: 'multiple_choice', points: 10, sort_order: 3 },
      { id: 'qq-04', quiz_id: 'quiz-cloud-01', question_text: 'Which disk indexing tree structure is guaranteed to be completely height-balanced with leaves stored at equal depth?', question_type: 'multiple_choice', points: 10, sort_order: 4 },
      { id: 'qq-05', quiz_id: 'quiz-cloud-01', question_text: 'In distributed CAP theorem, which property guarantees that every read receives the most recent write or an error?', question_type: 'multiple_choice', points: 10, sort_order: 5 }
    ];

    fallback.quiz_options = [
      { id: 'qo-01-1', question_id: 'qq-01', option_text: 'Circuit Breaker Pattern', is_correct: true, sort_order: 1 },
      { id: 'qo-01-2', question_id: 'qq-01', option_text: 'Singleton Factory Pattern', is_correct: false, sort_order: 2 },
      { id: 'qo-01-3', question_id: 'qq-01', option_text: 'Observer Event Pattern', is_correct: false, sort_order: 3 },
      { id: 'qo-01-4', question_id: 'qq-01', option_text: 'Proxy Adapter Pattern', is_correct: false, sort_order: 4 },

      { id: 'qo-02-1', question_id: 'qq-02', option_text: 'Third Normal Form (3NF)', is_correct: true, sort_order: 1 },
      { id: 'qo-02-2', question_id: 'qq-02', option_text: 'First Normal Form (1NF)', is_correct: false, sort_order: 2 },
      { id: 'qo-02-3', question_id: 'qq-02', option_text: 'Second Normal Form (2NF)', is_correct: false, sort_order: 3 },
      { id: 'qo-02-4', question_id: 'qq-02', option_text: 'Denormalized Form', is_correct: false, sort_order: 4 },

      { id: 'qo-03-1', question_id: 'qq-03', option_text: 'Guarantee Atomicity and Durability across system crashes', is_correct: true, sort_order: 1 },
      { id: 'qo-03-2', question_id: 'qq-03', option_text: 'Compress disk table spaces', is_correct: false, sort_order: 2 },
      { id: 'qo-03-3', question_id: 'qq-03', option_text: 'Speed up in-memory joins', is_correct: false, sort_order: 3 },
      { id: 'qo-03-4', question_id: 'qq-03', option_text: 'Encrypt network traffic', is_correct: false, sort_order: 4 },

      { id: 'qo-04-1', question_id: 'qq-04', option_text: 'B+ Tree', is_correct: true, sort_order: 1 },
      { id: 'qo-04-2', question_id: 'qq-04', option_text: 'Binary Search Tree', is_correct: false, sort_order: 2 },
      { id: 'qo-04-3', question_id: 'qq-04', option_text: 'Trie Index', is_correct: false, sort_order: 3 },
      { id: 'qo-04-4', question_id: 'qq-04', option_text: 'Skip List', is_correct: false, sort_order: 4 },

      { id: 'qo-05-1', question_id: 'qq-05', option_text: 'Consistency (C)', is_correct: true, sort_order: 1 },
      { id: 'qo-05-2', question_id: 'qq-05', option_text: 'Availability (A)', is_correct: false, sort_order: 2 },
      { id: 'qo-05-3', question_id: 'qq-05', option_text: 'Partition Tolerance (P)', is_correct: false, sort_order: 3 },
      { id: 'qo-05-4', question_id: 'qq-05', option_text: 'Concurrency (C)', is_correct: false, sort_order: 4 }
    ];
  }

  // 18. Timetable Schedules
  fallback.academic_schedules = [
    { id: 'sch-01', batch_id: 'batch-cs-s4', subject_id: 'sub-cs401', faculty_id: 'user-faculty-01', day_of_week: 'Monday', start_time: '08:45 AM', end_time: '09:40 AM', room_number: 'Tech Block 301' },
    { id: 'sch-02', batch_id: 'batch-cs-s4', subject_id: 'sub-cs402', faculty_id: 'user-faculty-03', day_of_week: 'Monday', start_time: '09:40 AM', end_time: '10:35 AM', room_number: 'Tech Block 301' },
    { id: 'sch-03', batch_id: 'batch-cs-s4', subject_id: 'sub-cs403', faculty_id: 'user-faculty-02', day_of_week: 'Tuesday', start_time: '08:45 AM', end_time: '09:40 AM', room_number: 'Tech Block 301' },
    { id: 'sch-04', batch_id: 'batch-cs-s4', subject_id: 'sub-bs401', faculty_id: 'user-faculty-bs-01', day_of_week: 'Tuesday', start_time: '09:40 AM', end_time: '10:35 AM', room_number: 'Tech Block 301' },
    { id: 'sch-05', batch_id: 'batch-cs-s4', subject_id: 'sub-cs404', faculty_id: 'user-faculty-01', day_of_week: 'Wednesday', start_time: '01:30 PM', end_time: '04:30 PM', room_number: 'Database Lab 104' }
  ];

  // Save to persistent file
  db.saveFallbackData();

  // Generate complete 18-cohort active students and full 5-day timetable schedules
  const { generateAllCohortData } = require('./generate_academic_data');
  await generateAllCohortData();

  // Generate comprehensive assessments across CS, EC, and ME (S1-S6)
  const { generateComprehensiveAssessments } = require('./generate_assessments_data');
  generateComprehensiveAssessments();

  // Generate synchronized timetable periods (Single Source of Truth)
  const { generateTimetablePeriods } = require('./generate_timetable_periods');
  generateTimetablePeriods();

  console.log('[Seed] Zenora College 3-Year / 6-Semester LMS seed populated successfully:');
  console.log('       - Departments:', fallback.departments.map(d => `${d.code} (${d.name})`).join(', '));
  console.log('       - Batches:', fallback.batches.length, '(S1 to S6 across CS, EC, ME)');
  console.log('       - Faculty:', fallback.users.filter(u => u.role === 'faculty').length, 'members (CS: 3, EC: 3, ME: 3, BS: 2)');
  console.log('       - Students:', fallback.users.filter(u => u.role === 'student').length, 'students across cohorts (CS-S4, EC-S2, ME-S6)');
  console.log('       - Subjects:', fallback.subjects.length, 'accredited curriculum courses');
  console.log('       - Attendance Records:', fallback.attendance.length, 'session entries');
  console.log('       - Circulars / Notices:', fallback.academic_announcements.length);
  console.log('       - Calendar Events:', fallback.academic_events.length);
}

module.exports = { runSeed };

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
