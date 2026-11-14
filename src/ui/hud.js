// The in-stage HUD: open-avvik slots, gear chips and distance.
import { $, fmtM } from '../core/utils.js';
import { g } from '../game/state.js';
import { MAX_OPEN } from '../game/content.js';

const slotsEl = $('slots'), hudMeters = $('hudMeters');
const chips = { briller:$('chipBriller'), kurs:$('chipKurs') };
for (let i = 0; i < MAX_OPEN; i++) slotsEl.appendChild(document.createElement('i'));
let lastHud = {};
export function updateHud(force){
  if (force) lastHud = {};
  const m = Math.floor(g.dist);
  if (m !== lastHud.m){ hudMeters.textContent = fmtM(m); lastHud.m = m; }
  if (g.tail.length !== lastHud.n){ [...slotsEl.children].forEach((el, i) => el.classList.toggle('on', i < g.tail.length)); lastHud.n = g.tail.length; }
  for (const k in chips){ const on = g[k] > 0; if (on !== lastHud[k]){ chips[k].classList.toggle('on', on); lastHud[k] = on; } }
}
