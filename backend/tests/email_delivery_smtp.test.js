const http = require('http');
const emailService = require('../src/services/email.service');

// Helper to capture stdout/stderr
function captureLogs(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  let logs = [];

  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));

  return fn()
    .finally(() => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    })
    .then((result) => ({ result, logs }));
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING EMAIL DELIVERY & NODEMAILER SMTP VERIFICATION TESTS');
  console.log('================================================================\n');

  // Backup existing env
  const origHost = process.env.SMTP_HOST;
  const origPort = process.env.SMTP_PORT;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;
  const origSecure = process.env.SMTP_SECURE;
  const origFrom = process.env.SMTP_FROM;

  try {
    // -------------------------------------------------------------
    // Test 1: Unconfigured SMTP Boot Verification & Notice
    // -------------------------------------------------------------
    console.log('Test 1: verifyEmailTransport() when SMTP is unconfigured in .env...');
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';

    const { result: unconfiguredRes, logs: unconfiguredLogs } = await captureLogs(async () => {
      return await emailService.verifyEmailTransport();
    });

    console.log('   Configured:', unconfiguredRes.configured, '| Verified:', unconfiguredRes.verified);
    const hasDevNotice = unconfiguredLogs.some(l => l.includes('DEV FALLBACK ACTIVE') || l.includes('NOT CONFIGURED'));
    const hasGmailGuide = unconfiguredLogs.some(l => l.includes('myaccount.google.com/apppasswords'));
    if (!unconfiguredRes.configured && hasDevNotice && hasGmailGuide) {
      console.log('   ✅ PASS: Unconfigured state detected with detailed Gmail App Password setup instructions.');
    } else {
      console.error('   ❌ FAIL: Did not log expected dev fallback guidance.');
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 2: Dev Fallback Stdout OTP Logging when Unconfigured
    // -------------------------------------------------------------
    console.log('\nTest 2: sendPasswordResetEmail() OTP stdout logging when unconfigured...');
    const testEmail1 = 'student@apex.edu';
    const testCode1 = '849201';

    const { result: sendUnconfiguredRes, logs: sendUnconfiguredLogs } = await captureLogs(async () => {
      return await emailService.sendPasswordResetEmail({
        toEmail: testEmail1,
        userName: 'Alex Morgan',
        resetCode: testCode1,
        expiresInMinutes: 15,
      });
    });

    console.log('   Delivered:', sendUnconfiguredRes.delivered, '| DevFallback:', sendUnconfiguredRes.isDevFallback);
    const expectedOtpLog1 = `[PASSWORD RESET OTP for ${testEmail1}]: ${testCode1}`;
    const loggedOtp1 = sendUnconfiguredLogs.some(l => l.includes(expectedOtpLog1));

    if (loggedOtp1 && sendUnconfiguredRes.isDevFallback) {
      console.log(`   ✅ PASS: Exact stdout pattern logged: "${expectedOtpLog1}".`);
    } else {
      console.error(`   ❌ FAIL: Missing exact stdout log "${expectedOtpLog1}"! Logs were:`, sendUnconfiguredLogs);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 3: Bad Credentials Handling (Authentication Error & Stdout Log)
    // -------------------------------------------------------------
    console.log('\nTest 3: sendPasswordResetEmail() with bad/invalid credentials...');
    // Simulate SMTP credentials configured but with invalid password
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'invalid-test-user@gmail.com';
    process.env.SMTP_PASS = 'invalid-fake-app-password';

    const testEmail2 = 'faculty@apex.edu';
    const testCode2 = '593812';

    const { result: sendBadCredsRes, logs: sendBadCredsLogs } = await captureLogs(async () => {
      return await emailService.sendPasswordResetEmail({
        toEmail: testEmail2,
        userName: 'Dr. Sarah Connor',
        resetCode: testCode2,
        expiresInMinutes: 15,
      });
    });

    console.log('   Delivered:', sendBadCredsRes.delivered, '| Error occurred:', !sendBadCredsRes.success);
    const expectedOtpLog2 = `[PASSWORD RESET OTP for ${testEmail2}]: ${testCode2}`;
    const loggedOtp2 = sendBadCredsLogs.some(l => l.includes(expectedOtpLog2));

    if (loggedOtp2) {
      console.log(`   ✅ PASS: Even when SMTP delivery failed, stdout logged: "${expectedOtpLog2}".`);
    } else {
      console.error(`   ❌ FAIL: Fallback OTP stdout log missing on delivery failure!`);
      process.exit(1);
    }

    if (!sendBadCredsRes.delivered && !sendBadCredsRes.success && sendBadCredsRes.isConfigured) {
      console.log('   ✅ PASS: Returns clear failure object with error message instead of generic success.');
    } else {
      console.error('   ❌ FAIL: Expected sendPasswordResetEmail to return success: false on failure, got:', sendBadCredsRes);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 4: Boot Verification with Bad Credentials
    // -------------------------------------------------------------
    console.log('\nTest 4: verifyEmailTransport() with bad credentials...');
    const { result: verifyBadRes, logs: verifyBadLogs } = await captureLogs(async () => {
      return await emailService.verifyEmailTransport();
    });

    console.log('   Configured:', verifyBadRes.configured, '| Verified:', verifyBadRes.verified);
    const hasAuthNotice = verifyBadLogs.some(l => l.includes('CONNECTION VERIFICATION FAILED') || l.includes('AUTHENTICATION ERROR'));
    if (verifyBadRes.configured && !verifyBadRes.verified && hasAuthNotice) {
      console.log('   ✅ PASS: Connection verification logged clear error diagnostics & recovery guidance without crashing.');
    } else {
      console.error('   ❌ FAIL: Expected verifyEmailTransport to return verified: false with diagnostics.');
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL EMAIL DELIVERY & NODEMAILER SMTP TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    // Restore env
    process.env.SMTP_HOST = origHost;
    process.env.SMTP_PORT = origPort;
    process.env.SMTP_USER = origUser;
    process.env.SMTP_PASS = origPass;
    process.env.SMTP_SECURE = origSecure;
    process.env.SMTP_FROM = origFrom;
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
