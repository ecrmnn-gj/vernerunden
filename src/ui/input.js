// Keyboard, swipe and tab-visibility input.
import { canvas } from '../core/utils.js';
import { overAt, state } from '../game/state.js';
import { ensureAudio } from '../audio/audio.js';
import { moveLane, jump, slide } from '../game/controls.js';
import { startModal, pause, resume } from '../game/flow.js';
import { fsActive, exitFs, toggleFs } from './layout.js';
import { requestStart, cancelCreator } from './creator.js';
import { closeRules } from './menus.js';

window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && !startModal.hidden){ e.preventDefault(); closeRules(); return; }
  if (e.code === 'Escape' && state === 'create'){ e.preventDefault(); cancelCreator(); return; }
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyF' && !e.repeat){ e.preventDefault(); toggleFs(); return; }
  if (e.code === 'Escape' && fsActive() && state !== 'playing' && state !== 'paused'){ exitFs(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape'){
    if (state === 'playing'){ pause(); e.preventDefault(); return; }
    if (state === 'paused'){ resume(); e.preventDefault(); return; }
  }
  const k = e.code;
  const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Enter'];
  if (!game.includes(k)) return;
  if (state === 'playing'){
    e.preventDefault(); if (e.repeat) return;
    if (k === 'ArrowLeft' || k === 'KeyA') moveLane(-1);
    else if (k === 'ArrowRight' || k === 'KeyD') moveLane(1);
    else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') jump();
    else if (k === 'ArrowDown' || k === 'KeyS') slide();
    return;
  }
  if (state === 'paused'){ e.preventDefault(); resume(); return; }
  if (state === 'countdown' || state === 'loading' || state === 'ending'){ e.preventDefault(); return; }
  if (e.target && e.target.tagName === 'BUTTON') return;
  if ((k === 'Space' || k === 'Enter') && (state === 'start' || (state === 'over' && performance.now() - overAt > 700))){ e.preventDefault(); requestStart(); }
});
let touch = null;
canvas.addEventListener('pointerdown', e => { ensureAudio(); touch = { x:e.clientX, y:e.clientY, t:performance.now() }; if (state === 'paused') resume(); });
window.addEventListener('pointerup', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch = null;
  if (state !== 'playing') return;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < 24 && ay < 24) jump();
  else if (ax > ay) moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) jump(); else slide();
});
window.addEventListener('pointercancel', () => { touch = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
