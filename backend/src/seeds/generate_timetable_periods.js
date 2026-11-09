const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/zenora_lms.json');

function generateTimetablePeriods() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database file not found:', DB_FILE);
    return;
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const data = JSON.parse(raw);

  const departments = ['CS', 'EC', 'ME'];
  const semesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const academicYearMap = {
    'S1': '1st Year',
    'S2': '1st Year',
    'S3': '2nd Year',
    'S4': '2nd Year',
    'S5': '3rd Year',
    'S6': '3rd Year'
  };

  // Cohort curriculum definitions with realistic course codes, names, rooms, and faculty
  const cohortCurriculum = {
    // ----------------- CS DEPARTMENT -----------------
    'CS-S1': {
      year: '1st Year',
      theorySlots: [
        { code: 'CS101', name: 'Programming in C & Computational Logic', faculty: 'user-faculty-03', room: 'Room 301' },
        { code: 'BS101', name: 'Engineering Mathematics I (Calculus & Matrices)', faculty: 'user-faculty-bs-01', room: 'Room 301' },
        { code: 'BS102', name: 'Technical English & Professional Communication', faculty: 'user-faculty-bs-02', room: 'Room 301' },
        { code: 'CS103', name: 'Digital Logic & Computer Organization', faculty: 'user-faculty-02', room: 'Room 301' }
      ],
      lab: { code: 'CS104', name: 'C Programming & Logic Laboratory', faculty: 'user-faculty-03', room: 'Programming Lab 101' }
    },
    'CS-S2': {
      year: '1st Year',
      theorySlots: [
        { code: 'CS201', name: 'Python Programming & Object Design', faculty: 'user-faculty-01', room: 'Room 201' },
        { code: 'BS201', name: 'Engineering Mathematics II (Differential Equations)', faculty: 'user-faculty-bs-01', room: 'Room 201' },
        { code: 'CS203', name: 'Object Oriented Software Foundations', faculty: 'user-faculty-02', room: 'Room 201' },
        { code: 'CS204', name: 'Environmental Science & Engineering Ethics', faculty: 'user-faculty-bs-02', room: 'Room 201' }
      ],
      lab: { code: 'CS202', name: 'Python & Software Development Lab', faculty: 'user-faculty-03', room: 'Lab 102' }
    },
    'CS-S3': {
      year: '2nd Year',
      theorySlots: [
        { code: 'CS301', name: 'Data Structures & Algorithmic Analysis', faculty: 'user-faculty-02', room: 'Room 302' },
        { code: 'BS301', name: 'Discrete Mathematics & Graph Theory', faculty: 'user-faculty-bs-01', room: 'Room 302' },
        { code: 'CS302', name: 'Computer Architecture & Microprocessing', faculty: 'user-faculty-03', room: 'Room 302' },
        { code: 'CS303', name: 'Object Oriented Programming with Java', faculty: 'user-faculty-01', room: 'Room 302' }
      ],
      lab: { code: 'CS304', name: 'Data Structures & Algorithms Laboratory', faculty: 'user-faculty-02', room: 'Algorithms Lab 103' }
    },
    'CS-S4': {
      year: '2nd Year',
      theorySlots: [
        { code: 'CS401', name: 'Database Management Systems', faculty: 'user-faculty-01', room: 'Room 302' },
        { code: 'CS402', name: 'Operating Systems Principles', faculty: 'user-faculty-02', room: 'Room 302' },
        { code: 'CS403', name: 'Design and Analysis of Algorithms', faculty: 'user-faculty-03', room: 'Room 302' },
        { code: 'BS401', name: 'Probability and Queueing Theory', faculty: 'user-faculty-bs-01', room: 'Room 302' }
      ],
      lab: { code: 'CS404', name: 'Database Management Systems Laboratory', faculty: 'user-faculty-01', room: 'Lab 104' },
      lab2: { code: 'CS405', name: 'Operating Systems & Shell Programming Lab', faculty: 'user-faculty-02', room: 'Systems Lab 102' }
    },
    'CS-S5': {
      year: '3rd Year',
      theorySlots: [
        { code: 'CS501', name: 'Computer Networks & Security Protocols', faculty: 'user-faculty-02', room: 'Room 401' },
        { code: 'CS502', name: 'Cloud Computing & Distributed Systems', faculty: 'user-faculty-01', room: 'Room 401' },
        { code: 'CS503', name: 'Theory of Computation & Automata', faculty: 'user-faculty-03', room: 'Room 401' },
        { code: 'CS504', name: 'Web Technology & RESTful API Architectures', faculty: 'user-faculty-01', room: 'Room 401' }
      ],
      lab: { code: 'CS505', name: 'Networks & Cloud Virtualization Laboratory', faculty: 'user-faculty-02', room: 'Networks Lab 202' }
    },
    'CS-S6': {
      year: '3rd Year',
      theorySlots: [
        { code: 'CS601', name: 'Artificial Intelligence & Machine Learning', faculty: 'user-faculty-03', room: 'Room 401' },
        { code: 'CS602', name: 'Compiler Engineering & Automata Theory', faculty: 'user-faculty-01', room: 'Room 401' },
        { code: 'CS603', name: 'Cryptography & Cyber Security Frameworks', faculty: 'user-faculty-02', room: 'Room 401' },
        { code: 'CS604', name: 'Mobile Application & React Native Development', faculty: 'user-faculty-03', room: 'Room 401' }
      ],
      lab: { code: 'CS605', name: 'AI & Deep Learning Computing Laboratory', faculty: 'user-faculty-03', room: 'AI/ML Lab 105' }
    },

    // ----------------- EC DEPARTMENT -----------------
    'EC-S1': {
      year: '1st Year',
      theorySlots: [
        { code: 'EC101', name: 'Basic Electronics & Network Analysis', faculty: 'user-faculty-ec-01', room: 'Room 201' },
        { code: 'BS101', name: 'Engineering Mathematics I (Calculus & Matrices)', faculty: 'user-faculty-bs-01', room: 'Room 201' },
        { code: 'BS102', name: 'Technical English & Professional Communication', faculty: 'user-faculty-bs-02', room: 'Room 201' },
        { code: 'EC102', name: 'Circuit Theory & Semiconductor Physics', faculty: 'user-faculty-ec-02', room: 'Room 201' }
      ],
      lab: { code: 'EC103', name: 'Basic Electronics & Circuits Laboratory', faculty: 'user-faculty-ec-01', room: 'Circuits Lab 201' }
    },
    'EC-S2': {
      year: '1st Year',
      theorySlots: [
        { code: 'EC201', name: 'Electronic Devices & Amplifier Circuits', faculty: 'user-faculty-ec-02', room: 'Room 202' },
        { code: 'EC202', name: 'Digital Electronics & Logic Design', faculty: 'user-faculty-ec-03', room: 'Room 202' },
        { code: 'BS201', name: 'Engineering Mathematics II', faculty: 'user-faculty-bs-01', room: 'Room 202' },
        { code: 'EC203', name: 'Electromagnetic Fields & Wave Theory', faculty: 'user-faculty-ec-01', room: 'Room 202' }
      ],
      lab: { code: 'EC204', name: 'Digital Electronics & Simulation Lab', faculty: 'user-faculty-ec-03', room: 'Digital Lab 203' }
    },
    'EC-S3': {
      year: '2nd Year',
      theorySlots: [
        { code: 'EC301', name: 'Analog Circuits & Linear ICs', faculty: 'user-faculty-ec-03', room: 'Room 202' },
        { code: 'BS301', name: 'Discrete Mathematics & Transforms', faculty: 'user-faculty-bs-01', room: 'Room 202' },
        { code: 'EC302', name: 'Electronic Measurements & Instrumentation', faculty: 'user-faculty-ec-01', room: 'Room 202' },
        { code: 'EC303', name: 'Control Systems Engineering', faculty: 'user-faculty-ec-02', room: 'Room 202' }
      ],
      lab: { code: 'EC304', name: 'Analog Integrated Circuits Laboratory', faculty: 'user-faculty-ec-03', room: 'Linear IC Lab 202' }
    },
    'EC-S4': {
      year: '2nd Year',
      theorySlots: [
        { code: 'EC401', name: 'Signals and Systems Analysis', faculty: 'user-faculty-ec-01', room: 'Room 202' },
        { code: 'EC402', name: 'Microprocessors and Microcontrollers', faculty: 'user-faculty-ec-02', room: 'Room 202' },
        { code: 'BS401', name: 'Probability & Random Processes', faculty: 'user-faculty-bs-01', room: 'Room 202' },
        { code: 'EC403', name: 'Transmission Lines & Waveguides', faculty: 'user-faculty-ec-03', room: 'Room 202' }
      ],
      lab: { code: 'EC404', name: 'Microcontrollers & Embedded Lab', faculty: 'user-faculty-ec-02', room: 'Lab 204' },
      lab2: { code: 'EC405', name: 'Signals & DSP Simulation Lab', faculty: 'user-faculty-ec-01', room: 'DSP Lab 202' }
    },
    'EC-S5': {
      year: '3rd Year',
      theorySlots: [
        { code: 'EC501', name: 'Digital Communication Engineering', faculty: 'user-faculty-ec-02', room: 'Room 203' },
        { code: 'EC502', name: 'Digital Signal Processing Algorithms', faculty: 'user-faculty-ec-01', room: 'Room 203' },
        { code: 'EC503', name: 'Antenna & Wave Propagation Engineering', faculty: 'user-faculty-ec-03', room: 'Room 203' },
        { code: 'EC504', name: 'Embedded Systems & IoT Protocols', faculty: 'user-faculty-ec-02', room: 'Room 203' }
      ],
      lab: { code: 'EC505', name: 'Digital Communication & IoT Lab', faculty: 'user-faculty-ec-02', room: 'Communication Lab 205' }
    },
    'EC-S6': {
      year: '3rd Year',
      theorySlots: [
        { code: 'EC601', name: 'VLSI System Design & CMOS Fabrication', faculty: 'user-faculty-ec-01', room: 'Room 203' },
        { code: 'EC602', name: 'Optical Communication & Networking', faculty: 'user-faculty-ec-03', room: 'Room 203' },
        { code: 'EC603', name: 'Wireless & Cellular 5G Networks', faculty: 'user-faculty-ec-02', room: 'Room 203' },
        { code: 'EC604', name: 'Robotics & Embedded Vision Processing', faculty: 'user-faculty-ec-01', room: 'Room 203' }
      ],
      lab: { code: 'EC605', name: 'VLSI Chip CAD & FPGA Design Laboratory', faculty: 'user-faculty-ec-01', room: 'VLSI Lab 204' }
    },

    // ----------------- ME DEPARTMENT -----------------
    'ME-S1': {
      year: '1st Year',
      theorySlots: [
        { code: 'ME101', name: 'Basic Mechanical Engineering & Workshop', faculty: 'user-faculty-me-01', room: 'Room 101' },
        { code: 'BS101', name: 'Engineering Mathematics I (Calculus & Matrices)', faculty: 'user-faculty-bs-01', room: 'Room 101' },
        { code: 'BS102', name: 'Technical English & Professional Communication', faculty: 'user-faculty-bs-02', room: 'Room 101' },
        { code: 'ME102', name: 'Engineering Mechanics (Statics & Dynamics)', faculty: 'user-faculty-me-02', room: 'Room 101' }
      ],
      lab: { code: 'ME103', name: 'Mechanical Workshop & Fitting Practice', faculty: 'user-faculty-me-01', room: 'Central Workshop 101' }
    },
    'ME-S2': {
      year: '1st Year',
      theorySlots: [
        { code: 'ME201', name: 'Engineering Graphics & CAD Modeling', faculty: 'user-faculty-me-02', room: 'Room 102' },
        { code: 'BS201', name: 'Engineering Mathematics II', faculty: 'user-faculty-bs-01', room: 'Room 102' },
        { code: 'ME202', name: 'Manufacturing Processes & Foundry Tech', faculty: 'user-faculty-me-03', room: 'Room 102' },
        { code: 'ME203', name: 'Materials Science & Metallurgy', faculty: 'user-faculty-me-01', room: 'Room 102' }
      ],
      lab: { code: 'ME204', name: 'Computer Aided Drafting Laboratory', faculty: 'user-faculty-me-02', room: 'CAD Lab 301' }
    },
    'ME-S3': {
      year: '2nd Year',
      theorySlots: [
        { code: 'ME301', name: 'Thermodynamics & Heat Transfer', faculty: 'user-faculty-me-03', room: 'Room 102' },
        { code: 'BS301', name: 'Applied Numerical Methods & Statistics', faculty: 'user-faculty-bs-01', room: 'Room 102' },
        { code: 'ME302', name: 'Kinematics of Machinery & Linkages', faculty: 'user-faculty-me-01', room: 'Room 102' },
        { code: 'ME303', name: 'Machining Technology & Machine Tools', faculty: 'user-faculty-me-02', room: 'Room 102' }
      ],
      lab: { code: 'ME304', name: 'Machine Tools & Lathe Practice Lab', faculty: 'user-faculty-me-03', room: 'Machine Shop 102' }
    },
    'ME-S4': {
      year: '2nd Year',
      theorySlots: [
        { code: 'ME401', name: 'Mechanics of Solids & Strength of Materials', faculty: 'user-faculty-me-01', room: 'Room 102' },
        { code: 'ME402', name: 'Fluid Mechanics & Hydraulic Machinery', faculty: 'user-faculty-me-02', room: 'Room 102' },
        { code: 'ME403', name: 'Dynamics of Machinery & Balancing', faculty: 'user-faculty-me-03', room: 'Room 102' },
        { code: 'BS401', name: 'Applied Probability & Statistical Inference', faculty: 'user-faculty-bs-01', room: 'Room 102' }
      ],
      lab: { code: 'ME404', name: 'Strength of Materials Laboratory', faculty: 'user-faculty-me-01', room: 'Lab 304' },
      lab2: { code: 'ME405', name: 'Fluid Machinery & Hydraulics Lab', faculty: 'user-faculty-me-02', room: 'Lab 305' }
    },
    'ME-S5': {
      year: '3rd Year',
      theorySlots: [
        { code: 'ME501', name: 'Thermal Engineering & Gas Turbines', faculty: 'user-faculty-me-02', room: 'Room 103' },
        { code: 'ME502', name: 'Design of Machine Elements & Shafts', faculty: 'user-faculty-me-01', room: 'Room 103' },
        { code: 'ME503', name: 'Automobile Engineering & Powertrains', faculty: 'user-faculty-me-03', room: 'Room 103' },
        { code: 'ME504', name: 'Metrology & Quality Inspection Systems', faculty: 'user-faculty-me-02', room: 'Room 103' }
      ],
      lab: { code: 'ME505', name: 'Thermal Engineering & IC Engines Lab', faculty: 'user-faculty-me-02', room: 'Thermal Lab 303' }
    },
    'ME-S6': {
      year: '3rd Year',
      theorySlots: [
        { code: 'ME601', name: 'Robotics and Industrial Automation', faculty: 'user-faculty-me-01', room: 'Room 103' },
        { code: 'ME602', name: 'Power Plant Engineering & Renewable Energy', faculty: 'user-faculty-me-03', room: 'Room 103' },
        { code: 'ME603', name: 'Finite Element Analysis & Structural Simulation', faculty: 'user-faculty-me-02', room: 'Room 103' },
        { code: 'ME604', name: 'Operations Research & Supply Chain Optimization', faculty: 'user-faculty-me-01', room: 'Room 103' }
      ],
      lab: { code: 'ME605', name: 'Robotics & CNC Automation Laboratory', faculty: 'user-faculty-me-01', room: 'Robotics Lab 305' }
    }
  };

  const timetablePeriods = [];

  // Generate periods for each cohort (18 total)
  departments.forEach(dept => {
    semesters.forEach((sem, semIdx) => {
      const cohortKey = `${dept}-${sem}`;
      const cohort = cohortCurriculum[cohortKey];
      if (!cohort) return;

      const academicYear = academicYearMap[sem] || '1st Year';
      const theories = cohort.theorySlots;
      const labCourse = cohort.lab;
      const labCourse2 = cohort.lab2 || labCourse;

      daysOfWeek.forEach((day, dayIdx) => {
        // Daily standard structure:
        // Slot 1: 09:00 AM - 10:00 AM (Theory)
        // Slot 2: 10:00 AM - 11:00 AM (Theory)
        // Slot 3: 11:15 AM - 12:15 PM (Theory)
        // Slot 4 & 5:
        //   - On Tuesday (dayIdx === 1): 01:30 PM - 04:30 PM (Lab 1)
        //   - On Thursday (dayIdx === 3): 01:30 PM - 04:30 PM (Lab 2)
        //   - On Mon, Wed, Fri (dayIdx === 0, 2, 4):
        //       Slot 4: 01:15 PM - 02:15 PM (Theory)
        //       Slot 5: 02:15 PM - 03:15 PM (Theory)

        // Slot 1
        const t1 = theories[(semIdx + dayIdx) % theories.length];
        timetablePeriods.push({
          id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p1`,
          day_of_week: day,
          start_time: '09:00 AM',
          end_time: '10:00 AM',
          department: dept,
          semester: sem,
          academic_year: academicYear,
          subject_code: t1.code,
          subject_name: t1.name,
          session_type: 'theory',
          room_no: t1.room,
          faculty_id: t1.faculty,
          created_at: '2026-06-01T00:00:00.000Z'
        });

        // Slot 2
        const t2 = theories[(semIdx + dayIdx + 1) % theories.length];
        timetablePeriods.push({
          id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p2`,
          day_of_week: day,
          start_time: '10:00 AM',
          end_time: '11:00 AM',
          department: dept,
          semester: sem,
          academic_year: academicYear,
          subject_code: t2.code,
          subject_name: t2.name,
          session_type: 'theory',
          room_no: t2.room,
          faculty_id: t2.faculty,
          created_at: '2026-06-01T00:00:00.000Z'
        });

        // Slot 3
        const t3 = theories[(semIdx + dayIdx + 2) % theories.length];
        timetablePeriods.push({
          id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p3`,
          day_of_week: day,
          start_time: '11:15 AM',
          end_time: '12:15 PM',
          department: dept,
          semester: sem,
          academic_year: academicYear,
          subject_code: t3.code,
          subject_name: t3.name,
          session_type: 'theory',
          room_no: t3.room,
          faculty_id: t3.faculty,
          created_at: '2026-06-01T00:00:00.000Z'
        });

        // Afternoon Slots: Labs on Tuesday & Thursday
        if (dayIdx === 1) {
          // Tuesday Afternoon Lab (01:30 PM - 04:30 PM)
          timetablePeriods.push({
            id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p4`,
            day_of_week: day,
            start_time: '01:30 PM',
            end_time: '04:30 PM',
            department: dept,
            semester: sem,
            academic_year: academicYear,
            subject_code: labCourse.code,
            subject_name: labCourse.name,
            session_type: 'lab',
            room_no: labCourse.room,
            faculty_id: labCourse.faculty,
            created_at: '2026-06-01T00:00:00.000Z'
          });
        } else if (dayIdx === 3) {
          // Thursday Afternoon Lab (01:30 PM - 04:30 PM)
          timetablePeriods.push({
            id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p4`,
            day_of_week: day,
            start_time: '01:30 PM',
            end_time: '04:30 PM',
            department: dept,
            semester: sem,
            academic_year: academicYear,
            subject_code: labCourse2.code,
            subject_name: labCourse2.name,
            session_type: 'lab',
            room_no: labCourse2.room,
            faculty_id: labCourse2.faculty,
            created_at: '2026-06-01T00:00:00.000Z'
          });
        } else {
          // Mon, Wed, Fri Afternoon Theory lectures
          const t4 = theories[(semIdx + dayIdx + 3) % theories.length];
          timetablePeriods.push({
            id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p4`,
            day_of_week: day,
            start_time: '01:15 PM',
            end_time: '02:15 PM',
            department: dept,
            semester: sem,
            academic_year: academicYear,
            subject_code: t4.code,
            subject_name: t4.name,
            session_type: 'theory',
            room_no: t4.room,
            faculty_id: t4.faculty,
            created_at: '2026-06-01T00:00:00.000Z'
          });

          // Slot 5
          const t5 = theories[(semIdx + dayIdx) % theories.length];
          timetablePeriods.push({
            id: `ttp-${dept.toLowerCase()}-${sem.toLowerCase()}-${day.toLowerCase().slice(0, 3)}-p5`,
            day_of_week: day,
            start_time: '02:15 PM',
            end_time: '03:15 PM',
            department: dept,
            semester: sem,
            academic_year: academicYear,
            subject_code: t5.code,
            subject_name: `${t5.name} (Tutorial & Seminar)`,
            session_type: 'theory',
            room_no: t5.room,
            faculty_id: t5.faculty,
            created_at: '2026-06-01T00:00:00.000Z'
          });
        }
      });
    });
  });

  data.timetable_periods = timetablePeriods;

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

  console.log(`[Timetable Engine] Successfully generated ${timetablePeriods.length} synchronized periods!`);
  console.log(` - Departments: CS, EC, ME (All 18 cohorts S1 to S6)`);
  console.log(` - Days: Monday to Friday (09:00 AM - 04:30 PM)`);

  // Faculty schedule audit
  const jenkinsSessions = timetablePeriods.filter(p => p.faculty_id === 'user-faculty-01');
  console.log(` - Prof. Sarah Jenkins (user-faculty-01): ${jenkinsSessions.length} assigned teaching periods.`);
  console.log(`   Sample:`, jenkinsSessions.slice(0, 3).map(s => `${s.day_of_week} ${s.start_time}-${s.end_time} | ${s.department}-${s.semester} | ${s.subject_code} | [${s.session_type}]`));

  // Student schedule audit (CS-S4 Alex Rivera)
  const alexSessions = timetablePeriods.filter(p => p.department === 'CS' && p.semester === 'S4');
  console.log(` - CS-S4 Alex Rivera: ${alexSessions.length} weekly periods.`);
  console.log(`   Sample:`, alexSessions.slice(0, 3).map(s => `${s.day_of_week} ${s.start_time}-${s.end_time} | ${s.subject_code} (${s.subject_name}) | Faculty: ${s.faculty_id}`));
}

if (require.main === module) {
  generateTimetablePeriods();
}

module.exports = { generateTimetablePeriods };
