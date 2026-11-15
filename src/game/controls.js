// Player actions: change lane, jump and slide.
import { clamp } from '../core/utils.js';
import { g, state } from './state.js';
import { tone } from '../audio/audio.js';
import { sfxJump, sfxSwish } from '../audio/sfx.js';
import { DJUMP_V, JUMP_V } from './run.js';

export function moveLane(d){ if (state !== 'playing') return; const nl = clamp(g.lane + d, -1, 1); if (nl !== g.lane){ g.lane = nl; sfxSwish(); } }
export function jump(){
  if (state !== 'playing') return;
  if (g.onGround){ g.vy = JUMP_V; g.onGround = false; g.jumps = 1; g.slideT = 0; sfxJump(); }
  else if (g.jumps < (g.kurs > 0 ? 3 : 2)){ g.vy = DJUMP_V; g.jumps++; g.flip = 0.5; sfxJump(); tone(520, 0.12, 'square', 0.04, 1040); }
}
export function slide(){
  if (state !== 'playing') return;
  if (!g.onGround){ g.vy = Math.min(g.vy, -18); g.slideQueued = true; }
  else { g.slideT = 0.75; sfxSwish(); }
}
