// Text and effects over the stage: captions, pop text and flashes.
import { $, rand } from '../core/utils.js';
import { g } from '../game/state.js';

export const capEl = $('caption'), popEl = $('pop'), popMain = $('popMain'), popSub = $('popSub'), cdEl = $('countdown');
export const loadEl = $('loadbar'), loadFill = $('loadFill'), loadText = $('loadText'), superEl = $('superbar'), superLeft = $('superLeft'), superFill = $('superFill');
export const wrongEl = $('wrongPill'), noiseEl = $('noiseTxt'), warnEl = $('warnTri'), flashEl = $('flash'), pauseEl = $('pauseBox');
let capT = 0, popT = 0;
export function caption(text, color, life){ capEl.textContent = text; capEl.style.setProperty('--cc', `var(--${color || 'yellow'})`); capEl.classList.add('show'); capT = life || 2.6; }
export function pop(text, color, life, sub){
  popEl.style.setProperty('--pc', `var(--${color || 'yellow'})`);
  popEl.style.setProperty('--tilt', (rand(-4, 3)).toFixed(1) + 'deg');
  const lines = text.split('\n'), maxLen = Math.max(...lines.map(l => l.length));
  popMain.style.fontSize = `clamp(26.5px, ${Math.min(8.8, 132 / maxLen).toFixed(2)}cqw, 102px)`;
  popMain.replaceChildren(...lines.map(l => { const d = document.createElement('div'); d.textContent = l; return d; }));
  popSub.textContent = sub || '';
  popEl.classList.remove('show'); void popEl.offsetWidth; popEl.classList.add('show');
  popT = life || 1;
}
function flash(color, strength){
  flashEl.style.setProperty('--fc', `var(--${color})`);
  return;
}
export function tickOverlays(dt){
  if (capT > 0){ capT -= dt; if (capT <= 0) capEl.classList.remove('show'); }
  if (popT > 0){ popT -= dt; if (popT <= 0) popEl.classList.remove('show'); }
}
export function boom(color, f, shake){ flash(color, f); g.shake = Math.max(g.shake, shake); }
