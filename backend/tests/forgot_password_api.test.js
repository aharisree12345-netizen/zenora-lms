const http = require('http');
const express = require('express');
const authRoutes = require('../src/routes/auth.routes');
const emailService = require('../src/services/email.service');
const db = require('../src/config/db');

function makeRequest(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
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

async function runApiTests() {
  console.log('================================================================');
  console.log('🧪 TESTING /api/auth/forgot-password HTTP ENDPOINTS');
  console.log('================================================================\n');

  await db.initDatabase();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const origHost = process.env.SMTP_HOST;
  const origPort = process.env.SMTP_PORT;
  const origUser = process.env.SMTP_USER;
  const origPass = process.env.SMTP_PASS;

  try {
    // -----------------------------------------------------------
    // Case 1: Unconfigured SMTP (Dev fallback)
    // -----------------------------------------------------------
    console.log('Case 1: Testing forgot-password when SMTP is unconfigured...');
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';

    const capturedLogs1 = [];
    const origLog = console.log;
    console.log = (...args) => capturedLogs1.push(args.join(' '));

    let res1;
    try {
      res1 = await makeRequest(server, 'POST', '/api/auth/forgot-password', {
        identifier: 'student@apex.edu',
      });
    } finally {
      console.log = origLog;
    }

    console.log('   HTTP Status:', res1.status);
    console.log('   Response Body:', res1.body);

    const otpRegex = /\[PASSWORD RESET OTP for student@apex\.edu\]: (\d{6})/;
    const foundLog1 = capturedLogs1.find(l => otpRegex.test(l));
    console.log('   Captured Stdout OTP Log:', foundLog1 ? foundLog1 : 'NONE');

    if (res1.status === 200 && res1.body.success && res1.body.isDevFallback && foundLog1) {
      console.log('   ✅ PASS: Returns HTTP 200 with isDevFallback and prints exact stdout OTP.');
    } else {
      console.error('   ❌ FAIL: Unconfigured test failed.');
      process.exit(1);
    }

    // -----------------------------------------------------------
    // Case 2: Configured SMTP with Bad Credentials
    // -----------------------------------------------------------
    console.log('\nCase 2: Testing forgot-password with bad SMTP credentials...');
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'invalid-test-account@gmail.com';
    process.env.SMTP_PASS = 'invalid-app-password';

    const capturedLogs2 = [];
    console.log = (...args) => capturedLogs2.push(args.join(' '));

    let res2;
    try {
      res2 = await makeRequest(server, 'POST', '/api/auth/forgot-password', {
        identifier: 'student@apex.edu',
      });
    } finally {
      console.log = origLog;
    }

    console.log('   HTTP Status:', res2.status);
    console.log('   Success flag:', res2.body.success);
    console.log('   Message:', res2.body.message);

    const foundLog2 = capturedLogs2.find(l => otpRegex.test(l));
    console.log('   Captured Stdout OTP Log on Delivery Failure:', foundLog2 ? foundLog2 : 'NONE');

    if (res2.status === 502 && res2.body.success === false && foundLog2 && res2.body.message.includes('Authentication error')) {
      console.log('   ✅ PASS: Returns clear user-facing HTTP 502 error for bad credentials without false success screen.');
      console.log('   ✅ PASS: Dev OTP printed to stdout for fallback recovery.');
    } else {
      console.error('   ❌ FAIL: Bad credentials test failed. Response:', res2);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL API ENDPOINT TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    server.close();
    process.env.SMTP_HOST = origHost;
    process.env.SMTP_PORT = origPort;
    process.env.SMTP_USER = origUser;
    process.env.SMTP_PASS = origPass;
  }
}

runApiTests().catch((err) => {
  console.error('API Test Suite Failed:', err);
  process.exit(1);
});
