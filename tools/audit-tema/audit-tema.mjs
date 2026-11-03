#!/usr/bin/env node
/**
 * audit-tema.mjs — memeriksa tema terang/gelap SWA Predict di browser sungguhan.
 *  - mencari PANEL GELAP di mode terang (tanpa pasangan terang),
 *  - menghitung kontras teks WCAG (4,5:1; 3:1 untuk teks besar),
 *  - menyimpan screenshot tiap tampilan.
 *
 * Pemakaian:
 *   npm run build && npx vite preview --port 4173 &
 *   node tools/audit-tema/audit-tema.mjs --url http://127.0.0.1:4173 --theme light --strict
 *   node tools/audit-tema/audit-tema.mjs --theme dark --only dashboard,login --out hasil-tema
 *
 * Browser: set CHROME_PATH=/path/ke/chrome ATAU pasang `puppeteer` ATAU `@sparticuz/chromium`.
 * Dependensi: npm i -D puppeteer-core (+ salah satu di atas).
 * --strict (mode terang): exit 1 bila ada panel gelap di luar daftar yang disengaja
 * atau teks dengan kontras < 3:1.
 */
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import ANALYZE from './analyze.js';

const { values: A } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4173' },
  theme: { type: 'string', default: 'light' },
  only: { type: 'string', default: '' },
  out: { type: 'string', default: 'hasil-audit-tema' },
  strict: { type: 'boolean', default: false },
  mock: { type: 'boolean', default: true },
}});
const BASE = A.url, THEME = A.theme, OUT = A.out;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function launch() {
  const pc = (await import('puppeteer-core')).default;
  if (process.env.CHROME_PATH) return pc.launch({ executablePath: process.env.CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  try {
    const c = (await import('@sparticuz/chromium')).default;
    return pc.launch({ args: [...c.args, '--disable-gpu', '--disable-dev-shm-usage'], executablePath: await c.executablePath(), headless: 'shell' });
  } catch {
    const p = (await import('puppeteer')).default;
    return p.launch({ args: ['--no-sandbox'] });
  }
}
async function clickText(p, re, sel = 'button') {
  const ok = await p.evaluate((re, sel) => {
    const rx = new RegExp(re, 'i');
    const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0 && rx.test((e.innerText || e.title || '').trim()));
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return true; }
    return false;
  }, re, sel);
  await sleep(900); return ok;
}
const noop = async () => {};
const waitText = (p, rx, ms = 60000) => p.waitForFunction((r) => new RegExp(r, 'i').test(document.body.innerText), { timeout: ms }, rx).then(() => true).catch(() => false);
const focusFirst = async (p) => { await p.evaluate(() => { const i = document.querySelector('input'); i && i.focus(); }); await sleep(300); };
const SC = {
  entry: { path: '/', noauth: true, steps: [['base', noop], ['fokus', focusFirst]] },
  tentang: { path: '/tentang', noauth: true, steps: [['base', noop]] },
  dashboard: { path: '/dashboard', steps: [['memuat', noop], ['terlatih', async (p) => { await waitText(p, 'Model LSTM', 150000); await sleep(500); }],
    ['hover-grafik', async (p) => { const r = await p.evaluate(() => { const e = document.querySelector('.recharts-wrapper'); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width * 0.5, y: b.y + b.height * 0.5 }; }); if (r) { await p.mouse.move(r.x, r.y); await sleep(100); await p.mouse.move(r.x + 30, r.y + 10); await sleep(600); } }]] },
  'data-input': { path: '/dashboard/data-input', steps: [['base', noop], ['modal-tambah', async (p) => { await clickText(p, '^Tambah Data'); }], ['modal-import', async (p) => { await clickText(p, '^Batal'); await clickText(p, '^Import CSV'); }]] },
  lstm: { path: '/dashboard/lstm-process', steps: [['langkah1', noop], ['langkah2', async (p) => { await clickText(p, 'Lanjut ke konfigurasi'); }],
    ['langkah3', async (p) => { await clickText(p, 'Mulai pelatihan'); await waitText(p, 'Model dan pembanding', 170000); await sleep(800); }]] },
  report: { path: '/dashboard/report', steps: [['base', noop], ['preview-a4', async (p) => { await clickText(p, 'Preview'); }]] },
  profile: { path: '/dashboard/profile', steps: [['base', noop], ['fokus-input', focusFirst]] },
};
// Panel gelap yang SENGAJA (scrim modal, tombol/isi warna merek, header tabel di kertas A4)
const ALLOW = [/fixed inset-0/, /btn-primary|bg-brand|step-dot-active/, /^tr$/];

