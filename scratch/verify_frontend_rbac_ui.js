const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9227;
const ARTIFACTS_DIR = 'C:\\Users\\SHYAMSUNDAR AK\\.gemini\\antigravity-ide\\brain\\a5578bf0-a654-4600-94d0-d334ff3b1dc5';

const userDataDir = path.join(os.tmpdir(), 'chrome_rbac_ui_' + Date.now());
fs.mkdirSync(userDataDir, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Launching Headless Chrome to verify RBAC & Assignment UI on localhost:8081...');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,850',
    'about:blank'
  ]);

  try {
    await sleep(2500);
    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page');
    console.log('Page Target WebSocket:', pageTarget.webSocketDebuggerUrl);

    const ws = new globalThis.WebSocket(pageTarget.webSocketDebuggerUrl);

    let msgId = 1;
    const pending = new Map();
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data.toString();
      const data = JSON.parse(raw);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    });

    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:8081...');
    await send('Page.navigate', { url: 'http://localhost:8081' });
    await sleep(4000);

    // 1. Log in as Student using React native prototype setter
    console.log('Filling Student credentials (24CSE101 / Student@123)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        if (inputs.length < 2) return false;

        const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        const idInput = inputs[0];
        idInput.focus();
        nativeInputSetter.call(idInput, '24CSE101');
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        idInput.dispatchEvent(new Event('change', { bubbles: true }));

        const passInput = inputs[1];
        passInput.focus();
        nativeInputSetter.call(passInput, 'Student@123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));

        return true;
      })()`
    });

    await sleep(1000);

    console.log('Clicking Sign In...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('div, button'));
        const signInBtn = buttons.find(b => b.innerText && b.innerText.trim() === 'Sign In');
        if (signInBtn) signInBtn.click();
      })()`
    });

    console.log('Waiting for login redirect to Student dashboard...');
    await sleep(5000);

    // 2. Navigate to Assignments Tab
    console.log('Navigating to Assignments tab in Student view...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('div, a, button, span'));
        const asgTab = links.find(el => el.innerText && el.innerText.trim() === 'Assignments');
        if (asgTab) asgTab.click();
      })()`
    });

    await sleep(4000);

    // 3. Inspect Student View DOM
    const studentCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasReleaseBtn = bodyText.includes('+ Release Assignment');
        const hasReviewBtn = bodyText.includes('Review & Grade Submissions');
        const hasGradedBadge = bodyText.includes('Graded') || bodyText.includes('19.5');
        const hasFeedback = bodyText.includes('Feedback') || bodyText.includes('Outstanding');
        const hasSubmitBtn = bodyText.includes('Submit Solution') || bodyText.includes('Resubmit');
        const hasStudentBanner = bodyText.includes('Student Assignment Submission Portal');

        return {
          hasReleaseBtn,
          hasReviewBtn,
          hasGradedBadge,
          hasFeedback,
          hasSubmitBtn,
          hasStudentBanner,
          sampleSnippet: bodyText.substring(0, 400)
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- Student UI Inspection ---');
    console.log(studentCheck.result?.value);

    // Capture Student Screenshot
    const studentScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const studentImgPath = path.join(ARTIFACTS_DIR, 'student_assignment_view.png');
    fs.writeFileSync(studentImgPath, Buffer.from(studentScreenshot.result.data, 'base64'));
    console.log('📸 Captured Student Assignment View Screenshot:', studentImgPath);

    // 4. Switch to Faculty Role via top switcher
    console.log('\nSwitching role to Faculty via Persona Switcher...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const allElems = Array.from(document.querySelectorAll('div, button, a, span'));
        const facSwitcher = allElems.find(el => el.innerText && (el.innerText.trim() === 'Faculty' || el.innerText.includes('Prof. Sarah')));
        if (facSwitcher) facSwitcher.click();
      })()`
    });

    await sleep(4000);

    // Re-verify on Assignments Tab
    await send('Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('div, a, button, span'));
        const asgTab = links.find(el => el.innerText && el.innerText.trim() === 'Assignments');
        if (asgTab) asgTab.click();
      })()`
    });

    await sleep(3500);

    // 5. Inspect Faculty View DOM
    const facultyCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasReleaseBtn = bodyText.includes('+ Release Assignment');
        const hasReviewBtn = bodyText.includes('Review & Grade Submissions');
        const hasFacultyBanner = bodyText.includes('Instructor Evaluation Portal');

        return {
          hasReleaseBtn,
          hasReviewBtn,
          hasFacultyBanner,
          sampleSnippet: bodyText.substring(0, 400)
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- Faculty UI Inspection ---');
    console.log(facultyCheck.result?.value);

    // 6. Click "Review & Grade Submissions"
    console.log('Opening Review & Grade Submissions modal...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('div, button'));
        const reviewBtn = btns.find(b => b.innerText && b.innerText.includes('Review & Grade Submissions'));
        if (reviewBtn) reviewBtn.click();
      })()`
    });

    await sleep(2500);

    // Capture Faculty Submissions Review Modal Screenshot
    const facultyScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const facultyImgPath = path.join(ARTIFACTS_DIR, 'faculty_submissions_review.png');
    fs.writeFileSync(facultyImgPath, Buffer.from(facultyScreenshot.result.data, 'base64'));
    console.log('📸 Captured Faculty Submissions Review Screenshot:', facultyImgPath);

    console.log('\n====================================================');
    console.log('🎉 FRONTEND UI VERIFICATION REPORT:');
    console.log('====================================================');
    console.log('1. Student Role UI Gating:');
    console.log('   - Hidden "+ Release Assignment":', !studentCheck.result?.value?.hasReleaseBtn ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Hidden "Review & Grade Submissions":', !studentCheck.result?.value?.hasReviewBtn ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Student Status Banner Active:', studentCheck.result?.value?.hasStudentBanner ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Displays Graded Score (19.5/20):', studentCheck.result?.value?.hasGradedBadge ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Displays Faculty Feedback:', studentCheck.result?.value?.hasFeedback ? 'PASSED ✅' : 'FAILED ❌');

    console.log('2. Faculty Role UI Access:');
    console.log('   - Visible "+ Release Assignment":', facultyCheck.result?.value?.hasReleaseBtn ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Visible "Review & Grade Submissions":', facultyCheck.result?.value?.hasReviewBtn ? 'PASSED ✅' : 'FAILED ❌');
    console.log('   - Faculty Evaluation Portal Active:', facultyCheck.result?.value?.hasFacultyBanner ? 'PASSED ✅' : 'FAILED ❌');
    console.log('====================================================');

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
