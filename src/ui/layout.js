// Stage sizing, the graphics quality button and fullscreen.
import { $, stage, store } from '../core/utils.js';
import { state } from '../game/state.js';
import { GFX_LABEL, coarse, gfxPref, gfxTier, Q, setGfxTier, setGfxPref } from '../core/quality.js';
import { renderer, camera, fitShadow } from '../render/renderer.js';
import { post } from '../render/post.js';

const gameEl = $('gameEl');
export let stageW = 1, stageH = 1;
export function resize(){
  const r = stage.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().dpr));
  renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
  stageW = Math.max(1, r.width); stageH = Math.max(1, r.height);
  camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  post.resize();
}
// graphics quality: a button cycles auto, high, medium and low; auto also steps down by itself if frames are slow
const gfxBtn = $('gfxBtn');
export function syncGfxBtn(){ gfxBtn.textContent = 'Grafikk: ' + (gfxPref === 'auto' ? `auto (${GFX_LABEL[gfxTier]})` : GFX_LABEL[gfxPref]); }
function setTier(t){ setGfxTier(t); post.setup(); fitShadow(); resize(); syncGfxBtn(); }
gfxBtn.addEventListener('click', () => {
  const order = ['auto', 'high', 'medium', 'low'];
  setGfxPref(order[(order.indexOf(gfxPref) + 1) % order.length]); store.set('vr3d:gfx', gfxPref);
  setTier(gfxPref === 'auto' ? (coarse ? 'medium' : 'high') : gfxPref);
});
const perf = { acc:0, n:0 };
export function watchPerf(rawDt){
  if (gfxPref !== 'auto' || state !== 'playing' || gfxTier === 'low' || document.hidden) { perf.acc = perf.n = 0; return; }
  perf.acc += Math.min(rawDt, 0.1); perf.n++;
  if (perf.n >= 150){ const avg = perf.acc / perf.n; perf.acc = perf.n = 0; if (avg > 1 / 40) setTier(gfxTier === 'high' ? 'medium' : 'low'); }
}
window.addEventListener('resize', resize);
const fsBtn = $('fsBtn'), fsExit = $('fsExit');
export const fsActive = () => gameEl.classList.contains('fs');
const nativeFs = () => document.fullscreenElement || document.webkitFullscreenElement;
function setFsClass(on){ gameEl.classList.toggle('fs', on); document.body.classList.toggle('fs-on', on); fsBtn.textContent = on ? 'Avslutt fullskjerm' : 'Fullskjerm'; requestAnimationFrame(resize); }
async function enterFs(){
  setFsClass(true);
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !nativeFs()){ try { await req.call(el, { navigationUI:'hide' }); } catch (e) {} }
}
export async function exitFs(){ setFsClass(false); const ex = document.exitFullscreen || document.webkitExitFullscreen; if (nativeFs() && ex){ try { await ex.call(document); } catch (e) {} } }
export function toggleFs(){ if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return fsActive() ? exitFs() : enterFs(); }
fsBtn.addEventListener('click', toggleFs);
fsExit.addEventListener('click', e => { e.stopPropagation(); exitFs(); });
const onFsChange = () => { if (!nativeFs() && fsActive()) setFsClass(false); else requestAnimationFrame(resize); };
document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);
