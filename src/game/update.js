// The per-frame simulation.
import { reduceMotion, rand, clamp, nf } from '../core/utils.js';
import { P } from '../core/palette.js';
import { g, state, localBest, remoteBest } from './state.js';
import { actx, noiseHit } from '../audio/audio.js';
import { sfxMult, sfxJack } from '../audio/sfx.js';
import { scene } from '../render/renderer.js';
import { LOOP, laneX } from '../world/layout.js';
import { disposeBaked } from '../world/geometry.js';
import { scenery } from '../world/scenery.js';
import { SKY_SPAN, skyline } from '../world/buildings.js';
import { poseReset, poseRun } from '../characters/poses.js';
import { player } from '../characters/player.js';
import { MILES, EVENTS } from './content.js';
import { FX, COL, fxN, puff } from '../render/particles.js';
import { updateHud } from '../ui/hud.js';
import { ACCEL, BASE_CAP, GRAV } from './run.js';
import { caption, pop, boom } from '../ui/overlays.js';
import { spawnRow, spawnPickup, spawnInspector } from './spawning.js';
import { addAvvik, fallIn, caught, knock, superOn, confetti, collect, updateBoost } from './outcomes.js';
import { spawnKappsag, spawnKids } from './events.js';
import { showGameOver } from './flow.js';

