// Screenshot and smoke-test driver for the Leonida Ledger.
//
// Serves app/ on a local port, drives the system headless Chrome over its
// debugging protocol (Node's built-in WebSocket client, standard library
// only), and writes 4 real renders of the app into screenshots/:
//   1-tracker.jpg    tracker, 13 trophies earned, the missable trophy's guide open
//   2-roadmap.jpg    the roadmap to the platinum
//   3-missables.jpg  the missables page
//   4-spoilers.jpg   the spoiler guard hiding un-earned story trophies
// Then it runs the feature checks (checklist save, filters, spoiler rule,
// export/import round trip, no off-origin requests) and prints PASS/FAIL.
//
// Usage: node shots.mjs [--serve-port 8099] [--chrome /opt/meta-chromium/chrome]

import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--serve-port');
const port = portIndex === -1 ? 8099 : Number(args[portIndex + 1]);
const chromeIndex = args.indexOf('--chrome');
const chrome = chromeIndex === -1
  ? '/tmp/chrome-headless-shell/linux-158.0.8127.36/chrome-headless-shell-linux64/chrome-headless-shell'
  : args[chromeIndex + 1];
const debugPort = 9223;
const WIDTH = 1280;
const HEIGHT = 800;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const SHOTS = [
  { file: '1-tracker.jpg', path: '/?seed=13&spoilers=0&trophy=28' },
  { file: '2-roadmap.jpg', path: '/?view=roadmap&seed=13' },
  { file: '3-missables.jpg', path: '/?view=missables&seed=13' },
  { file: '4-spoilers.jpg', path: '/?earned=1,14,15,16,17,18,19,20,21,25,30,31,32&spoilers=1' },
];

function serve() {
  return new Promise((resolveServer) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const file = join(appDir, decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname));
      if (!file.startsWith(appDir)) {
        res.writeHead(403).end();
        return;
      }
      createReadStream(file)
        .on('error', () => res.writeHead(404).end('not found'))
        .on('open', () => res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }))
        .pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error(`never came up: ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      } else if (data.method) {
        this.events.push(data);
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
    }
    return result.result.value;
  }

  async waitForReady(tries = 40) {
    for (let i = 0; i < tries; i++) {
      if (await this.evaluate(`document.body && document.body.dataset.ready === 'true'`)) return;
      await sleep(250);
    }
    throw new Error('app never reported ready');
  }

  close() {
    this.ws.close();
  }
}

async function openTab(url) {
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const target = await created.json();
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready();
  await cdp.call('Page.enable');
  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.waitForReady();
  return cdp;
}

async function takeShot(cdp, file) {
  await sleep(400);
  const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  const bytes = Buffer.from(shot.data, 'base64');
  await writeFile(join(shotsDir, file), bytes);
  const info = await stat(join(shotsDir, file));
  console.log(`shot ${file}: ${info.size} bytes`);
  if (info.size > 262144) throw new Error(`${file} is over the 256 KiB cap`);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  // A fresh browser profile every run, so localStorage from an earlier run
  // can never leak into this run's screenshots or checks.
  await rm('/tmp/leonida-chrome-profile', { recursive: true, force: true });
  const server = await serve();
  const chromeProc = spawn(chrome, [
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    '--user-data-dir=/tmp/leonida-chrome-profile',
    `--window-size=${WIDTH},${HEIGHT}`,
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);

    await mkdir(shotsDir, { recursive: true });
    for (const shot of SHOTS) {
      const cdp = await openTab(`http://127.0.0.1:${port}${shot.path}`);
      await takeShot(cdp, shot.file);
      cdp.close();
    }

    // Feature checks on a fresh tab.
    const cdp = await openTab(`http://127.0.0.1:${port}/`);
    check('55 rows render', (await cdp.evaluate(`document.querySelectorAll('.trophy-row').length`)) === 55);
    check('progress starts at 0 of 55', (await cdp.evaluate(`document.getElementById('earnedCount').textContent`)) === '0');
    check(
      'spoiler guard on by default hides story names',
      (await cdp.evaluate(`document.querySelectorAll('.hidden-trophy').length`)) === 17,
    );
    await cdp.evaluate(`document.querySelector('.trophy-row input[type=checkbox]').click()`);
    check(
      'ticking a trophy saves to localStorage',
      (await cdp.evaluate(`JSON.parse(localStorage.getItem('leonida-ledger-v1')).earned.length`)) === 1,
    );
    await cdp.evaluate(`document.getElementById('spoilerToggle').click()`);
    check(
      'spoiler toggle reveals story names',
      (await cdp.evaluate(`document.querySelectorAll('.hidden-trophy').length`)) === 0,
    );
    await cdp.evaluate(`
      {
        const s = document.getElementById('gradeFilter');
        s.value = 'silver';
        s.dispatchEvent(new Event('change'));
      }
    `);
    check('grade filter silver shows 6', (await cdp.evaluate(`document.querySelectorAll('.trophy-row').length`)) === 6);
    await cdp.evaluate(`
      {
        const s = document.getElementById('gradeFilter');
        s.value = 'all';
        s.dispatchEvent(new Event('change'));
        const q = document.getElementById('search');
        q.value = 'scooter';
        q.dispatchEvent(new Event('input'));
      }
    `);
    check('search "scooter" finds 1 trophy', (await cdp.evaluate(`document.querySelectorAll('.trophy-row').length`)) === 1);
    await cdp.evaluate(`
      {
        const q = document.getElementById('search');
        q.value = '';
        q.dispatchEvent(new Event('input'));
        document.querySelectorAll('.trophy-row')[27].click();
      }
    `);
    check(
      'detail pane opens the missable guide with sources',
      (await cdp.evaluate(`document.getElementById('detailName').textContent`)) === 'Positive Mental Attitude' &&
        (await cdp.evaluate(`document.getElementById('detailMissable').hidden`)) === false &&
        (await cdp.evaluate(`document.querySelectorAll('#detailSources a').length`)) === 3,
    );
    check(
      'export/import round trip keeps progress',
      await cdp.evaluate(`
        (async () => {
          const store = await import('./js/store.js');
          const state = store.loadState();
          const blob = new Blob([JSON.stringify(store.exportPayload(state))], { type: 'application/json' });
          const file = new File([blob], 'progress.json', { type: 'application/json' });
          const back = await store.parseImportFile(file, ['Positive Mental Attitude', 'Vice Got a Price!']);
          return back.earned.length === 1 && back.earned[0] === 'Vice Got a Price!';
        })()
      `),
    );
    check(
      'no off-origin requests at load',
      await cdp.evaluate(`
        performance.getEntriesByType('resource')
          .every((r) => r.name.startsWith('http://127.0.0.1:${port}/'))
      `),
    );
    cdp.close();
  } finally {
    chromeProc.kill();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
