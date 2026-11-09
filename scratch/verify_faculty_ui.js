const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9228;
const ARTIFACTS_DIR = 'C:\\Users\\SHYAMSUNDAR AK\\.gemini\\antigravity-ide\\brain\\a5578bf0-a654-4600-94d0-d334ff3b1dc5';

const userDataDir = path.join(os.tmpdir(), 'chrome_faculty_ui_' + Date.now());
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
  console.log('🚀 Launching Headless Chrome to verify Faculty UI on localhost:8081...');

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

    // 1. Log in as Faculty directly: FAC-CSE-001 / Faculty@123
    console.log('Filling Faculty credentials (FAC-CSE-001 / Faculty@123)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        if (inputs.length < 2) return false;

        const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        const idInput = inputs[0];
        idInput.focus();
        nativeInputSetter.call(idInput, 'FAC-CSE-001');
        idInput.dispatchEvent(new Event('input', { bubbles: true }));
        idInput.dispatchEvent(new Event('change', { bubbles: true }));

        const passInput = inputs[1];
        passInput.focus();
        nativeInputSetter.call(passInput, 'Faculty@123');
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

    console.log('Waiting for login redirect to Faculty dashboard...');
    await sleep(5000);

    // 2. Navigate to Assignments Tab
    console.log('Navigating to Assignments tab in Faculty view...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('div, a, button, span'));
        const asgTab = links.find(el => el.innerText && el.innerText.trim() === 'Assignments');
        if (asgTab) asgTab.click();
      })()`
    });

    await sleep(4000);

    // 3. Inspect Faculty View DOM
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

    // Capture Faculty Assignments View Screenshot (Shows + Release Assignment & Review Buttons)
    const facultyScreenshot1 = await send('Page.captureScreenshot', { format: 'png' });
    const facultyImgPath1 = path.join(ARTIFACTS_DIR, 'faculty_assignment_view.png');
    fs.writeFileSync(facultyImgPath1, Buffer.from(facultyScreenshot1.result.data, 'base64'));
    console.log('📸 Captured Faculty Assignment View Screenshot:', facultyImgPath1);

    // 4. Open Submissions Review Modal
    console.log('Clicking Review & Grade Submissions button...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('div, button'));
        const reviewBtn = btns.find(b => b.innerText && b.innerText.includes('Review & Grade Submissions'));
        if (reviewBtn) reviewBtn.click();
      })()`
    });

    await sleep(3000);

    // Capture Submissions Review Modal Screenshot
    const facultyScreenshot2 = await send('Page.captureScreenshot', { format: 'png' });
    const facultyImgPath2 = path.join(ARTIFACTS_DIR, 'faculty_submissions_modal.png');
    fs.writeFileSync(facultyImgPath2, Buffer.from(facultyScreenshot2.result.data, 'base64'));
    console.log('📸 Captured Faculty Submissions Review Modal Screenshot:', facultyImgPath2);

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Faculty test failed:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
