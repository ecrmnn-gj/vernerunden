// The looping scenery: placement bookkeeping and wrapping each piece round to the far end.
import * as THREE from 'three';
import { clamp } from '../core/utils.js';
import { scene, FOG, SUN_DIR, SHADOW_Z } from '../render/renderer.js';
import { LOOP, Z_NEAR } from './layout.js';
import { bake } from './geometry.js';

export const scenery = [];
export function addScen(obj, z){ bake(obj); obj.position.z = z; obj.userData.wrapZ = scenWrapZ(obj); scene.add(obj); scenery.push(obj); }
// The sun is behind the runner, so tall scenery throws its shadow forward across the road: a 25 m building
// 18 m behind the camera still shades the road ahead. Scenery therefore only wraps round to the far end once its
// shadow has also left the shadow-mapped stretch, or the shadow would vanish in a single frame. The wrap point is
// capped so the object still reappears beyond the fog. Cranes slew, so the horizontal reach uses the full radius.
const _scenBox = new THREE.Box3();
function scenWrapZ(obj){
  const b = _scenBox.setFromObject(obj), p = obj.position;
  let r = 0;
  for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) r = Math.max(r, Math.hypot(x - p.x, z - p.z));
  const reach = r + Math.max(0, b.max.y) * SUN_DIR.z / SUN_DIR.y;
  return clamp(SHADOW_Z[1] + reach, Z_NEAR, LOOP - FOG.far - 10);
}
// Spots beside the road that are taken, so props do not grow into each other. z wraps with the scenery loop.
const occupied = [];
const loopDz = (a, b) => { const d = ((a - b) % LOOP + LOOP * 1.5) % LOOP; return d - LOOP / 2; };
export const isFree = (side, z, half, x0, x1) => !occupied.some(o => o.side === side && Math.abs(loopDz(o.z, z)) < o.half + half && x1 > o.x0 && x0 < o.x1);
export const claim = (side, z, half, x0, x1) => occupied.push({ side, z, half, x0, x1 });