// ── API tiruan (tanpa XAMPP): data dari fixture 67 minggu ──
const FIX = JSON.parse(fs.readFileSync(new URL('../../src/__tests__/fixtures/dataset_67_minggu.json', import.meta.url), 'utf8')).rows;
const isoWeek = (d) => { const t = new Date(d + 'T00:00:00Z'); const y0 = Date.UTC(t.getUTCFullYear(), 0, 1); return Math.ceil(((t - y0) / 86400000 + 1) / 7); };
const MOCK_TICKETS = FIX.map((r) => ({ id: `tiket-${r.week_start}`, sale_date: r.week_start, week: isoWeek(r.week_start), year: Number(r.week_start.slice(0, 4)), tickets_sold: r.tickets_sold, ticket_price: r.ticket_price }));
const te = FIX.slice(-13);
const MOCK_HISTORY = [{ id: 1, run_date: '2026-10-27 10:00:00', epochs: 35, learning_rate: 0.01, window_size: 1, mse: 1.14, rmse: 1.07, mape: 11.5,
  results_json: { dates: te.map((r) => r.week_start), actuals: te.map((r) => r.tickets_sold), predictions: te.map((r) => 7.9 + (r.tickets_sold - 7.7) * 0.1), metrics: { mse: 1.14, rmse: 1.07, mape: 11.5, mae: 0.86 } } }];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
async function installMock(p) {
  await p.setRequestInterception(true);
  p.on('request', (req) => {
    const u = req.url();
    if (!u.includes('/api/')) return req.continue();
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS });
    const json = (o) => req.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(o) });
    if (u.includes('/data/tickets.php')) return json({ status: 'success', data: MOCK_TICKETS });
    if (u.includes('/data/predictions.php')) return json(req.method() === 'GET' ? { status: 'success', data: MOCK_HISTORY } : { status: 'success', message: 'ok' });
    if (u.includes('/auth/login.php')) return json({ status: 'success', token: 't', user: { id: 1, name: 'Dwi', username: 'dwi', role: 'admin' } });
    return json({ status: 'success', data: [] });
  });
}

const names = (A.only || Object.keys(SC).join(',')).split(',');
const results = {};
for (const name of names) {
  const sc = SC[name]; if (!sc) { console.log('skenario tidak dikenal:', name); continue; }
  const b = await launch();
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1366, height: 820 });
    if (A.mock) await installMock(p);
    await p.evaluateOnNewDocument((theme, noauth) => {
      if (!location.protocol.startsWith('http')) return;
      localStorage.setItem('theme', theme);
      if (!noauth) { localStorage.setItem('token', 'x'); localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Dwi', username: 'dwi', role: 'admin' })); }
      else { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    }, THEME, !!sc.noauth);
    await p.goto(BASE + sc.path, { waitUntil: 'domcontentloaded', timeout: 20000 }); await sleep(3500);
    for (const [state, fn] of sc.steps) {
      try { await fn(p); } catch (e) { console.log(name, state, 'aksi gagal:', String(e).slice(0, 80)); }
      const d = await p.evaluate(ANALYZE).catch((e) => ({ fatal: String(e), darkPanels: [], lowContrast: [] }));
      try { await p.screenshot({ path: `${OUT}/${THEME}-${name}-${state}.png` }); } catch { /* abaikan */ }
      results[`${name}|${state}`] = d;
      const bad = d.darkPanels.filter((x) => !ALLOW.some((r) => r.test(x.sel)));
      console.log(`${(name + '|' + state).padEnd(26)} panelGelap=${d.darkPanels.length} (tak sengaja ${bad.length}) kontras<4.5=${d.lowContrast.length} <3=${d.lowContrast.filter((c) => c.ratio < 3).length}`);
    }
  } catch (e) { console.log(name, 'GAGAL:', String(e).slice(0, 120)); }
  finally { try { await b.close(); } catch { /* abaikan */ } }
}
fs.writeFileSync(`${OUT}/hasil-${THEME}.json`, JSON.stringify(results, null, 1));

let badPanels = 0, severe = 0;
for (const v of Object.values(results)) {
  badPanels += v.darkPanels.filter((x) => !ALLOW.some((r) => r.test(x.sel))).length;
  severe += v.lowContrast.filter((c) => c.ratio < 3).length;
}
console.log(`\nRINGKAS (${THEME}): panel gelap tak sengaja=${badPanels}, teks kontras<3:1=${severe}`);
if (A.strict && THEME === 'light' && (badPanels > 0 || severe > 0)) { console.error('STRICT: gagal'); process.exitCode = 1; }
