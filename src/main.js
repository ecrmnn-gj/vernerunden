// Entry point: boots the game and runs the frame loop.
//
// Many modules build part of the game while they load (renderer, textures, the world, the HUD), and later ones
// use what earlier ones built. The imports below are in that build order, so keep it when adding a module:
// a module that loads before something it uses at load time fails with "Cannot access ... before initialization".
// Calls made only at runtime (inside functions) can point in any direction.
import { $ } from './core/utils.js';
import './core/palette.js';
import { g, state, setState } from './game/state.js';
import { repaint } from './textures/canvas.js';
import { drawIconCanvases } from './textures/icons.js';
import { startMusic } from './audio/audio.js';
import { sfxBeep } from './audio/sfx.js';
import './core/quality.js';
import { camera } from './render/renderer.js';
import './core/scratch.js';
import './render/sky.js';
import { post } from './render/post.js';
import './world/layout.js';
import './render/materials.js';
import './textures/procedural.js';
import './textures/ground.js';
import './world/ground.js';
import './world/geometry.js';
import './world/scenery.js';
import { makeSignTextures } from './textures/signs.js';
import './world/props.js';
import './textures/facades.js';
import './world/buildings.js';
import './world/cranes.js';
import './world/roadside.js';
import { backTex } from './characters/human.js';
import './characters/poses.js';
import './characters/player.js';
import './game/content.js';
import './game/obstacles.js';
import './game/pickups.js';
import './render/particles.js';
import './ui/hud.js';
import { newGame } from './game/run.js';
import { cdEl, pop } from './ui/overlays.js';
import './game/spawning.js';
import './game/outcomes.js';
import './game/controls.js';
import './game/events.js';
import './services/leaderboard.js';
import { startModal, showCount } from './game/flow.js';
import { update, updateFx, updateEnding } from './game/update.js';
import { resize, syncGfxBtn, watchPerf } from './ui/layout.js';
import { camLook, camPos, render } from './render/frame.js';
import './ui/creator.js';
import { applyTheme } from './render/theme.js';
import { uiState, syncStartUi } from './ui/menus.js';
import './ui/input.js';
import './ui/debug.js';

window.__vr3d = true; // tells index.html the game loaded

// boot
post.setup();
newGame();
resize();
syncGfxBtn();
camera.position.copy(camPos); camera.lookAt(camLook);
drawIconCanvases();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawIconCanvases(); makeSignTextures(); if (backTex) repaint(backTex); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
new MutationObserver(applyTheme).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
applyTheme();

// frame loop
let last = performance.now();
function frame(now){
  if (uiState !== state + (startModal.hidden ? '' : '+rules')) syncStartUi();
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.033, raw); last = now;
  watchPerf(raw);
  if (g) g.lastDz = 0;
  if (state === 'playing' || state === 'loading') update(dt);
  else if (state === 'countdown'){
    const before = Math.ceil(g.cd / 0.7 - 0.001); g.cd -= dt; const after = Math.ceil(g.cd / 0.7 - 0.001);
    if (g.cd <= 0){ setState('playing'); cdEl.classList.remove('show'); pop('GÅ!', 'green', 0.8); sfxBeep(true); startMusic(); }
    else if (after !== before){ showCount(after); sfxBeep(false); }
  } else if (state === 'ending') updateEnding(dt);
  if (g) updateFx(dt);
  render(now / 1000, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => $('startBtn').focus({ preventScroll:true }), 60);
