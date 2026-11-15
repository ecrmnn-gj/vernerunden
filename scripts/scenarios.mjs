// End-to-end checks of how the generated figure loads and rebuilds: `npm run scenarios`.
// Starts a Vite dev server and drives Chromium (CHROMIUM_PATH, or Playwright's cached headless shell).
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function findChromium(){
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const dir of [join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright')]){
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir).filter(n => n.startsWith('chromium_headless_shell')).sort().reverse())
      for (const p of ['chrome-mac/headless_shell', 'chrome-mac-arm64/chrome-headless-shell', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell'])
        if (existsSync(join(dir, d, p))) return join(dir, d, p);
  }
  throw new Error('No Chromium found: set CHROMIUM_PATH');
}
const server = await createServer({ server:{ port:0 }, logLevel:'error' });
await server.listen();
const URL_ = server.resolvedUrls.local[0] + '?debug';
const browser = await chromium.launch({ executablePath:findChromium(), args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failures = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) failures++; };
async function page(ctx, init){
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  if (init) await p.addInitScript(init);
  const t0 = Date.now();
  await p.goto(URL_, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => window.__vr3dDebug && __vr3dDebug.player() && __vr3dDebug.player().ready, null, { timeout:120000 });
  return { p, errs, ms:Date.now() - t0 };
}
const fresh = await browser.newContext({ viewport:{ width:1280, height:800 } });

console.log('first visit (nothing cached)');
const a = await page(fresh);
check(true, `figure ready after ${a.ms} ms`);
check(await a.p.evaluate(() => !!__vr3dDebug.player().meshes), 'it is the generated figure');
check(!a.errs.length, 'no page errors ' + a.errs.join(' | '));
check((await a.p.evaluate(() => __vr3dDebug.figStats())).generated > 0, 'the parts were generated');
await a.p.waitForTimeout(1500); // let the parts reach IndexedDB
await a.p.close();

console.log('reload (parts from IndexedDB)');
const b = await page(fresh);
{ const st = await b.p.evaluate(() => __vr3dDebug.figStats()); check(st.stored > 0, `parts read back from IndexedDB (ready after ${b.ms} ms) ${JSON.stringify(st)}`); }
check(await b.p.evaluate(() => new Promise(r => { const q = indexedDB.open('vr3d-figure'); q.onsuccess = () => { const c = q.result.transaction('parts').objectStore('parts').count(); c.onsuccess = () => r(c.result > 0); }; q.onerror = () => r(false); })), 'parts are stored in IndexedDB');

console.log('rapid changes in the creator');
await b.p.evaluate(() => __vr3dDebug.start()); await b.p.waitForTimeout(500);
for (const style of ['afro', 'braids', 'long', 'curly', 'bun']){ await b.p.evaluate(s => __vr3dDebug.setChar({ hairStyle:s }), style); await b.p.waitForTimeout(40); }
await b.p.waitForFunction(() => __vr3dDebug.player().char && __vr3dDebug.player().char.hairStyle === 'bun', null, { timeout:120000 }).catch(() => {});
await b.p.waitForTimeout(3000);
check(await b.p.evaluate(() => __vr3dDebug.player().char.hairStyle) === 'bun', 'the last change is the one showing');
check(await b.p.evaluate(() => document.getElementById('creator').getAttribute('aria-busy')) === 'false', 'the creator is no longer busy');
check(!b.errs.length, 'no page errors ' + b.errs.join(' | '));
await b.p.close();

console.log('IndexedDB unavailable');
const ctx2 = await browser.newContext({ viewport:{ width:1280, height:800 } });
const c = await page(ctx2, () => { Object.defineProperty(window, 'indexedDB', { get(){ throw new Error('blocked'); } }); });
check(await c.p.evaluate(() => !!__vr3dDebug.player().meshes), `generated figure still appears (${c.ms} ms)`);
check(!c.errs.length, 'no page errors ' + c.errs.join(' | '));
await c.p.close();

console.log('Workers unavailable');
const ctx3 = await browser.newContext({ viewport:{ width:1280, height:800 } });
const d = await page(ctx3, () => { window.Worker = undefined; });
check(await d.p.evaluate(() => !!__vr3dDebug.player().meshes), `generated figure still appears, built on the main thread (${d.ms} ms)`);
check(!d.errs.length, 'no page errors ' + d.errs.join(' | '));

await browser.close(); await server.close();
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
