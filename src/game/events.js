// Scripted events: the man with the cut-off saw (dust) and kids with a football.
import * as THREE from 'three';
import { reduceMotion, rand } from '../core/utils.js';
import { P } from '../core/palette.js';
import { g } from './state.js';
import { canvasTex } from '../textures/canvas.js';
import { actx, soundOn, tone } from '../audio/audio.js';
import { scene } from '../render/renderer.js';
import { LANE } from '../world/layout.js';
import { addObstacle } from './spawning.js';

export const fogTarget = new THREE.Color();
const dustTex = canvasTex(128, 128, (c, w, h) => {
  const gr = c.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++){ c.fillStyle = `rgba(0,0,0,${rand(0.03, 0.09)})`; const a = rand(0, 6.28), r = rand(0, 50); c.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); }
});
export function spawnKappsag(){
  const pair = Math.random() < 0.5 ? [-1, 0] : [0, 1], cx = (pair[0] + pair[1]) / 2 * LANE;
  // Place the saw beyond any existing obstacle instead of deleting them (deleting made distant holes vanish).
  let z = -100;
  for (let moved = true, n = 0; moved && n < 20; n++){
    moved = false;
    for (const o of g.obstacles){ if (Math.abs(o.z - z) < o.len / 2 + 14){ z = Math.min(z, o.z - o.len / 2 - 14); moved = true; } }
  }
  addObstacle('kappsag', null, z, { x:cx, lanes:pair });
  const n = reduceMotion ? 40 : 70;
  for (let i = 0; i < n; i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:dustTex, color:new THREE.Color(P.dust), transparent:true, depthWrite:false, opacity:0 }));
    const sc = rand(2.2, 5); sp.scale.set(sc, sc * rand(0.7, 1), 1); sp.material.rotation = rand(0, 6.28);
    const d = { sp, x:cx + rand(-4, 4) * (i < n * 0.6 ? 0.7 : 1.4), y:rand(0.3, 3.4), z:z + rand(-24, 9), vx:rand(-0.7, 0.7), vy:rand(0.05, 0.35), base:rand(0.38, 0.68) };
    sp.position.set(d.x, d.y, d.z); scene.add(sp); g.dust.push(d);
  }
  if (soundOn && actx){ tone(1900, 1.3, 'sawtooth', 0.02, 1500); }
}
export function spawnKids(){
  const dir = Math.random() < 0.5 ? 1 : -1, n = Math.random() < 0.4 ? 2 : 1, z = -95;
  for (let i = 0; i < n; i++){
    const o = addObstacle('barn', null, z - i * 1.4, { x:-dir * (5.6 + i * 1.3), vx:dir * rand(3.6, 4.4), dir, run:false, trig:-(g.base * rand(1.4, 2.0) + 3), lanes:[-1, 0, 1] });
    o.mesh.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  return true;
}
