// Draws a frame: player pose, animated props, camera, HUD overlays and post-processing.
import * as THREE from 'three';
import { reduceMotion, rand, clamp } from '../core/utils.js';
import { P } from '../core/palette.js';
import { g, state } from '../game/state.js';
import { renderer, scene, camera, FOG } from './renderer.js';
import { _v2, _v3 } from '../core/scratch.js';
import { skyU, skyMesh } from './sky.js';
import { post } from './post.js';
import { laneX } from '../world/layout.js';
import { TEX } from '../textures/procedural.js';
import { DIRT_TILE, GROUND_TILE } from '../textures/ground.js';
import { updateFence } from '../world/ground.js';
import { scenery } from '../world/scenery.js';
import { craneLights, cranes } from '../world/cranes.js';
import { poseReset, poseRun, poseJump, poseSlide, poseReady } from '../characters/poses.js';
import { player, playerMats, playerRainbow, setPlayerRainbow, tags } from '../characters/player.js';
import { FX, updateSpeedLines } from './particles.js';
import { loadEl, loadFill, loadText, superEl, superFill, superLeft, noiseEl, warnEl, wrongEl, tickOverlays } from '../ui/overlays.js';
import { superOn } from '../game/outcomes.js';
import { fogTarget } from '../game/events.js';
import { stageH, stageW } from '../ui/layout.js';

