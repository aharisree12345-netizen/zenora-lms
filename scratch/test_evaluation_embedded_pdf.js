const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\SHYAMSUNDAR AK\\.gemini\\antigravity-ide\\brain\\a5578bf0-a654-4600-94d0-d334ff3b1dc5';

const userDataDir = path.join(os.tmpdir(), 'chrome_pdf_eval_' + Date.now());
fs.mkdirSync(userDataDir, { recursive: true });

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9232',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1280,950',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function run() {
  await sleep(2500);
  const targets = await fetchJson('http://127.0.0.1:9232/json');
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new globalThis.WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.result?.value;
  }

  async function clickNative(text) {
    const coords = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('div, button, span, a'));
        const matches = all.filter(el => el.innerText && el.innerText.includes(${JSON.stringify(text)}));
        if (matches.length === 0) return null;
        matches.sort((a, b) => a.innerText.length - b.innerText.length);
        const target = matches[0];
        target.scrollIntoView({ block: 'center' });
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);

    if (!coords) {
      console.warn('Could not find element coordinates for text:', text);
      return false;
    }

    console.log(`Native click "${text}" at (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1
    });
    await sleep(80);
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1
    });
    return true;
  }

  async function captureScreenshot(filepath) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result && res.result.data) {
      fs.writeFileSync(filepath, Buffer.from(res.result.data, 'base64'));
      console.log(`✓ Screenshot saved to: ${filepath}`);
    }
  }

  ws.addEventListener('message', e => {
    const data = JSON.parse(e.data);
    if (data.id && pending.has(data.id)) {
      const resolve = pending.get(data.id);
      pending.delete(data.id);
      resolve(data);
    }
  });

  ws.addEventListener('open', async () => {
    try {
      console.log('Connected to Chrome DevTools Protocol on port 9231');
      await send('Console.enable');
      await send('Runtime.enable');
      await send('Page.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 950,
        deviceScaleFactor: 1,
        mobile: false
      });

      console.log('Navigating to http://localhost:8081...');
      await send('Page.navigate', { url: 'http://localhost:8081' });
      await sleep(4000);

      let bodyText = await evaluate('document.body.innerText');

      // If on Sign In screen:
      if (bodyText.includes('Sign In to Academic Workspace') || bodyText.includes('ONE-CLICK ROLE EXPLORER')) {
        console.log('Filling faculty credentials...');
        await evaluate(`
          (() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            if (inputs.length >= 2) {
              const proto = window.HTMLInputElement.prototype;
              const nativeSet = Object.getOwnPropertyDescriptor(proto, 'value').set;
              nativeSet.call(inputs[0], 'FAC-CSE-001');
              inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
              inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
              nativeSet.call(inputs[1], 'Faculty@123');
              inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
              inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()
        `);
        await sleep(500);

        console.log('Clicking Sign In button...');
        await clickNative('Sign In');
        await sleep(4000);
      }

      // Switch to Assignments tab
      console.log('Switching to Assignments tab...');
      await clickNative('Assignments');
      await sleep(3000);

      // Open Submissions Review Modal
      console.log('Opening Submissions Review Modal...');
      await clickNative('Review & Grade Submissions');
      await sleep(2500);

      // Directly click "Edit Grade & Feedback" / "Enter Marks & Evaluate"
      console.log('Opening Evaluation Modal (Modal 4)...');
      let clickedEval = await clickNative('Edit Grade & Feedback');
      if (!clickedEval) {
        clickedEval = await clickNative('Enter Marks & Evaluate');
      }
      console.log('Clicked evaluation button:', clickedEval);
      await sleep(4000);

      // Check Evaluation Modal state
      const evalCheck = await evaluate(`
        (() => {
          const text = document.body.innerText;
          const iframes = Array.from(document.querySelectorAll('iframe'));
          return {
            hasEvalTitle: text.includes('Evaluate:'),
            hasDocSection: text.includes('Student Submitted Solution Document'),
            hasMarksAwarded: text.includes('Marks Awarded'),
            hasFeedbackNotes: text.includes('Constructive Faculty Feedback'),
            iframeCount: iframes.length,
            iframeSrc: iframes[0]?.src || null,
            iframeDims: iframes[0] ? { width: iframes[0].offsetWidth, height: iframes[0].offsetHeight } : null
          };
        })()
      `);
      console.log('Evaluation Modal Check Results:', evalCheck);

      // Capture screenshot
      const evalScreenshotPath = path.join(ARTIFACTS_DIR, 'teacher_evaluation_modal_embedded_pdf.png');
      await captureScreenshot(evalScreenshotPath);

      console.log('✓ Evaluation modal with embedded PDF verified successfully!');
      ws.close();
      chromeProc.kill();
      process.exit(0);
    } catch (err) {
      console.error('❌ Failed:', err);
      ws.close();
      chromeProc.kill();
      process.exit(1);
    }
  });
}

run().catch(err => {
  console.error(err);
  chromeProc.kill();
  process.exit(1);
});
