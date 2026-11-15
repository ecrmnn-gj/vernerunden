// What happens on contact: avvik, falls, being caught, pickups and the speed boost.
import * as THREE from 'three';
import { reduceMotion, rand, pick } from '../core/utils.js';
import { P } from '../core/palette.js';
import { g, setState } from './state.js';
import { labelSprite } from '../textures/canvas.js';
import { actx, soundOn, tone, startMusic, stopMusic } from '../audio/audio.js';
import { sfxPickup, sfxClose, sfxHit, note, sfxCheer, sfxWhoosh, sfxWhistle, sfxSad } from '../audio/sfx.js';
import { scene } from '../render/renderer.js';
import { poseReset } from '../characters/poses.js';
import { MAX_OPEN, OBS } from './content.js';
import { fxCol, COL, puff, sparkle } from '../render/particles.js';
import { caption, pop, boom } from '../ui/overlays.js';

export function addAvvik(type){
  const d = OBS[type], k = g.wrongApp ? 2 : 1;
  for (let i = 0; i < k; i++) g.tail.push(type);
  g.total += k; g.counts[type] = (g.counts[type] || 0) + k;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM); g.lastAvvikM = g.dist;
  const wasSuper = superOn();
  if (g.boost && g.boost.phase !== 'loading') g.boost = null;
  g.invuln = 1.0; g.hitstop = 0.1; g.stumble = 0.45; boom('red', 0.6, 0.35);
  puff(g.x, 0.4, -0.4, 14, 0.5, 0.55, 0.5, 2.2); sparkle(g.x, 1.0, -0.4, 14, COL.white, 5);
  caption(d.hit, 'red'); pop(k > 1 ? 'DOBBELT AVVIK!' : 'AVVIK!', 'red', 1.15, wasSuper ? 'Superhastigheten er over' : k > 1 ? 'Lastet ned feil app' : d.label); sfxHit();
  if (g.tail.length >= MAX_OPEN){
    setState('ending'); g.endT = 2.0; g.ev = null; stopMusic();
    caption('Fem åpne avvik. Arbeidet stanses.', 'red', 3);
    pop('ARBEIDET\nSTANSES!', 'red', 2, 'Fem åpne avvik på en gang');
  }
}
export function fallIn(o){
  g.fell = true; g.fellGrop = o.type === 'grop'; g.total++;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM);
  setState('ending'); g.endT = 2.0; g.ev = null; stopMusic(); g.vy = 0; g.hang = 0.3;
  boom('red', 0.6, 0.3);
  caption(g.fellGrop ? 'Du falt ned i byggegropa. Arbeidet stanses.' : 'Du falt ned i hullet. Arbeidet stanses.', 'red', 3);
  pop(g.fellGrop ? 'NED I\nBYGGEGROPA!' : 'NED I\nHULLET!', 'red', 1.9, 'Arbeidet stanses');
  tone(900, 0.55, 'sine', 0.16, 110); setTimeout(() => sfxHit(), 620);
}
export function caught(o){
  g.caught = true; o.caught = true; o.vz = 0; o.z = -2.3; o.x = g.x + (g.lane < 1 ? 0.95 : -0.95); g.total++;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM);
  setState('ending'); g.endT = 2.3; g.ev = null; stopMusic();
  boom('red', 0.6, 0.35);
  caption('Stoppet av Arbeidstilsynet.', 'red', 3);
  pop('STOPPET AV\nARBEIDSTILSYNET!', 'red', 2.1, 'Vernerunden er over');
  const bub = o.mesh.userData.bubble; o.mesh.remove(bub);
  const nb = labelSprite('Hei! Har du et øyeblikk?', { bubble:true, height:0.42 }); nb.position.set(0, 2.45, 0); o.mesh.add(nb);
  { const f = o.mesh.userData.fig; poseReset(f); f.shR.rotation.x = 2.3; f.elR.rotation.x = 0.4; f.shL.rotation.x = 0.4; f.elL.rotation.x = 1.2; o.mesh.userData.binder.position.set(0.12, 0.98, -0.2); }
  sfxWhistle(); setTimeout(() => sfxHit(), 120);
}
export function knock(o, strong){
  o.hit = true;
  o.fly = { vx:(o.x >= g.x ? 1 : -1) * rand(3.5, 5.5) * (strong ? 1.4 : 1), vy:rand(2.2, 3.4), vz:-rand(4, 8), rx:rand(-5, 5), rz:rand(-5, 5), y:0 };
}
export function superOn(){ return !!g.boost && (g.boost.phase === 'super' || g.boost.phase === 'down'); }
export function confetti(colors, n, y){
  const geo = new THREE.PlaneGeometry(0.09, 0.13);
  for (let i = 0; i < n; i++){
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:new THREE.Color(pick(colors)), side:THREE.DoubleSide }));
    m.position.set(g.x + rand(-0.5, 0.5), y, rand(-1.5, -0.5)); scene.add(m);
    g.fx.push({ mesh:m, vx:rand(-4, 4), vy:rand(3, 9), vz:rand(-4, 1), rx:rand(-10, 10), ry:rand(-10, 10), life:rand(1.4, 2.4) });
  }
}
export function collect(p){
  const pc = { lukk:P.green, app:P.green, rival:P.npc, kurs:P.blue, briller:P.halo, ore:P.yellow }[p.kind] || P.halo;
  sparkle(p.x, p.y, p.z, p.kind === 'app' ? 60 : 26, fxCol(pc, 4), p.kind === 'app' ? 6 : 4);
  if (p.kind === 'app'){ downloadApp(); return; }
  if (p.kind === 'rival'){ wrongApp(); return; }
  if (p.kind === 'lukk'){
    sfxClose(); boom('green', 0.25, 0.08);
    if (g.tail.length){ g.tail.pop(); g.closed++; pop('LUKKET!', 'green', 0.95, 'Ett avvik mindre å dra på'); }
    else pop('RYDDIG!', 'green', 0.95, 'Ingen åpne avvik å lukke');
    return;
  }
  sfxPickup(); boom(p.kind === 'kurs' ? 'blue' : 'green', 0.25, 0.08);
  if (p.kind === 'kurs'){ g.kurs = 10; pop('ARBEID I HØYDEN!', 'blue', 1.2, 'Kursbevis: trippelhopp i 10 sekunder'); }
  else if (p.kind === 'briller'){ g.briller = 14; pop('VERNEBRILLER!', 'green', 1.1, 'Nå ser du gjennom støvet'); }
  else if (p.kind === 'ore'){ g.ore = 14; pop('HØRSELVERN!', 'yellow', 1.1, 'Deilig stille'); }
}
function downloadApp(){
  if (g.wrongApp){ g.wrongApp = null; caption('Riktig app. Avvik teller normalt igjen.', 'green', 2.6); }
  const n = g.tail.length; g.apps++;
  g.closed += n; g.tail = [];
  pop('GRØNN JOBB-APPEN\nLASTET NED!', 'green', 2.0, n ? `Alle ${n} avvik lukket i én portal` : 'Alt samlet i én portal');
  boom('green', 0.7, 0.3);
  confetti([P.green, P.yellow, P.halo, P.gold, P.blue, P.orange], reduceMotion ? 40 : 110, 1.6);
  sfxCheer();
  if (g.boost && g.boost.phase !== 'loading'){ g.boost.phase = 'super'; g.boost.left = 10; }
  else if (!g.boost){ g.boost = { phase:'loading', t:0 }; stopMusic(); setState('loading'); }
}
function wrongApp(){
  g.wrongApp = true; g.rivals.push(1);
  caption('Du lastet ned feil app.', 'red', 3);
  pop('LASTET NED\nFEIL APP!', 'red', 1.8, 'Avvik teller dobbelt til du har Grønn Jobb-appen');
  boom('red', 0.6, 0.3); sfxSad();
}
export function updateBoost(dt){
  const b = g.boost; let target = 1;
  if (b){
    b.t += dt;
    if (b.phase === 'loading'){
      if (b.t >= 1.0 && !b.barSfx){ b.barSfx = true; if (soundOn && actx){ const t = actx.currentTime + 0.02; [392, 440, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99].forEach((f, i) => note(f, t + i * 0.1, 0.14, 'sine', 0.06, 0.008)); } }
      if (b.t >= 1.9){ b.phase = 'super'; b.left = 10; setState('playing'); pop('SUPERHASTIGHET!', 'yellow', 1.4, '10 sekunder. Immun mot alle hindringer.'); boom('yellow', 0.5, 0.35); sfxWhoosh(); startMusic(); }
    } else if (b.phase === 'super'){ target = 1.75; b.left -= dt; if (b.left <= 0){ b.phase = 'down'; b.down = 1.3; } }
    else if (b.phase === 'down'){ b.down -= dt; if (b.down <= 0){ g.boost = null; g.invuln = Math.max(g.invuln, 0.6); caption('Superhastigheten er over. Immuniteten er borte.', 'green', 2.4); } }
  }
  g.boostF += (target - g.boostF) * Math.min(1, dt * (target > g.boostF ? 5 : 2));
}