export const camPos = new THREE.Vector3(0, 2.75, 5.3), camLook = new THREE.Vector3(0, 1.15, -12);
// creator view: crBlend eases the camera between the running view and a front-on portrait of the player
let crBlend = 0, camFov = 60;
export const crFx = { hop:0, spin:0, drag:null };
export function render(time, dt){
  // player pose
  const pr = player.root;
  pr.position.set(g.x, g.y, 0);
  const sliding = g.slideT > 0 && g.onGround;
  pr.rotation.y = 0;
  if (state === 'create'){
    // idle on a turntable: breathing, glancing around, a little hop and cheer when something changes
    poseReset(player); pr.rotation.z = 0;
    const br = Math.sin(time * 2.2);
    player.body.position.y = 0.97 + br * 0.006; player.shL.rotation.z = -0.1 - br * 0.02; player.shR.rotation.z = 0.1 + br * 0.02;
    player.head.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.7) * 0.18;
    if (crFx.hop > 0){
      crFx.hop = Math.max(0, crFx.hop - dt); const k = Math.sin((1 - crFx.hop / 0.5) * Math.PI);
      if (!reduceMotion) pr.position.y = k * 0.22;
      player.shL.rotation.z = -0.1 - k * 2.4; player.shR.rotation.z = 0.1 + k * 2.4; player.elL.rotation.x = player.elR.rotation.x = 0.15 + k * 0.4;
    }
    pr.rotation.y = Math.PI + crFx.spin + (reduceMotion || crFx.drag ? 0 : Math.sin(time * 0.45) * 0.45);
  } else if (state === 'playing' || state === 'countdown' || state === 'start' || state === 'paused' || state === 'loading'){
    if (state === 'start') poseReset(player);
    else if (state === 'countdown') poseReady(player);
    else if (sliding) poseSlide(player);
    else if (!g.onGround){ if (state !== 'loading' && state !== 'paused'){ poseJump(player); if (g.flip > 0 && !reduceMotion) player.body.rotation.x -= Math.PI * 2 * (1 - g.flip / 0.5); } }
    else if (state !== 'loading' && state !== 'paused'){ poseRun(player, g.phase, 0.95); if (g.stumble > 0) player.body.rotation.x = -0.55; }
    pr.rotation.z = (g.x - laneX(g.lane)) * 0.08;
  } else if (g && g.caught){ poseReset(player); player.body.rotation.x = 0.08; }
  if (player.pony){
    // the ponytail swings with the stride and flies up in jumps
    const run = state === 'playing' && g.onGround && g.slideT <= 0, air = (state === 'playing' || state === 'ending') && !g.onGround;
    const sw = reduceMotion ? 0 : Math.sin(g.phase);
    player.pony.rotation.x = -0.45 - (run ? Math.abs(sw) * 0.35 + 0.25 : 0) - (air ? 0.7 : 0);
    player.pony.rotation.z = run ? sw * 0.28 : Math.sin(time * 1.3) * 0.05;
  }
  // avvik tags dangling behind
  for (let i = 0; i < tags.length; i++){
    const t = tags[i], on = g && i < g.tail.length;
    t.visible = !!on && !(g.fell && g.y < -1);
    if (on){ const sw = Math.sin(time * 9 + i) * 0.06; t.position.set(g.x + 0.12 + sw, g.y + 0.85 - i * 0.05 + (sliding ? -0.4 : 0), 0.3 + i * 0.24); t.rotation.set(0.2, 0, sw * 3); }
  }
  // super glow and blinking
  const sup = g && superOn();
  if (sup){
    const hue = (time * (reduceMotion ? 0.4 : 2.6)) % 1, k = reduceMotion ? 0.5 : 0.45 + 0.35 * Math.abs(Math.sin(time * 16));
    playerMats.forEach((m, i) => { m.emissive.setHSL((hue + i * 0.035) % 1, 1, 0.5); m.emissiveIntensity = k; });
    setPlayerRainbow(true);
    if (state === 'playing' && !reduceMotion) for (let i = 0; i < 2; i++) FX.spark.emit(g.x + rand(-0.3, 0.3), g.y + rand(0.3, 1.7), rand(0.1, 0.4), rand(-0.5, 0.5), rand(-0.2, 0.6), rand(2, 5), { color:new THREE.Color().setHSL((hue + rand(0, 0.3)) % 1, 1, 0.6).multiplyScalar(3), life:rand(0.3, 0.6), size:rand(0.06, 0.12), scroll:0.3 });
  } else if (playerRainbow){ for (const m of playerMats){ m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.i0; } setPlayerRainbow(false); }

  pr.visible = !(g && g.invuln > 0 && state === 'playing' && Math.floor(g.invuln * 12) % 2 === 0);
  // pickups spin and bob
  for (const p of g.pickups){
    p.mesh.userData.spin.rotation.y = reduceMotion ? 0 : time * 2.6 + p.seed; p.mesh.position.set(p.x, p.y + Math.sin(time * 3 + p.seed) * 0.08, p.z);
    const ud = p.mesh.userData, near = clamp((-p.z - 1) / 7, 0, 1);
    if (ud.glow) ud.glow.material.opacity = ud.glow.userData.base * near * (0.85 + 0.15 * Math.sin(time * 5 + p.seed));
    const gy = 0.025 - p.mesh.position.y;
    ud.shadow.position.y = gy; ud.shadow.material.opacity = 0.5 * clamp(1.6 - p.y * 0.4, 0.3, 1);
    if (ud.ring){ ud.ring.position.y = gy + 0.005; const pulse = (time * 0.9 + p.seed) % 1; ud.ring.scale.setScalar(0.6 + pulse * 1.4); ud.ring.material.opacity = 0.55 * (1 - pulse) * near; }
  }
  for (const o of g.obstacles){
    o.mesh.position.set(o.x, o.fly ? o.fly.y : 0, o.z);
    if (o.mesh.userData.beams) for (const b of o.mesh.userData.beams) b.visible = o.z < -14;
  }
  for (const s of scenery) if (s.userData.beam) s.userData.beam.visible = s.position.z < -9;
  craneLights.forEach(l => l.visible = Math.floor(time * 1.4) % 2 === 0);
  for (const c of cranes) c.userData.slew.rotation.y = Math.sin(time * 0.06 + c.userData.slewPhase) * 0.9;

  // fog: dust from the saw
  for (const d of g.dust){ d.sp.position.set(d.x, d.y, d.z); d.sp.material.opacity = d.base * clamp((4 - d.z) / 7, 0, 1) * (g.briller > 0 ? 0.12 : 1); }
  const dustOn = false;
  const tn = dustOn ? 6 : FOG.near, tf = dustOn ? 30 : FOG.far;
  g.fogNear += (tn - g.fogNear) * Math.min(1, dt * 3); g.fogFar += (tf - g.fogFar) * Math.min(1, dt * 3);
  scene.fog.near = g.fogNear; scene.fog.far = g.fogFar;
  fogTarget.set(dustOn ? P.dust : P.fog); scene.fog.color.lerp(fogTarget, Math.min(1, dt * 2.5));

  // ground, gravel and fence scroll with the run; clouds drift and slide slowly overhead
  const gOff = (g.dist / GROUND_TILE) % 1, dOff = (g.dist / DIRT_TILE) % 1;
  TEX.ground.offset.y = TEX.groundN.offset.y = TEX.groundR.offset.y = gOff;
  TEX.dirt.offset.y = TEX.dirtN.offset.y = TEX.dirtR.offset.y = dOff;
  updateFence(g.dist);
  skyU.uCloud.value.set(time * 0.006, -g.dist * 0.0009 - time * 0.002);

  // camera
  const noiseOn = g.ev && g.ev.type === 'noise' && g.ev.warn <= 0 && g.ore <= 0;
  let sh = g.shake * 1.2 + (noiseOn ? 0.09 : 0); if (reduceMotion) sh = 0;
  let cy = 2.75 + g.y * 0.3, cz = 5.3, lookY = 1.15 + g.y * 0.35;
  if (g.fell){ cy = 3.6; lookY = Math.max(-2, g.y); }
  crBlend += ((state === 'create' ? 1 : 0) - crBlend) * Math.min(1, dt * 3.5);
  const cb = crBlend * crBlend * (3 - 2 * crBlend), portrait = stageW < 640;
  camPos.set(g.x * 0.6, cy, cz);
  if (state === 'start' && !reduceMotion) camPos.add(_v3.set(Math.sin(time * 0.35) * 0.9, Math.sin(time * 0.23) * 0.15, 0));
  if (cb > 0.0005) camPos.lerp(_v3.set(0, portrait ? 1.4 : 1.5, portrait ? 4.6 : 2.7), cb);
  camera.position.lerp(camPos, Math.min(1, dt * 8)); skyMesh.position.copy(camera.position);
  camera.position.x += rand(-sh, sh); camera.position.y += rand(-sh, sh) * 0.7;
  camLook.set(g.x * 0.75, lookY, -12);
  if (cb > 0.0005) camLook.lerp(_v3.set(0, portrait ? 1.2 : 1.27, 0), cb);
  camera.lookAt(camLook);
  const tfov = (sup ? 74 : 60) * (1 - cb) + 38 * cb; camFov += (tfov - camFov) * Math.min(1, dt * 4);
  if (Math.abs(camera.fov - camFov) > 0.05){ camera.fov = camFov; camera.updateProjectionMatrix(); }
  // shift the frame so the figure sits beside the creator panel (left of it on wide screens, above it on narrow ones)
  if (cb > 0.001) camera.setViewOffset(stageW, stageH, portrait ? 0 : 0.21 * stageW * cb, portrait ? 0.21 * stageH * cb : 0, stageW, stageH);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  // effects
  const pxScale = renderer.getDrawingBufferSize(_v2).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  FX.dust.mat.uniforms.uScale.value = FX.spark.mat.uniforms.uScale.value = pxScale;
  const boostK = clamp((g.boostF - 1) / 0.75, 0, 1);
  updateSpeedLines(dt, boostK);
  post.bloom = 0.55 + boostK * 0.35; post.zoom = boostK * 0.1; post.aberr = 0.0011 + boostK * 0.005 + g.shake * 0.02;
  post.render(time);

  // overlays
  tickOverlays(dt);
  noiseEl.classList.toggle('show', !!(g.ev && g.ev.type === 'noise' && g.ev.warn <= 0));
  noiseEl.classList.toggle('calm', g.ore > 0); noiseEl.textContent = g.ore > 0 ? 'brrt' : 'BRRRRRRT';
  warnEl.classList.toggle('show', !!(g.ev && g.ev.warn > 0));
  const loading = g.boost && g.boost.phase === 'loading' && g.boost.t >= 1.0;
  loadEl.classList.toggle('show', !!loading);
  if (loading){ const pr2 = clamp((g.boost.t - 1.0) / 0.85, 0, 1), e = pr2 < 0.5 ? 2 * pr2 * pr2 : 1 - Math.pow(-2 * pr2 + 2, 2) / 2; loadFill.style.width = (e * 100).toFixed(1) + '%'; loadText.textContent = 'Installerer superhastighet … ' + Math.round(e * 100) + ' %'; }
  superEl.classList.toggle('show', !!sup);
  if (sup){ const left = g.boost.phase === 'super' ? g.boost.left : 0; superLeft.textContent = Math.ceil(left) + ' s'; superFill.style.width = clamp(left / 10, 0, 1) * 100 + '%'; }
  wrongEl.classList.toggle('show', !!g.wrongApp && (state === 'playing' || state === 'ending'));
  if (g.wrongApp) wrongEl.textContent = 'Lastet ned feil app: avvik teller dobbelt';
}
