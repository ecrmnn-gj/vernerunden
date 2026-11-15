// Game flow: start, countdown, pause and the end-of-shift report.
import { $, fmtM, store } from '../core/utils.js';
import { g, state, localBest, remoteBest, setState, setOverAt, setLocalBest } from './state.js';
import { ensureAudio, startMusic, stopMusic } from '../audio/audio.js';
import { sfxBeep } from '../audio/sfx.js';
import { OBS } from './content.js';
import { newGame } from './run.js';
import { cdEl, pauseEl } from '../ui/overlays.js';
import { db, setLastRun, nameInput, saveBtn, saveMsg, renderLocalBoard, loadBoard } from '../services/leaderboard.js';

export const startModal = $('startModal'), overModal = $('overModal');
export function startGame(){
  ensureAudio(); newGame(); setState('countdown'); g.cd = 2.1; showCount(3);
  startModal.hidden = true; overModal.hidden = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  sfxBeep(false);
}
export function showCount(n){ cdEl.textContent = String(n); cdEl.classList.remove('show'); void cdEl.offsetWidth; cdEl.classList.add('show'); }
export function pause(){ if (state === 'playing'){ setState('paused'); stopMusic(); pauseEl.classList.add('show'); } }
export function resume(){ if (state === 'paused'){ setState('playing'); startMusic(); pauseEl.classList.remove('show'); } }

const OBS_DONE = new Set(['hull', 'grop', 'tilsyn']);
export async function showGameOver(){
  setState('over'); setOverAt(performance.now()); stopMusic();
  const m = Math.floor(g.dist);
  g.streak = Math.max(g.streak, m - g.lastAvvikM);
  $('stMeters').textContent = fmtM(m);
  $('stTime').textContent = Math.floor(g.t / 60) + ':' + String(Math.floor(g.t % 60)).padStart(2, '0');
  $('stApps').textContent = String(g.apps);
  $('stStreak').textContent = fmtM(g.streak);
  $('stTotal').textContent = String(g.total);
  $('stClosed').textContent = String(g.closed);
  $('overQuote').textContent = g.caught ? '«Hei! Har du et øyeblikk?»' : g.fell ? '«Er det noen som ser verneombudet?»' : '«Vi tar en prat i brakka.»';
  $('overTitle').textContent = g.caught ? 'Pålegg' : 'Avviksrapport';
  $('stamp').textContent = g.caught ? 'Stoppet av tilsynet' : 'Arbeidet stanset';
  const ol = $('findings'); ol.replaceChildren();
  const add = (title, tiltak) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = title; const s = document.createElement('span'); s.textContent = 'Tiltak: ' + tiltak; li.append(b, s); ol.appendChild(li); };
  if (g.caught) add('Vernerunden ble stoppet av Arbeidstilsynet', 'Les gjennom permen med avvik, og svar på pålegget innen tre uker.');
  if (g.fell && g.fellGrop) add('Verneombudet falt ned i en usikret byggegrop', 'Sett opp rekkverk rundt byggegropa, og hent verneombudet opp.');
  else if (g.fell) add('Verneombudet falt ned i et usikret hull i dekket', 'Hent verneombudet opp. Dekk deretter til og merk hullet. En lapp med «pass på» er ikke merking.');
  if (g.rivals.length) add('Lastet ned feil app' + (g.rivals.length > 1 ? ` (${g.rivals.length} ganger)` : ''), 'Avinstaller, og last ned Grønn Jobb-appen.');
  Object.entries(g.counts).filter(([k]) => !OBS_DONE.has(k)).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => add(OBS[k].label + (n > 1 ? ` (${n} ganger)` : ''), OBS[k].tiltak));
  if (!ol.children.length) add('Ingen funn', 'Fortsett det gode arbeidet.');
  const rec = $('overRecord'), prev = Math.max(localBest, remoteBest);
  rec.textContent = (m > prev && m > 0) ? 'Ny personlig rekord!' : 'Din lengste vernerunde: ' + fmtM(prev) + '.';
  if (m > localBest){ setLocalBest(m); store.set('vr3d:best', localBest); }
  setLastRun({ meters:m, secs:Math.round(g.t), saved:false });
  saveBtn.disabled = !db || m <= 0;
  saveMsg.textContent = !db ? 'Topplisten er ikke tilgjengelig her, så resultatet kan ikke lagres.' : m <= 0 ? 'Gå minst én meter for å komme på listen.' : '';
  overModal.hidden = false;
  if (db && m > 0){ nameInput.focus({ preventScroll:true }); nameInput.select(); } else $('againBtn').focus({ preventScroll:true });
  if (!db) renderLocalBoard(); else if (typeof loadBoard === 'function') loadBoard();
}
