const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, 'http://127.0.0.1:5000');
    const headers = { 'Content-Type': 'application/json' };

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
  console.log('====================================================');
  console.log('🧪 VERIFYING PASSWORD RESET FLOW & VERIFICATION CODE');
  console.log('====================================================\n');

  const testEmail = 'student@apex.edu';
  const originalPass = 'Student@123';
  const newPass = 'UpdatedStudent@2026';

  // 1. Initial Login Check
  const loginBefore = await request('POST', '/api/auth/login', {
    identifier: testEmail,
    password: originalPass,
  });
  console.log('1. Initial Login Status:', loginBefore.status, loginBefore.body?.success ? '✅ Success' : '❌ Failed');
  if (loginBefore.status !== 200) {
    throw new Error('Initial login failed before test started');
  }

  // 2. Request Forgot Password
  console.log('\n2. Calling POST /api/auth/forgot-password...');
  const forgotRes = await request('POST', '/api/auth/forgot-password', {
    identifier: testEmail,
  });

  console.log('Forgot Password Status:', forgotRes.status);
  console.log('Response Message:', forgotRes.body?.message);
  console.log('Response Email (Masked):', forgotRes.body?.email);

  // CRITICAL CHECK: reset_code must NOT be exposed in response body
  if (forgotRes.body?.reset_code) {
    console.error('❌ FAILED: reset_code was exposed in response body!', forgotRes.body.reset_code);
    process.exit(1);
  } else {
    console.log('✅ PASS: reset_code is NOT exposed in response body.');
  }

  // 3. Inspect database store for generated code and password_reset_token
  const fallbackFile = path.join(__dirname, '../data/zenora_lms.json');
  const dbData = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
  const resetEntry = (dbData.password_resets || []).find(r => r.identifier === testEmail.toLowerCase());

  console.log('\n3. Database Reset Record:');
  console.log('Found Entry in password_resets:', resetEntry ? 'Yes' : 'No');
  if (!resetEntry) {
    console.error('❌ FAILED: No password reset record created in database!');
    process.exit(1);
  }

  console.log('Generated Code:', resetEntry.code, '(length:', resetEntry.code.length, ')');
  console.log('Has Token:', !!resetEntry.password_reset_token);
  console.log('Expires At:', resetEntry.expires_at);

  const expiresDate = new Date(resetEntry.expires_at);
  const diffMinutes = (expiresDate - new Date()) / (60 * 1000);
  console.log('Expiry Window (Minutes from now):', Math.round(diffMinutes));
  if (diffMinutes < 10 || diffMinutes > 16) {
    console.error('❌ FAILED: Expiry window is not 10-15 minutes!');
    process.exit(1);
  } else {
    console.log('✅ PASS: Expiry timestamp is 15 minutes in the future.');
  }

  // 4. Test Reset with Invalid/Wrong Code
  console.log('\n4. Attempting Reset with Incorrect Code (000000)...');
  const wrongCodeRes = await request('POST', '/api/auth/reset-password', {
    identifier: testEmail,
    reset_code: '000000',
    new_password: newPass,
  });
  console.log('Wrong Code Status:', wrongCodeRes.status, wrongCodeRes.body?.message);
  if (wrongCodeRes.status === 400) {
    console.log('✅ PASS: Invalid verification code rejected with HTTP 400.');
  } else {
    console.error('❌ FAILED: Expected 400 for wrong code, got:', wrongCodeRes.status);
    process.exit(1);
  }

  // 5. Test Reset with Non-6-digit Code
  console.log('\n5. Attempting Reset with malformed code (123)...');
  const shortCodeRes = await request('POST', '/api/auth/reset-password', {
    identifier: testEmail,
    reset_code: '123',
    new_password: newPass,
  });
  console.log('Short Code Status:', shortCodeRes.status, shortCodeRes.body?.message);
  if (shortCodeRes.status === 400) {
    console.log('✅ PASS: Non-6-digit code rejected with HTTP 400.');
  } else {
    console.error('❌ FAILED: Expected 400 for short code, got:', shortCodeRes.status);
    process.exit(1);
  }

  // 6. Test Reset with Exact Valid Code
  console.log(`\n6. Attempting Reset with Valid Code (${resetEntry.code})...`);
  const validResetRes = await request('POST', '/api/auth/reset-password', {
    identifier: testEmail,
    reset_code: resetEntry.code,
    new_password: newPass,
  });
  console.log('Valid Reset Status:', validResetRes.status, validResetRes.body?.message);
  if (validResetRes.status === 200 && validResetRes.body?.success) {
    console.log('✅ PASS: Password reset succeeded with valid verification code.');
  } else {
    console.error('❌ FAILED: Password reset failed with valid code:', validResetRes);
    process.exit(1);
  }

  // 7. Verify Invalidation: Re-using the same code must fail
  console.log('\n7. Verifying Code Invalidation (Attempting to reuse code)...');
  const reuseRes = await request('POST', '/api/auth/reset-password', {
    identifier: testEmail,
    reset_code: resetEntry.code,
    new_password: 'AnotherPassword@123',
  });
  console.log('Reuse Status:', reuseRes.status, reuseRes.body?.message);
  if (reuseRes.status === 400) {
    console.log('✅ PASS: Code was invalidated upon use; reuse rejected with HTTP 400.');
  } else {
    console.error('❌ FAILED: Code was not invalidated after successful reset!');
    process.exit(1);
  }

  // 8. Test Login with New Password
  console.log('\n8. Logging in with NEW password...');
  const loginNew = await request('POST', '/api/auth/login', {
    identifier: testEmail,
    password: newPass,
  });
  console.log('Login with New Password Status:', loginNew.status, loginNew.body?.user?.name);
  if (loginNew.status === 200) {
    console.log('✅ PASS: Successfully authenticated with updated password.');
  } else {
    console.error('❌ FAILED: Could not login with new password!');
    process.exit(1);
  }

  // 9. Clean up / Restore original password
  console.log('\n9. Restoring original password for test suite...');
  // Request a fresh reset code for restoration
  await request('POST', '/api/auth/forgot-password', { identifier: testEmail });
  const updatedDbData = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
  const restoreEntry = (updatedDbData.password_resets || []).find(r => r.identifier === testEmail.toLowerCase());
  await request('POST', '/api/auth/reset-password', {
    identifier: testEmail,
    reset_code: restoreEntry.code,
    new_password: originalPass,
  });
  const restoredLogin = await request('POST', '/api/auth/login', {
    identifier: testEmail,
    password: originalPass,
  });
  console.log('Restored Login Status:', restoredLogin.status, restoredLogin.body?.user?.name);
  if (restoredLogin.status === 200) {
    console.log('✅ PASS: Original student password restored successfully.');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PASSWORD RESET FLOW CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
