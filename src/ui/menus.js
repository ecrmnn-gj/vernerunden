// The start overlay and the rules card.
import { $, stage } from '../core/utils.js';
import { overAt, state } from '../game/state.js';
import { charSaved } from '../characters/player.js';
import { startModal, startGame, pause } from '../game/flow.js';
import { requestStart } from './creator.js';

$('startBtn').addEventListener('click', () => requestStart());
export const startOv = $('startOv'), playBtn = $('playBtn'), creatorEl = $('creator'), crGroups = $('crGroups'), charBtn = $('charBtn'), charBtn2 = $('charBtn2');
export let uiState = '';
export function syncStartUi(){
  startOv.hidden = !(state === 'start' && startModal.hidden);
  creatorEl.hidden = state !== 'create'; stage.classList.toggle('creating', state === 'create');
  charBtn.textContent = charSaved ? 'Endre figur' : 'Lag figur';
  playBtn.textContent = (state === 'playing' || state === 'paused' || state === 'countdown' || state === 'loading') ? 'Start på nytt' : 'Start spillet';
  uiState = state + (startModal.hidden ? '' : '+rules');
}
function openRules(){ if (state === 'playing') pause(); startModal.hidden = false; syncStartUi(); $('startBtn').focus({ preventScroll:true }); }
export function closeRules(){ startModal.hidden = true; syncStartUi(); if (state === 'start') $('startBtn2').focus({ preventScroll:true }); }
$('rulesClose').addEventListener('click', closeRules);
$('rulesBtn').addEventListener('click', openRules);
$('rulesBtn2').addEventListener('click', openRules);
$('startBtn2').addEventListener('click', () => requestStart());
playBtn.addEventListener('click', () => { playBtn.blur(); requestStart(); });
startModal.addEventListener('click', e => { if (e.target === startModal) closeRules(); });
$('againBtn').addEventListener('click', () => { if (performance.now() - overAt > 600) startGame(); });
