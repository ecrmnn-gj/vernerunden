// Character creator: options, preview and saving. Every start and restart goes through it.
import { $, canvas } from '../core/utils.js';
import { P } from '../core/palette.js';
import { state, setState } from '../game/state.js';
import { ensureAudio, stopMusic } from '../audio/audio.js';
import { sfxPickup } from '../audio/sfx.js';
import { CHAR_OPTS, CHAR_TABS, HEAD_TABS, CHAR_DEFAULT, charSaved, char, setChar, saveChar, sameChar, randomChar, isShapeKey, buildPlayer, applyCharColours, setHelmet } from '../characters/player.js';
import { fxCol, sparkle } from '../render/particles.js';
import { newGame } from '../game/run.js';
import { overModal, startModal, startGame } from '../game/flow.js';
import { crFx } from '../render/frame.js';
import { cdEl, pauseEl } from './overlays.js';
import { creatorEl, crGroups, syncStartUi } from './menus.js';

// Every start and restart opens the creator first; starting from inside it saves the figure and runs.
export function requestStart(){
  if (state === 'create') saveAndStart();
  else openCreator();
}
let crBackup = null;
// One tab per part of the figure (Kropp, Ansikt, Hår, Klær), each a panel of chip and swatch groups.
const tabsEl = $('crTabs'), tabBtns = {}, panels = {};
let crTab = 'body';
for (const [id, label] of CHAR_TABS){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'cr-tab'; b.id = 'crTab-' + id; b.textContent = label;
  b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'crPanel-' + id);
  b.addEventListener('click', () => selectTab(id, true));
  tabsEl.appendChild(b); tabBtns[id] = b;
  const pn = document.createElement('div'); pn.className = 'cr-panel'; pn.id = 'crPanel-' + id;
  pn.setAttribute('role', 'tabpanel'); pn.setAttribute('aria-labelledby', b.id);
  crGroups.appendChild(pn); panels[id] = pn;
}
// arrow keys move between tabs, as in any tab list
tabsEl.addEventListener('keydown', e => {
  const ids = CHAR_TABS.map(([id]) => id), i = ids.indexOf(crTab);
  const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : -1;
  if (j < 0 && e.key !== 'ArrowLeft') return;
  e.preventDefault(); selectTab(ids[(j + ids.length) % ids.length], true); tabBtns[crTab].focus();
});
for (const [key, def] of Object.entries(CHAR_OPTS)){
  const fs = document.createElement('fieldset'); fs.className = 'cr-group';
  const lg = document.createElement('legend'); lg.textContent = def.label;
  const row = document.createElement('div'); row.className = 'cr-opts';
  for (const [v, label] of def.opts){
    const lab = document.createElement('label'); lab.className = 'cr-opt ' + (def.type === 'swatch' ? 'cr-sw' : 'cr-chip');
    const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'cr-' + key; inp.value = v;
    const vis = document.createElement('span');
    if (def.type === 'swatch'){ vis.className = 'dot'; vis.style.setProperty('--c', v === 'green' ? 'var(--green)' : v); lab.title = label; inp.setAttribute('aria-label', label); }
    else vis.textContent = label;
    lab.append(inp, vis); row.appendChild(lab);
  }
  fs.append(lg, row); panels[def.tab].appendChild(fs);
}
// The camera frames the head for Ansikt and Hår, and the helmet comes off there so the face and hair show.
export function selectTab(id, user){
  if (!panels[id]) return;
  crTab = id; crFx.view = HEAD_TABS.has(id) ? 'head' : 'body';
  for (const [t] of CHAR_TABS){ const on = t === id; tabBtns[t].setAttribute('aria-selected', String(on)); tabBtns[t].tabIndex = on ? 0 : -1; panels[t].hidden = !on; }
  if (state === 'create') setHelmet(!HEAD_TABS.has(id));
  if (user) crGroups.scrollTop = 0;
}
selectTab('body');
export function syncCreatorUi(){ for (const k in CHAR_OPTS) for (const inp of creatorEl.querySelectorAll(`input[name="cr-${k}"]`)) inp.checked = inp.value === char[k]; }
// A colour change only recolours; a shape change (or several options at once) rebuilds the figure.
function charChanged(key){
  if (key && !isShapeKey(key)) applyCharColours(); else buildPlayer();
  crFx.hop = 0.5;
  sparkle(0, 1.95, 0, 16, fxCol(P.yellow, 3), 2.2); sfxPickup();
}
// A shift in progress is abandoned, as a restart always did.
const RUNNING = new Set(['countdown', 'playing', 'paused', 'loading', 'ending']);
function openCreator(){
  if (state === 'create') return;
  if (RUNNING.has(state)){ stopMusic(); pauseEl.classList.remove('show'); cdEl.classList.remove('show'); }
  ensureAudio();
  startModal.hidden = true; overModal.hidden = true;
  crBackup = Object.assign({}, char);
  newGame(); setState('create'); crFx.spin = 0; selectTab(crTab);
  $('crCancel').hidden = !charSaved;
  syncCreatorUi(); syncStartUi();
  crGroups.scrollTop = 0;
  const first = creatorEl.querySelector('input:checked'); if (first) first.focus({ preventScroll:true });
}
function closeCreator(){
  setState('start'); setHelmet(true); syncStartUi();
  $('startBtn2').focus({ preventScroll:true });
}
export function cancelCreator(){
  const changed = crBackup && !sameChar(crBackup, char);
  if (changed) setChar(crBackup);
  closeCreator();
  if (changed) buildPlayer();
}
function saveAndStart(){
  saveChar(); setHelmet(true);
  startGame();
}
creatorEl.addEventListener('change', e => {
  const t = e.target;
  if (!t.name || !t.name.startsWith('cr-')) return;
  const key = t.name.slice(3);
  char[key] = t.value; charChanged(key);
});
creatorEl.addEventListener('submit', e => { e.preventDefault(); saveAndStart(); });
$('crRandom').addEventListener('click', () => { let c; do { c = randomChar(); } while (sameChar(c, char)); setChar(c); syncCreatorUi(); charChanged(); });
$('crNew').addEventListener('click', () => { setChar(Object.assign({}, CHAR_DEFAULT)); syncCreatorUi(); charChanged(); });
$('crCancel').addEventListener('click', cancelCreator);
// drag the figure to turn it
canvas.addEventListener('pointerdown', e => { if (state === 'create'){ crFx.drag = { x:e.clientX }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } });
window.addEventListener('pointermove', e => { if (crFx.drag && state === 'create'){ crFx.spin += (e.clientX - crFx.drag.x) * 0.012; crFx.drag.x = e.clientX; } });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => { crFx.drag = null; });
