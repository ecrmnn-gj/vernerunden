// Character creator: options, preview and saving. Every start and restart goes through it.
import { $, canvas } from '../core/utils.js';
import { P } from '../core/palette.js';
import { state, setState } from '../game/state.js';
import { ensureAudio, stopMusic } from '../audio/audio.js';
import { sfxPickup } from '../audio/sfx.js';
import { CHAR_OPTS, CHAR_DEFAULT, charSaved, char, setChar, saveChar, sameChar, randomChar, buildPlayer } from '../characters/player.js';
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
  fs.append(lg, row); crGroups.appendChild(fs);
}
function syncCreatorUi(){ for (const k in CHAR_OPTS) for (const inp of creatorEl.querySelectorAll(`input[name="cr-${k}"]`)) inp.checked = inp.value === char[k]; }
function charChanged(){
  buildPlayer(); crFx.hop = 0.5;
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
  newGame(); setState('create'); crFx.spin = 0;
  $('crCancel').hidden = !charSaved;
  syncCreatorUi(); syncStartUi();
  crGroups.scrollTop = 0;
  const first = creatorEl.querySelector('input:checked'); if (first) first.focus({ preventScroll:true });
}
function closeCreator(){
  setState('start'); syncStartUi();
  $('startBtn2').focus({ preventScroll:true });
}
export function cancelCreator(){
  if (crBackup && !sameChar(crBackup, char)){ setChar(crBackup); buildPlayer(); }
  closeCreator();
}
function saveAndStart(){
  saveChar();
  startGame();
}
creatorEl.addEventListener('change', e => {
  const t = e.target;
  if (!t.name || !t.name.startsWith('cr-')) return;
  char[t.name.slice(3)] = t.value; charChanged();
});
creatorEl.addEventListener('submit', e => { e.preventDefault(); saveAndStart(); });
$('crRandom').addEventListener('click', () => { let c; do { c = randomChar(); } while (sameChar(c, char)); setChar(c); syncCreatorUi(); charChanged(); });
$('crNew').addEventListener('click', () => { setChar(Object.assign({}, CHAR_DEFAULT)); syncCreatorUi(); charChanged(); });
$('crCancel').addEventListener('click', cancelCreator);
// drag the figure to turn it
canvas.addEventListener('pointerdown', e => { if (state === 'create'){ crFx.drag = { x:e.clientX }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } });
window.addEventListener('pointermove', e => { if (crFx.drag && state === 'create'){ crFx.spin += (e.clientX - crFx.drag.x) * 0.012; crFx.drag.x = e.clientX; } });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => { crFx.drag = null; });
