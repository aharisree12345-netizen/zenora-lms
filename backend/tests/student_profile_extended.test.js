const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://127.0.0.1:5000');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing Extended Student Profile Management & RBAC...');

  // 1. Login as Faculty
  const facultyLogin = await request('POST', '/api/auth/login', {
    email: 'faculty@apex.edu',
    password: 'Faculty@123',
  });
  console.log('Faculty Login Status:', facultyLogin.status, facultyLogin.body?.user?.role);
  const facultyToken = facultyLogin.body?.token;

  // 2. Login as Student 1
  const student1Login = await request('POST', '/api/auth/login', {
    email: 'student@apex.edu',
    password: 'Student@123',
  });
  console.log('Student 1 Login Status:', student1Login.status, student1Login.body?.user?.id);
  const student1Token = student1Login.body?.token;
  const student1Id = student1Login.body?.user?.id;

  // 3. Login as Student 2
  const student2Login = await request('POST', '/api/auth/login', {
    email: 'jessica@apex.edu',
    password: 'Student@123',
  });
  console.log('Student 2 Login Status:', student2Login.status, student2Login.body?.user?.id);
  const student2Token = student2Login.body?.token;
  const student2Id = student2Login.body?.user?.id;

  // 4. Test GET /api/students/:id/profile
  const getProfile = await request('GET', `/api/students/${student1Id}/profile`, null, facultyToken);
  console.log('GET Profile Status:', getProfile.status);
  const prof = getProfile.body?.data || getProfile.body;
  console.log('Initial Extended Fields:', {
    phone: prof?.phone_number || prof?.phone,
    parent_name: prof?.parent_name,
    parent_contact: prof?.parent_contact,
    address: prof?.address,
    blood_group: prof?.blood_group,
    current_semester: prof?.current_semester,
    academic_year: prof?.academic_year,
    admission_date: prof?.admission_date,
    notes: prof?.notes,
  });

  // 5. Test Faculty PUT /api/students/:id/profile - should update academic & personal fields
  const facultyUpdate = await request(
    'PUT',
    `/api/students/${student1Id}/profile`,
    {
      phone_number: '+1-555-0199',
      parent_name: 'Arthur Pendelton',
      parent_contact: '+1-555-0198',
      address: '742 Evergreen Terrace, Sector 4',
      date_of_birth: '2003-05-15',
      blood_group: 'AB+',
      current_semester: 6,
      academic_year: '2023-2027',
      admission_date: '2023-08-01',
      notes: 'Honor roll student, departmental representative.',
      roll_no: 'CS-2023-001-UPDATED',
    },
    facultyToken
  );
  console.log('Faculty Update Status:', facultyUpdate.status, facultyUpdate.body?.success);

  // Verify Faculty Update
  const getProfileAfterFaculty = await request('GET', `/api/students/${student1Id}/profile`, null, facultyToken);
  const updatedByFaculty = getProfileAfterFaculty.body?.data || getProfileAfterFaculty.body;
  console.log('Profile after Faculty Update:', {
    phone: updatedByFaculty?.phone_number || updatedByFaculty?.phone,
    parent_name: updatedByFaculty?.parent_name,
    parent_contact: updatedByFaculty?.parent_contact,
    blood_group: updatedByFaculty?.blood_group,
    current_semester: updatedByFaculty?.current_semester,
    academic_year: updatedByFaculty?.academic_year,
    roll_no: updatedByFaculty?.roll_no,
    notes: updatedByFaculty?.notes,
  });

  // 6. Test Student self-update on personal fields
  const studentSelfUpdate = await request(
    'PUT',
    `/api/students/${student1Id}/profile`,
    {
      phone_number: '+1-555-0777',
      address: '42 Wallaby Way, Sydney',
      blood_group: 'O+',
      current_semester: 8, // Attempt to tamper academic field
      roll_no: 'HACKED-ROLL', // Attempt to tamper roll no
    },
    student1Token
  );
  console.log('Student Self Update Status:', studentSelfUpdate.status, studentSelfUpdate.body?.success);

  // Verify Student Update: personal fields updated, academic fields untouched
  const getProfileAfterStudent = await request('GET', `/api/students/${student1Id}/profile`, null, student1Token);
  const updatedByStudent = getProfileAfterStudent.body?.data || getProfileAfterStudent.body;
  console.log('Profile after Student Update (verifying tamper resistance):', {
    phone: updatedByStudent?.phone_number || updatedByStudent?.phone,
    address: updatedByStudent?.address,
    blood_group: updatedByStudent?.blood_group,
    current_semester: updatedByStudent?.current_semester, // Should remain 6, NOT 8!
    roll_no: updatedByStudent?.roll_no, // Should remain 'CS-2023-001-UPDATED', NOT 'HACKED-ROLL'!
  });

  if (updatedByStudent?.current_semester === 6 && updatedByStudent?.roll_no === 'CS-2023-001-UPDATED') {
    console.log('✅ RBAC check passed: Student cannot tamper with academic fields.');
  } else {
    console.error('❌ RBAC check failed: Student was able to tamper with academic fields!');
  }

  // 7. Test Student 1 trying to edit Student 2's profile - should return 403 Forbidden
  const studentCrossEdit = await request(
    'PUT',
    `/api/students/${student2Id}/profile`,
    {
      phone_number: '+1-555-HACK',
    },
    student1Token
  );
  console.log('Cross-student Edit Status:', studentCrossEdit.status);
  if (studentCrossEdit.status === 403) {
    console.log('✅ RBAC check passed: Student cannot edit another student profile (403 Forbidden).');
  } else {
    console.error('❌ RBAC check failed: Expected 403 Forbidden, got:', studentCrossEdit.status);
  }

  // 8. Clean up: restore original roll_no so academic_lms test suite stays pristine
  await request(
    'PUT',
    `/api/students/${student1Id}/profile`,
    {
      roll_no: '24CSE101',
      current_semester: 4,
    },
    facultyToken
  );
  console.log('Restored student roll_no to 24CSE101 and semester to 4 for regression test suite.');

  console.log('\nAll profile tests finished.');
}

run().catch(console.error);
