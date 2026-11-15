// Screenshots of the player figure for visual review: `npm run shots [-- set ...]`.
// Starts a Vite dev server, drives the game through the ?debug hook (src/ui/debug.js) and writes PNGs to shots/.
// Needs a Chromium: set CHROMIUM_PATH, or it uses Playwright's cached headless shell.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const OUT = 'shots';
function findChromium(){
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = join(homedir(), 'Library/Caches/ms-playwright'), alt = join(homedir(), '.cache/ms-playwright');
  for (const dir of [base, alt]){
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir).filter(n => n.startsWith('chromium_headless_shell')).sort().reverse()){
      for (const p of ['chrome-mac/headless_shell', 'chrome-mac-arm64/chrome-headless-shell', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell']){
        if (existsSync(join(dir, d, p))) return join(dir, d, p);
      }
    }
  }
  throw new Error('No Chromium found: set CHROMIUM_PATH');
}

// Camera framings around a figure standing at the origin, facing the camera at turn 0.
const CAM = {
  full:[[0, 1.05, 3.6], [0, 1.0, 0], 38],
  head:[[0, 1.82, 0.95], [0, 1.78, 0], 30],
  hands:[[0.35, 0.95, 0.9], [0.2, 0.9, 0], 30]
};
const SETS = {
  // each creator tab as a player sees it
  tabs:async (p, shot) => {
    await p.evaluate(() => __vr3dDebug.start()); await p.waitForTimeout(1200);
    for (const t of ['body', 'face', 'hair', 'clothes']){ await p.evaluate(t => __vr3dDebug.tab(t), t); await p.waitForTimeout(1300); await shot(`tab-${t}`, true); }
  },
  // the default figure from four sides and in every pose
  poses:async (p, shot) => {
    await p.evaluate(() => __vr3dDebug.start()); await p.waitForTimeout(800);
    await p.evaluate(() => { document.getElementById('creator').style.display = 'none'; });
    for (const [name, turn] of [['front', 0], ['three4', 0.8], ['side', Math.PI / 2], ['back', Math.PI]]){
      await setView(p, 'reset', 0, turn, CAM.full); await shot(`stand-${name}`);
    }
    for (const [pose, ph] of [['run', 0], ['run', 1.57], ['run', 3.14], ['jump', 0], ['slide', 0], ['ready', 0], ['cheer', 0], ['sit', 0]]){
      await setView(p, pose, ph, 0.9, CAM.full); await shot(`pose-${pose}${ph ? '-' + ph : ''}`);
    }
    await setView(p, 'reset', 0, 0.3, CAM.head); await shot('head');
    await setView(p, 'reset', 0, 0.5, CAM.hands); await shot('hands');
  },
  // every hair style with the helmet off (Hår tab) and on, and every beard
  styles:async (p, shot) => {
    await p.evaluate(() => __vr3dDebug.start()); await p.waitForTimeout(800);
    await p.evaluate(() => { document.getElementById('creator').style.display = 'none'; });
    const setAndWait = async c => { await p.evaluate(c => { window.__prevFig = __vr3dDebug.player(); __vr3dDebug.setChar(c); }, c); await p.waitForFunction(() => __vr3dDebug.player() !== window.__prevFig || window.__prevFig.ready === undefined, null, { timeout:60000 }).catch(() => {}); await p.waitForTimeout(400); };
    for (const style of ['short', 'buzz', 'long', 'ponytail', 'bun', 'braids', 'curly', 'afro', 'bald']){
      await setAndWait({ hairStyle:style, facial:'none' });
      for (const [tab, label] of [['hair', 'off'], ['body', 'on']]){
        await p.evaluate(t => __vr3dDebug.tab(t), tab);
        await setView(p, 'reset', 0, 0.75, CAM.head); await shot(`hair-${style}-${label}`);
      }
      await setView(p, 'reset', 0, Math.PI - 0.5, [[0, 1.65, 1.2], [0, 1.62, 0], 34]); await shot(`hair-${style}-back`);
    }
    await p.evaluate(() => __vr3dDebug.tab('face'));
    for (const facial of ['stubble', 'mustache', 'goatee', 'mustacheGoatee', 'boxed', 'full', 'long']){
      await setAndWait({ hairStyle:'short', facial });
      await setView(p, 'reset', 0, 0.45, CAM.head); await shot(`beard-${facial}`);
    }
  },
  // a spread of option combinations, front-on
  matrix:async (p, shot) => {
    await p.evaluate(() => __vr3dDebug.start()); await p.waitForTimeout(800);
    await p.evaluate(() => { document.getElementById('creator').style.display = 'none'; });
    const combos = [
      { gender:'male', build:'slim' }, { gender:'male', build:'sturdy' }, { gender:'female', build:'slim' }, { gender:'female', build:'sturdy' },
      { sleeves:'short', gloves:'off' }, { gender:'female', sleeves:'short', gloves:'off', hairStyle:'braids' },
      { hairStyle:'afro', skin:'#55351F' }, { facial:'long', hairStyle:'buzz' }
    ];
    for (const [i, c] of combos.entries()){
      await p.evaluate(c => __vr3dDebug.setChar(c), c); await waitFigure(p);
      await setView(p, 'reset', 0, 0.35, CAM.full); await shot(`combo-${i}-${Object.values(c).join('-').replace(/#/g, '')}`);
      await p.evaluate(() => __vr3dDebug.setChar({ gender:'male', build:'average', sleeves:'long', gloves:'on', hairStyle:'short', facial:'none', skin:'#C99A76' }));
    }
  }
};
async function setView(p, pose, phase, turn, cam){
  await p.evaluate(([pose, phase, turn, cam]) => { __vr3dDebug.pose(pose, phase, turn); __vr3dDebug.cam(...cam); }, [pose, phase, turn, cam]);
  await p.waitForTimeout(450);
}
// Resolves once the figure is built: immediate for the legacy figure, after the worker for the generated one.
async function waitFigure(p){ await p.waitForFunction(() => { const f = __vr3dDebug.player(); return f && f.root && f.root.visible !== false && (f.ready === undefined || f.ready); }, null, { timeout:60000 }); await p.waitForTimeout(300); }

const sets = process.argv.slice(2).filter(a => !a.startsWith('-'));
const run = sets.length ? sets : Object.keys(SETS);
const query = (process.argv.find(a => a.startsWith('--query=')) || '').slice(8);
mkdirSync(OUT, { recursive:true });
const server = await createServer({ server:{ port:0 }, logLevel:'error' });
await server.listen();
const url = server.resolvedUrls.local[0] + '?debug' + (query ? '&' + query : '');
const browser = await chromium.launch({ executablePath:findChromium(), args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;
try {
  for (const set of run){
    if (!SETS[set]){ console.error('unknown set', set); failed = true; continue; }
    const ctx = await browser.newContext({ viewport:{ width:1280, height:800 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(url, { waitUntil:'networkidle' });
    await p.waitForFunction(() => window.__vr3dDebug, null, { timeout:20000 });
    await waitFigure(p);
    const stage = await p.locator('canvas#game').boundingBox();
    const shot = async (name, full) => {
      const clip = full ? stage : { x:stage.x + stage.width / 2 - 300, y:stage.y, width:600, height:stage.height };
      await p.screenshot({ path:join(OUT, `${set}-${name}.png`), clip });
    };
    await SETS[set](p, shot);
    if (errs.length){ failed = true; console.error(set, 'page errors:', errs); }
    console.log(set, 'done');
    await ctx.close();
  }
} finally {
  await browser.close(); await server.close();
}
process.exit(failed ? 1 : 0);
