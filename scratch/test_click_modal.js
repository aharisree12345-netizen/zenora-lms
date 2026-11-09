const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9230;
const ARTIFACTS_DIR = 'C:\\Users\\SHYAMSUNDAR AK\\.gemini\\antigravity-ide\\brain\\a5578bf0-a654-4600-94d0-d334ff3b1dc5';

const userDataDir = path.join(os.tmpdir(), 'chrome_test_modal_' + Date.now());
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

async function main() {
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

    // 1. Fill Faculty credentials
    console.log('Logging in as Faculty (FAC-CSE-001)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inputs[0], 'FAC-CSE-001');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(inputs[1], 'Faculty@123');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        const btn = Array.from(document.querySelectorAll('div, button')).find(b => b.innerText && b.innerText.trim() === 'Sign In');
        btn.click();
      })()`
    });

    await sleep(5000);

    // 2. Go to assignments
    console.log('Navigating to Assignments...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const tab = Array.from(document.querySelectorAll('div, a, button, span')).find(el => el.innerText && el.innerText.trim() === 'Assignments');
        if (tab) tab.click();
      })()`
    });

    await sleep(3500);

    // 3. Find Review & Grade button coordinates by targeting innermost element
    console.log('Finding innermost review button element...');
    const boxResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const leaf = Array.from(document.querySelectorAll('*')).find(el => 
          el.children.length === 0 && el.innerText && el.innerText.includes('Review & Grade Submissions')
        );
        if (!leaf) return null;
        const btn = leaf.closest('div[role="button"]') || leaf.parentElement;
        const rect = btn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: leaf.innerText };
      })()`,
      returnByValue: true
    });

    console.log('Button Box Result:', JSON.stringify(boxResult));
    const coords = boxResult?.result?.result?.value || boxResult?.result?.value || boxResult?.value;
    console.log('Resolved Coords:', coords);

    if (coords && coords.x && coords.y) {
      console.log(`Dispatching native mouse click at (${coords.x}, ${coords.y})...`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(coords.x), y: Math.round(coords.y), button: 'left', clickCount: 1 });
      await sleep(150);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(coords.x), y: Math.round(coords.y), button: 'left', clickCount: 1 });
    }

    await sleep(3000);

    // 4. Verify Submissions Modal content
    const modalCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const body = document.body.innerText;
        return {
          hasSubmissionsTitle: body.includes('Submissions:'),
          hasAlexRivera: body.includes('Alex Rivera'),
          hasOpenDocBtn: body.includes('Open / Preview Document'),
          hasGradeActionBtn: body.includes('Edit Grade') || body.includes('Enter Marks'),
          bodySnippet: body.slice(0, 500)
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- Modal Check Result ---');
    console.log(modalCheck.result?.value);

    // 5. Capture screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const modalPath = path.join(ARTIFACTS_DIR, 'faculty_submissions_modal.png');
    fs.writeFileSync(modalPath, Buffer.from(shot.result.data, 'base64'));
    console.log('📸 Saved Modal Screenshot to:', modalPath);

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

main();
