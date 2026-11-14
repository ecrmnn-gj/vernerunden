// Spawning obstacle rows, pickups and inspectors ahead of the player.
import { rand, pick, clamp } from '../core/utils.js';
import { g } from './state.js';
import { sfxHonk, sfxWhistle } from '../audio/sfx.js';
import { scene } from '../render/renderer.js';
import { laneX } from '../world/layout.js';
import { OBS, LOWS } from './content.js';
import { buildObstacle } from './obstacles.js';
import { buildPickup } from './pickups.js';
import { SPEED0 } from './run.js';
import { caption } from '../ui/overlays.js';

export function addObstacle(type, lane, zSpawn, extra){
  const d = OBS[type], mesh = buildObstacle(type);
  const o = Object.assign({ type, kind:d.kind, lane, x:lane === null ? 0 : laneX(lane), z:zSpawn, wid:d.wid, len:d.len, h:d.h || 0, bottom:d.bottom || 0, vz:0, hit:false, mesh }, extra || {});
  if (type === 'hull' || type === 'grop'){ o.holeMesh = mesh.userData.hole; fitPit(o); }
  mesh.position.set(o.x, 0, o.z); scene.add(mesh); g.obstacles.push(o);
  return o;
}
function fitPit(o){
  o.holeMesh.scale.set(o.wid, 1, o.len);
  const [a, b, c, d] = o.mesh.userData.lip, t = 0.16;
  a.scale.set(o.wid + 2 * t, 0.05, t); a.position.set(0, 0.02, o.len / 2 + t / 2);
  b.scale.set(o.wid + 2 * t, 0.05, t); b.position.set(0, 0.02, -o.len / 2 - t / 2);
  c.scale.set(t, 0.05, o.len); c.position.set(o.wid / 2 + t / 2, 0.02, 0);
  d.scale.set(t, 0.05, o.len); d.position.set(-o.wid / 2 - t / 2, 0.02, 0);
}
function setPitLen(o, len){ o.len = len; fitPit(o); for (const e of (o.mesh.userData.edge || [])) e.position.z = len / 2 + 0.3; if (len > 5) g.extraGap = len; }
function freeLanesNear(z, range){
  const free = [-1, 0, 1].filter(l => !g.obstacles.some(o => Math.abs(o.z - z) < range + o.len / 2 && (o.lanes ? o.lanes.includes(l) : (o.lane === null || o.lane === l))));
  return free;
}
export function spawnRow(z){
  const t = g.t, lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const pats = [
    { w:4, f:() => addObstacle(pick(LOWS), lanes[0], z) },
    { w:2, min:10, f:() => { addObstacle(pick(LOWS), lanes[0], z); addObstacle(pick(LOWS), lanes[1], z); } },
    { w:2.2, min:3, f:() => addObstacle('bil', lanes[0], z - 1.5) },
    { w:1, min:16, f:() => { addObstacle('bil', lanes[0], z - 1.5); addObstacle('bil', lanes[1], z - 1.5); } },
    { w:2, min:6, f:() => addObstacle('stillas', lanes[0], z) },
    { w:1, min:14, f:() => { addObstacle('stillas', lanes[0], z); addObstacle('stillas', lanes[1], z); } },
    { w:2, min:5, f:() => { const o = addObstacle('hull', lanes[0], z); setPitLen(o, rand(1.4, 2.0)); } },
    { w:1.3, min:9, f:() => { const len = clamp(g.base * rand(0.74, 0.84), 5, 40); const o = addObstacle('hull', lanes[0], z - len / 2); setPitLen(o, len); } },
    { w:1.8, min:3, f:() => addObstacle('skilt', lanes[0], z) },
    { w:0.8, min:15, f:() => { addObstacle('skilt', lanes[0], z); addObstacle('skilt', lanes[1], z); } },
    { w:1.3, min:12, f:() => { const o = addObstacle('grop', null, z); setPitLen(o, rand(2.6, 3.4) + Math.min(1.2, (g.base - SPEED0) * 0.08)); } },
    { w:0.9, min:20, f:() => { const len = clamp(g.base * rand(0.74, 0.82), 5, 40); const o = addObstacle('grop', null, z - len / 2); setPitLen(o, len); } },
    { w:1.2, min:6, f:() => addObstacle('laerling', lanes[0], z - 4, { vz:rand(1.6, 2.6) }) },
    { w:1, min:18, f:() => { addObstacle('kjor', lanes[0], z - 25, { vz:rand(9, 13) }); sfxHonk(); } },
    { w:1, min:20, f:() => { addObstacle('bil', lanes[0], z - 1.5); addObstacle('stillas', lanes[1], z); } }
  ].filter(p => !p.min || t >= p.min);
  let total = 0; pats.forEach(p => total += p.w);
  let r = Math.random() * total;
  for (const p of pats){ r -= p.w; if (r <= 0){ p.f(); return; } }
  pats[0].f();
}
export function spawnPickup(kind, name){
  const z = -110;
  let lanes = freeLanesNear(z, 3);
  let y = 1.0;
  if (!lanes.length){ lanes = [-1, 0, 1].filter(l => g.obstacles.some(o => Math.abs(o.z - z) < 3 && o.lane === l && o.kind === 'low')); y = 2.15; }
  if (!lanes.length) return false;
  const lane = pick(lanes), mesh = buildPickup(kind, name);
  const p = { kind, name, lane, x:laneX(lane), y, z, seed:Math.random() * 6, mesh };
  mesh.position.set(p.x, y, z); scene.add(mesh); g.pickups.push(p);
  return true;
}
export function spawnInspector(){
  const lanes = freeLanesNear(-100, 10); if (!lanes.length) return false;
  const o = addObstacle('tilsyn', pick(lanes), -100, { vz:rand(4.5, 6.5) });
  sfxWhistle(); caption('Arbeidstilsynet kommer! Dobbelthopp over ham eller bytt fil.', 'red', 2.4);
  o.warned = true; return true;
}
