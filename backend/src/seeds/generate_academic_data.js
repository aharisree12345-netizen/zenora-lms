const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../../data/zenora_lms.json');

async function generateAllCohortData() {
  console.log('[Academic Seed] Generating complete students and timetable across all 18 cohorts...');
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  const passwordHashStudent = bcrypt.hashSync('Student@123', 10);

  // Departments & Semesters
  const depts = [
    { code: 'CS', id: 'dept-cs', name: 'Computer Science & Engineering', regCode: '104', hallPrefix: 'Tech Block CS' },
    { code: 'EC', id: 'dept-ec', name: 'Electronics & Communication', regCode: '106', hallPrefix: 'Circuit Block EC' },
    { code: 'ME', id: 'dept-me', name: 'Mechanical Engineering', regCode: '114', hallPrefix: 'Workshop Hall ME' }
  ];

  const semesters = [1, 2, 3, 4, 5, 6];

  // Map of curriculum subjects by department & semester
  // Group available subjects
  const subjectsByDeptSem = {};
  (data.subjects || []).forEach(sub => {
    const sDept = (data.departments || []).find(d => d.id === sub.department_id);
    const code = sDept ? sDept.code : (sub.department_id === 'dept-bs' ? 'BS' : 'CS');
    const key = `${code}-S${sub.semester}`;
    if (!subjectsByDeptSem[key]) subjectsByDeptSem[key] = [];
    subjectsByDeptSem[key].push(sub);
  });

  // Also include BS subjects as shared options for S1-S4
  for (let sem = 1; sem <= 4; sem++) {
    const bsSubs = (data.subjects || []).filter(s => s.department_id === 'dept-bs' && s.semester === sem);
    ['CS', 'EC', 'ME'].forEach(deptCode => {
      const key = `${deptCode}-S${sem}`;
      if (!subjectsByDeptSem[key]) subjectsByDeptSem[key] = [];
      bsSubs.forEach(bs => {
        if (!subjectsByDeptSem[key].some(existing => existing.id === bs.id)) {
          subjectsByDeptSem[key].push(bs);
        }
      });
    });
  }

  // Faculty mapping by department
  const facultyByDept = {
    CS: (data.users || []).filter(u => u.role === 'faculty' && u.department_id === 'dept-cs'),
    EC: (data.users || []).filter(u => u.role === 'faculty' && u.department_id === 'dept-ec'),
    ME: (data.users || []).filter(u => u.role === 'faculty' && u.department_id === 'dept-me'),
    BS: (data.users || []).filter(u => u.role === 'faculty' && u.department_id === 'dept-bs')
  };

  // Helper for faculty selection
  function getFacultyForSubject(deptCode, sub) {
    if (sub.department_id === 'dept-bs') {
      const bsFac = facultyByDept.BS;
      return bsFac.length > 0 ? bsFac[0] : facultyByDept.CS[0];
    }
    const deptFac = facultyByDept[deptCode] || facultyByDept.CS;
    return deptFac[Math.floor(Math.random() * deptFac.length)] || deptFac[0];
  }

  // 1. GENERATE STUDENTS FOR ALL 18 COHORTS
  // Existing primary students to preserve
  const preservedStudentIds = new Set(['user-student-01', 'user-student-02', 'user-student-03', 'user-student-04', 'user-student-05', 'user-student-06', 'user-student-07', 'user-student-08', 'user-student-09']);

  // Filter out any auto-generated secondary students, keep primary
  data.users = (data.users || []).filter(u => u.role !== 'student' || preservedStudentIds.has(u.id));
  data.student_profiles = (data.student_profiles || []).filter(p => preservedStudentIds.has(p.user_id));

  // Names bank for authentic Indian / Global engineering college rosters
  const studentNamesBank = {
    CS: [
      { first: 'Aarav', last: 'Sharma' }, { first: 'Bhavna', last: 'Patel' },
      { first: 'Chetan', last: 'Verma' }, { first: 'Divya', last: 'Nair' },
      { first: 'Eshan', last: 'Gupta' }, { first: 'Farhan', last: 'Ali' },
      { first: 'Gauri', last: 'Menon' }, { first: 'Harish', last: 'Reddy' },
      { first: 'Ishaan', last: 'Joshi' }, { first: 'Janhavi', last: 'Kulkarni' },
      { first: 'Kunal', last: 'Bose' }, { first: 'Lipika', last: 'Sen' }
    ],
    EC: [
      { first: 'Karthik', last: 'Subramanian' }, { first: 'Lavanya', last: 'Iyer' },
      { first: 'Manish', last: 'Saxena' }, { first: 'Nandini', last: 'Das' },
      { first: 'Omkar', last: 'Deshmukh' }, { first: 'Pooja', last: 'Bhatt' },
      { first: 'Qasim', last: 'Khan' }, { first: 'Ritu', last: 'Singhania' },
      { first: 'Sahil', last: 'Kapoor' }, { first: 'Tanvi', last: 'Hegde' },
      { first: 'Utkarsh', last: 'Mishra' }, { first: 'Vidya', last: 'Rao' }
    ],
    ME: [
      { first: 'Udayan', last: 'Banerjee' }, { first: 'Varun', last: 'Chawla' },
      { first: 'Wasim', last: 'Akhtar' }, { first: 'Yashvardhan', last: 'Roy' },
      { first: 'Zainab', last: 'Fatima' }, { first: 'Aditya', last: 'Chopra' },
      { first: 'Brijesh', last: 'Pandey' }, { first: 'Chaitanya', last: 'Gowda' },
      { first: 'Deepak', last: 'Mittal' }, { first: 'Ekta', last: 'Sengupta' },
      { first: 'Gautam', last: 'Sethi' }, { first: 'Himanshu', last: 'Trivedi' }
    ]
  };

  const newUsers = [];
  const newProfiles = [];
  const newEnrollments = [];

  depts.forEach(dept => {
    semesters.forEach(sem => {
      const batchId = `batch-${dept.code.toLowerCase()}-s${sem}`;

      // Check existing students in this cohort
      const existingInCohort = data.student_profiles.filter(p => p.batch_id === batchId);

      // Admission year calculation
      // S1, S2 -> 2026; S3, S4 -> 2025; S5, S6 -> 2024
      const admYear = sem <= 2 ? 2026 : (sem <= 4 ? 2025 : 2024);
      const yearSuffix = String(admYear).slice(-2);

      // Target at least 2 active students per cohort (CS-S4 already has 5, EC-S2 has 2, ME-S6 has 2)
      const targetCount = existingInCohort.length >= 2 ? 0 : (2 - existingInCohort.length);

      for (let i = 0; i < targetCount; i++) {
        const studentIndex = (sem - 1) * 2 + i;
        const nameObj = studentNamesBank[dept.code][studentIndex % studentNamesBank[dept.code].length];
        const fullName = `${nameObj.first} ${nameObj.last}`;
        const email = `${nameObj.first.toLowerCase()}.${dept.code.toLowerCase()}s${sem}@apex.edu`;
        const userId = `user-std-${dept.code.toLowerCase()}-s${sem}-${i + 1}`;
        const rollSeq = String(i + 1).padStart(3, '0');
        const rollNo = `${dept.code}${yearSuffix}-${rollSeq}`;
        const regNo = `3122${yearSuffix}${dept.regCode}${rollSeq}`;

        const userObj = {
          id: userId,
          role: 'student',
          name: fullName,
          email: email,
          password_hash: passwordHashStudent,
          phone: `+1 (555) ${dept.regCode}-${rollSeq}`,
          department_id: dept.id,
          designation: 'Student',
          avatar_url: `https://images.unsplash.com/photo-${1500000000000 + studentIndex}?w=150&h=150&fit=crop`,
          status: 'active',
          created_at: `${admYear}-06-15T00:00:00Z`
        };

        const profObj = {
          id: `prof-std-${dept.code.toLowerCase()}-s${sem}-${i + 1}`,
          user_id: userId,
          roll_no: rollNo,
          register_no: regNo,
          batch_id: batchId,
          department: dept.code,
          current_semester: sem,
          admission_year: admYear,
          admission_date: `${admYear}-06-15`,
          date_of_birth: `${admYear - 19}-05-15`,
          guardian_name: `${nameObj.last} Senior`,
          parent_name: `${nameObj.last} Senior`,
          phone_number: `+1 (555) ${dept.regCode}-${rollSeq}`,
          blood_group: ['O+', 'A+', 'B+', 'AB+'][i % 4],
          status: 'active',
          notes: `Enrolled active student in cohort ${dept.code}-S${sem}.`
        };

        newUsers.push(userObj);
        newProfiles.push(profObj);
      }
    });
  });

  data.users.push(...newUsers);
  data.student_profiles.push(...newProfiles);

  // 2. ENROLL STUDENTS IN CURRICULUM SUBJECTS
  const allStudentProfiles = data.student_profiles;
  allStudentProfiles.forEach(prof => {
    const cohortKey = `${prof.department}-S${prof.current_semester}`;
    const cohortSubjects = subjectsByDeptSem[cohortKey] || [];

    cohortSubjects.forEach(sub => {
      const enrId = `enr-${prof.user_id}-${sub.id}`;
      const exists = (data.student_subject_enrollments || []).some(e => e.id === enrId);
      if (!exists) {
        newEnrollments.push({
          id: enrId,
          student_id: prof.user_id,
          subject_id: sub.id,
          status: 'enrolled',
          enrolled_at: `${prof.admission_year || 2025}-06-15T00:00:00Z`
        });
      }
    });
  });

  if (!data.student_subject_enrollments) data.student_subject_enrollments = [];
  data.student_subject_enrollments.push(...newEnrollments);

  // 3. GENERATE COMPLETE TIMETABLE PERIODS FOR ALL 18 COHORTS (MON-FRI, 09:00 AM - 04:30 PM)
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const standardSlots = [
    { slotName: 'Period 1', start_time: '09:00 AM', end_time: '10:00 AM', isLab: false },
    { slotName: 'Period 2', start_time: '10:00 AM', end_time: '11:00 AM', isLab: false },
    { slotName: 'Period 3', start_time: '11:15 AM', end_time: '12:15 PM', isLab: false },
    { slotName: 'Period 4', start_time: '01:15 PM', end_time: '02:15 PM', isLab: false },
    { slotName: 'Period 5 / Practical Lab', start_time: '02:15 PM', end_time: '04:30 PM', isLab: true }
  ];

  const fullSchedules = [];

  depts.forEach(dept => {
    semesters.forEach(sem => {
      const batchId = `batch-${dept.code.toLowerCase()}-s${sem}`;
      const cohortKey = `${dept.code}-S${sem}`;
      const cohortSubjects = subjectsByDeptSem[cohortKey] || (data.subjects || []).filter(s => s.semester === sem);
      
      const theorySubjects = cohortSubjects.filter(s => s.type !== 'practical');
      const labSubjects = cohortSubjects.filter(s => s.type === 'practical');

      daysOfWeek.forEach((day, dayIdx) => {
        standardSlots.forEach((slot, slotIdx) => {
          let chosenSub;
          let room;

          if (slot.isLab && labSubjects.length > 0 && (dayIdx === 1 || dayIdx === 3)) {
            // Lab on Tuesday & Thursday afternoons
            chosenSub = labSubjects[dayIdx % labSubjects.length];
            room = `${dept.code} Practical Lab ${sem}0${dayIdx + 1}`;
          } else {
            // Theory lecture
            const subPool = theorySubjects.length > 0 ? theorySubjects : cohortSubjects;
            chosenSub = subPool[(dayIdx * 2 + slotIdx) % subPool.length];
            room = `${dept.hallPrefix}-${sem}0${(dayIdx % 3) + 1}`;
          }

          if (!chosenSub) {
            chosenSub = (data.subjects || [])[0];
            room = `${dept.hallPrefix}-${sem}01`;
          }

          const faculty = getFacultyForSubject(dept.code, chosenSub);

          fullSchedules.push({
            id: `sch-${dept.code.toLowerCase()}-s${sem}-${day.toLowerCase().slice(0, 3)}-p${slotIdx + 1}`,
            batch_id: batchId,
            subject_id: chosenSub.id,
            faculty_id: faculty ? faculty.id : 'user-faculty-01',
            day_of_week: day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            session_slot: `${slot.slotName} (${slot.start_time} - ${slot.end_time})`,
            room_number: room,
            created_at: '2026-06-01T00:00:00Z'
          });
        });
      });
    });
  });

  data.academic_schedules = fullSchedules;

  // Save back to JSON
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

  console.log(`[Academic Seed Complete]:`);
  console.log(` - Total Users: ${data.users.length} (${data.users.filter(u => u.role === 'student').length} active students)`);
  console.log(` - Total Student Profiles: ${data.student_profiles.length} (Active across all 18 cohorts)`);
  console.log(` - Total Enrollments: ${data.student_subject_enrollments.length}`);
  console.log(` - Total Timetable Periods: ${data.academic_schedules.length} (Covering all 18 batches, Mon-Fri 09:00 AM - 04:30 PM)`);

  // Verify each cohort has students
  console.log('\n--- Cohort Student Audit ---');
  depts.forEach(d => {
    semesters.forEach(s => {
      const bId = `batch-${d.code.toLowerCase()}-s${s}`;
      const count = data.student_profiles.filter(p => p.batch_id === bId && p.status === 'active').length;
      const schedCount = data.academic_schedules.filter(sc => sc.batch_id === bId).length;
      console.log(`Cohort ${d.code}-S${s} (${bId}): ${count} active students | ${schedCount} timetable slots (Mon-Fri)`);
    });
  });
}

module.exports = { generateAllCohortData };

if (require.main === module) {
  generateAllCohortData();
}