export function update(dt){
  g.shake = Math.max(0, g.shake - dt);
  if (g.hitstop > 0){ g.hitstop -= dt; return; }
  g.t += dt;
  g.base = Math.min(BASE_CAP, g.base + ACCEL * dt);
  updateBoost(dt);
  if (state === 'loading') return;
  g.speed = g.base * g.boostF;
  const sp = g.speed, dz = sp * dt; g.lastDz = dz;
  g.dist += dz;
  // milestones and record
  const bestM = Math.max(localBest, remoteBest);
  if (!g.recordShown && bestM > 0 && g.dist > bestM){ g.recordShown = true; pop('NY REKORD!', 'green', 1.3, 'Din lengste vernerunde hittil'); boom('green', 0.3, 0.1); sfxMult(); }
  else if (g.dist >= g.nextMile){ pop(nf.format(g.nextMile) + ' METER!', 'yellow', 1.0, MILES[g.nextMile] || 'Fortsatt på vernerunde'); boom('yellow', 0.2, 0.08); sfxMult(); }
  if (g.dist >= g.nextMile) g.nextMile += 250;

  // player motion
  const tx = laneX(g.lane);
  g.x += (tx - g.x) * Math.min(1, dt * 13);
  if (!g.onGround){
    g.vy -= GRAV * dt; g.y += g.vy * dt;
    if (g.y <= 0){ const hard = -g.vy; g.y = 0; g.vy = 0; g.onGround = true; g.jumps = 0; puff(g.x, 0.05, 0.1, clamp(hard * 0.8, 4, 14), 0.35, 0.45, 0.4, 1.2); if (g.slideQueued){ g.slideQueued = false; g.slideT = 0.7; } }
  }
  if (g.slideT > 0) g.slideT -= dt;
  g.phase += dt * Math.min(sp, 32) * 1.25;
  if (g.onGround){
    const step = Math.floor(g.phase / Math.PI);
    if (g.slideT > 0){ if (Math.random() < dt * 40) puff(g.x, 0.05, -0.3, 1, 0.3, 0.5, 0.4, 1.4); }
    else if (step !== g.lastStep){ g.lastStep = step; puff(g.x + (step % 2 ? 0.1 : -0.1), 0.04, 0.05, 2, 0.08, 0.28, 0.22, 0.6); }
  }
  for (const k of ['briller', 'ore', 'kurs']) if (g[k] > 0) g[k] = Math.max(0, g[k] - dt);
  if (g.invuln > 0) g.invuln -= dt;
  if (g.stumble > 0) g.stumble -= dt;
  if (g.flip > 0) g.flip = Math.max(0, g.flip - dt);
  if (g.onGround) g.flip = 0;

  // spawning
  while (g.dist + 112 >= g.nextRowAt){ spawnRow(-(g.nextRowAt - g.dist)); g.nextRowAt += rand(13, 21) + sp * 0.45 + (g.extraGap || 0); g.extraGap = 0; }
  g.hakeTimer -= dt; if (g.hakeTimer <= 0){ spawnPickup('lukk'); g.hakeTimer = rand(4, 6.5) * (1 + Math.min(0.8, g.t / 120)); }
  g.gearTimer -= dt; if (g.gearTimer <= 0){ spawnPickup(Math.random() < 0.45 ? 'kurs' : 'briller'); g.gearTimer = rand(10, 15); }
  g.appTimer -= dt; if (g.appTimer <= 0){ g.appTimer = spawnPickup('app') ? rand(34, 48) : 0.5; }
  g.rivalTimer -= dt; if (g.rivalTimer <= 0){ g.rivalTimer = (g.pickups.some(p => p.kind === 'app') || !spawnPickup('rival')) ? 1.5 : rand(12, 18); }
  g.tilsynTimer -= dt; if (g.tilsynTimer <= 0){ g.tilsynTimer = spawnInspector() ? rand(22, 34) : 0.6; }
  g.kidTimer -= dt; if (g.kidTimer <= 0){ spawnKids(); g.kidTimer = rand(22, 35); }

  // events
  if (!g.ev){
    g.evTimer -= dt;
    const gear = EVENTS[g.nextEv].gear;
    if (!g.evGearSpawned && g.evTimer < 3.2){ g.evGearSpawned = true; if (g[gear] < 6 && Math.random() < 0.65) spawnPickup(gear); }
    if (g.evTimer <= 0){ g.ev = { type:g.nextEv, warn:1.1, left:4.4 }; caption(EVENTS[g.nextEv].warn, 'orange', 2.2); if (g.ev.type === 'dust'){ spawnKappsag(); g.ev.left = 6; } }
  } else {
    if (g.ev.warn > 0) g.ev.warn -= dt;
    else {
      g.ev.left -= dt;
      if (g.ev.type === 'noise' && g.ore <= 0){ g.jackT = (g.jackT || 0) - dt; if (g.jackT <= 0){ sfxJack(); g.jackT = 0.065; } }
      if (g.ev.left <= 0){ g.ev = null; g.evTimer = rand(8, 12); g.nextEv = 'dust'; g.evGearSpawned = false; }
    }
  }

  // obstacles
  const sliding = g.slideT > 0 && g.onGround;
  const top = g.y + (sliding ? 0.95 : 1.8);
  for (const o of g.obstacles){
    const z0 = o.z; o.z += dz + o.vz * dt;
    if (o.fly){ o.fly.vy -= 20 * dt; o.fly.y += o.fly.vy * dt; o.x += o.fly.vx * dt; o.z += o.fly.vz * dt; o.mesh.rotation.x += o.fly.rx * dt; o.mesh.rotation.z += o.fly.rz * dt; }
    if (o.type === 'kappsag' && o.mesh.userData.blade){ o.mesh.userData.blade.rotation.y += dt * 40;
      if (o.z > -70 && !reduceMotion) for (let k = 0; k < fxN(5); k++) FX.spark.emit(o.x + 0.03, 1.08, o.z - 0.05, rand(-1, 1) * 1.5 + 3.5, rand(0.5, 3.5), rand(-1.5, 1.5), { color:COL.spark, life:rand(0.25, 0.55), size:rand(0.04, 0.08), grav:9, drag:0.6 }); }
    if (o.type === 'barn'){
      const f = o.mesh.userData.fig, ball = o.mesh.userData.ball;
      if (!o.run && o.z > o.trig){ o.run = true; caption('Barn på byggeplassen! Pass på.', 'orange', 2); }
      if (o.run){
        o.x += o.vx * dt; poseRun(f, g.t * 15 + o.z, 1.0);
        if (!o.kicked){ ball.rotation.x -= dt * 30; ball.position.y = 0.12 + Math.abs(Math.sin(g.t * 9)) * 0.08; }
      } else { poseReset(f); f.body.position.y = 0.97 + Math.abs(Math.sin(g.t * 7)) * 0.05; f.shR.rotation.x = 0.4; }
      if (o.kicked){ o.kv.y -= 18 * dt; ball.position.y = Math.max(0.12, ball.position.y + o.kv.y * dt); ball.position.z -= o.kv.z * dt; ball.rotation.x -= dt * 25; }
      else if (state === 'playing' && Math.abs(o.z) < 0.6 && Math.abs(o.x + o.dir * 1.1 - g.x) < 0.45 && g.y < 0.3){ o.kicked = true; o.kv = { y:6, z:10 }; if (actx) noiseHit(actx.currentTime, 0.08, 'lowpass', 600, 0.4); }
      if (Math.abs(o.x) > 9){ o.z = 99; }
    }
    if (o.type === 'laerling'){ const f = o.mesh.userData.fig; poseRun(f, g.t * 6.5 + o.z * 0.1, 0.42); f.shR.rotation.x = 1.15; f.elR.rotation.x = 1.55; f.shR.rotation.z = 0.25; f.head.rotation.x = -0.5; }
    if (o.type === 'tilsyn' && !o.caught){ const f = o.mesh.userData.fig; poseRun(f, g.t * 13, 0.9); f.shR.rotation.x = 0.45; f.elR.rotation.x = 1.55; }
    if (o.hit || state !== 'playing') continue;
    if (z0 > o.len / 2 + 0.35 || o.z < -(o.len / 2 + 0.35)) continue;
    if (Math.abs(o.x - g.x) > o.wid / 2 + 0.3) continue;
    if (o.kind === 'pit'){
      if (superOn()) continue;
      if (g.onGround && Math.abs(o.x - g.x) < o.wid / 2 - 0.15 && z0 < o.len / 2 - 0.2 && o.z > -(o.len / 2 - 0.2)){ o.hit = true; fallIn(o); return; }
      continue;
    }
    if (g.invuln > 0) continue;
    let hit = false;
    if (o.kind === 'low') hit = g.y < o.h - 0.05;
    else if (o.kind === 'tall') hit = g.y < o.h - 0.05;
    else if (o.kind === 'over') hit = top > o.bottom;
    else if (o.kind === 'insp') hit = g.y < o.h;
    else if (o.kind === 'kid') hit = o.run && g.y < o.h;
    if (!hit) continue;
    if (superOn()){
      if (o.kind === 'kid'){ o.hit = true; continue; }
      knock(o, true); g.shake = Math.max(g.shake, 0.15);
      if (actx) noiseHit(actx.currentTime, 0.12, 'lowpass', 1400, 0.25);
      if (o.type === 'tilsyn'){ confetti([P.paper], 30, 1.3); }
      continue;
    }
    if (o.kind === 'insp'){ caught(o); return; }
    o.hit = true;
    if (o.kind === 'low') knock(o, false);
    if (o.kind === 'over') g.vy = Math.min(g.vy, -2);
    if (o.type === 'sement') confetti(['#A39E96', '#BDB7AE', '#8F8A83'], reduceMotion ? 20 : 45, 0.7);
    addAvvik(o.type);
    if (state !== 'playing') return;
  }
  for (let i = g.obstacles.length - 1; i >= 0; i--){ const o = g.obstacles[i]; if (o.z - o.len / 2 > 12 || (o.fly && o.fly.y < -6)){ scene.remove(o.mesh); disposeBaked(o.mesh); g.obstacles.splice(i, 1); } }

  // dust clouds drift with the site
  for (let i = g.dust.length - 1; i >= 0; i--){ const d = g.dust[i]; d.z += dz; d.x += d.vx * dt; d.y += d.vy * dt; d.sp.material.rotation += dt * 0.25; if (d.z > 8){ scene.remove(d.sp); d.sp.material.dispose(); g.dust.splice(i, 1); } }
  // pickups
  for (let i = g.pickups.length - 1; i >= 0; i--){
    const p = g.pickups[i], pz0 = p.z; p.z += dz;
    if (pz0 < 0.8 && p.z > -0.8 && Math.abs(p.x - g.x) < 0.95 && p.y > g.y - 0.3 && p.y < top + 0.3){ scene.remove(p.mesh); g.pickups.splice(i, 1); collect(p); if (state !== 'playing' && state !== 'loading') return; continue; }
    if (p.z > 10){ scene.remove(p.mesh); g.pickups.splice(i, 1); }
  }
  // scenery scroll
  for (const s of scenery){ s.position.z += dz; if (s.position.z > s.userData.wrapZ) s.position.z -= LOOP; }
  for (const b of skyline){ b.position.z += dz * 0.12; if (b.position.z > 30) b.position.z -= SKY_SPAN; }
  updateHud();
}
export function updateFx(dt){
  FX.dust.update(dt, g.lastDz || 0); FX.spark.update(dt, g.lastDz || 0);
  for (let i = g.fx.length - 1; i >= 0; i--){
    const c = g.fx[i]; c.life -= dt; c.vy -= 9 * dt; c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt; c.mesh.rotation.x += c.rx * dt; c.mesh.rotation.y += c.ry * dt;
    if (c.life <= 0 || c.mesh.position.y < -1){ scene.remove(c.mesh); c.mesh.material.dispose(); g.fx.splice(i, 1); }
  }
}
export function updateEnding(dt){
  g.shake = Math.max(0, g.shake - dt);
  g.endT -= dt;
  if (g.fell){
    if (g.hang > 0) g.hang -= dt; else { g.vy -= GRAV * dt; g.y += g.vy * dt; if (g.y < -4) g.y = -4; }
  } else if (!g.caught){
    player.root.rotation.x = Math.max(-1.45, player.root.rotation.x - dt * 3.2);
    if (g.y > 0){ g.vy -= GRAV * dt; g.y = Math.max(0, g.y + g.vy * dt); }
  }
  if (g.endT <= 0) showGameOver();
}
