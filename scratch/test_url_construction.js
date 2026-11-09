async function testUrlConstruction() {
  const BASE = 'http://localhost:5000/api';

  // 1. Student login
  const sLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '24CSE101', password: 'Student@123' })
  });
  const sLogin = await sLoginRes.json();
  if (!sLogin.success) throw new Error('Student login failed: ' + JSON.stringify(sLogin));
  const studentToken = sLogin.token;
  console.log('✓ Student logged in');

  // 2. Upload file via FormData
  const formData = new FormData();
  const blob = new Blob(['%PDF-1.4 Minimal PDF Content For Verification'], { type: 'application/pdf' });
  formData.append('file', blob, 'my_lab_report.pdf');

  const uploadRes = await fetch(`${BASE}/assignments/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log('Upload response:', uploadData);

  if (!uploadData.success || !uploadData.data.file_url) {
    throw new Error('Upload failed or file_url missing: ' + JSON.stringify(uploadData));
  }

  const uploadedFileUrl = uploadData.data.file_url;
  console.log('Uploaded File URL:', uploadedFileUrl);
  if (!uploadedFileUrl.startsWith('http://localhost:5000/uploads/assignments/')) {
    throw new Error('File URL is not full URL starting with http://localhost:5000/uploads/assignments/ : ' + uploadedFileUrl);
  }
  console.log('✓ Upload endpoint returned full absolute URL:', uploadedFileUrl);

  // 2.5 Find an active assignment
  const asgListRes = await fetch(`${BASE}/assignments`);
  const asgListData = await asgListRes.json();
  const targetAsg = asgListData.data[0];
  if (!targetAsg) throw new Error('No assignments available');
  console.log(`✓ Using assignment ID: ${targetAsg.id} (${targetAsg.title})`);

  // 3. Submit assignment with this URL
  const submitRes = await fetch(`${BASE}/assignments/${targetAsg.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      submission_text: 'Complete Lab Report attached as PDF.',
      attachment_url: uploadedFileUrl
    })
  });
  const submitData = await submitRes.json();
  console.log('Submit HTTP status:', submitRes.status);
  console.log('Submit response full JSON:', JSON.stringify(submitData, null, 2));
  console.log('Submit response attachment_url:', submitData.data?.attachment_url);
  if (!submitData.data?.attachment_url || !submitData.data?.attachment_url.startsWith('http://localhost:5000/uploads/assignments/')) {
    throw new Error('Submit response attachment_url is not full URL: ' + JSON.stringify(submitData));
  }
  console.log('✓ Submit endpoint preserved/returned full absolute URL');

  // 4. Faculty login
  const fLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'FAC-CSE-001', password: 'Faculty@123' })
  });
  const fLogin = await fLoginRes.json();
  const facultyToken = fLogin.token;
  console.log('✓ Faculty logged in');

  // 5. Faculty fetch submissions
  const subsRes = await fetch(`${BASE}/assignments/${targetAsg.id}/submissions`, {
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  const subsData = await subsRes.json();
  const foundSub = subsData.data.submissions.find(s => s.student_id === sLogin.user.id);
  console.log('Found submission attachment_url for faculty:', foundSub?.attachment_url);

  if (!foundSub || !foundSub.attachment_url.startsWith('http://localhost:5000/uploads/assignments/')) {
    throw new Error('Faculty submissions list did not contain full valid URL: ' + foundSub?.attachment_url);
  }
  console.log('✓ Faculty submissions endpoint returns full valid URL:', foundSub.attachment_url);

  // 6. Test accessibility of this URL
  const testFetch = await fetch(foundSub.attachment_url);
  console.log('Fetched attachment from server HTTP status:', testFetch.status);
  if (testFetch.status !== 200) {
    throw new Error('Failed to fetch uploaded file via URL: ' + testFetch.status);
  }
  console.log('✓ Verified uploaded PDF is directly accessible with status 200!');
  console.log('\n🎉 ALL FILE URL CONSTRUCTION & ACCESS CHECKS PASSED!');
}

testUrlConstruction().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
