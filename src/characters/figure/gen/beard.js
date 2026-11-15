// Facial hair as the face grown by the beard's thickness inside a style's area, thinning to nothing at the edges so it sinks into the
// skin instead of ending in a step. Stubble has no mesh: the head's shader tints the beard area instead.
import { Scene, Sphere, Capsule, Ellipsoid, smax, smin } from './sdf.js';
import { valueNoise3 } from './rng.js';
import { headLandmarks, beardArea, Fn } from './headshape.js';
import { headScene } from './head.js';

export const FACIAL = ['none', 'stubble', 'mustache', 'goatee', 'mustacheGoatee', 'boxed', 'full', 'long'];
export const NO_BEARD_MESH = new Set(['none', 'stubble']);
const sm01 = s => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };

function areas(o){
  const L = headLandmarks(o), M = L.mouth;
  const must = [new Capsule([-0.024, M.y + 0.0125, M.z - 0.004], [0.024, M.y + 0.0125, M.z - 0.004], 0.0085),
    ...[-1, 1].map(x => new Capsule([x * 0.024, M.y + 0.011, M.z - 0.002], [x * 0.029, M.y - 0.004, M.z + 0.004], 0.005))];
  const goat = [new Ellipsoid([0, -0.07 * L.fs.tall, -0.071 * L.k], [0.022, 0.028, 0.03]), new Capsule([-0.006, M.y - 0.016, M.z], [0.006, M.y - 0.016, M.z], 0.006)];
  const minOf = list => (x, y, z) => { let d = Infinity; for (const p of list) d = Math.min(d, p.dist(x, y, z)); return d; };
  const full = beardArea(o);
  return { mustache:minOf(must), goatee:minOf(goat), mustacheGoatee:minOf([...must, ...goat]), boxed:(x, y, z) => full.dist(x, y, z), full:(x, y, z) => full.dist(x, y, z), long:(x, y, z) => full.dist(x, y, z) };
}
const THICK = { mustache:0.0055, goatee:0.006, mustacheGoatee:0.006, boxed:0.005, full:0.009, long:0.009 };

export function beardScene(o){
  const style = o.facial || 'none';
  if (NO_BEARD_MESH.has(style)) return null;
  const head = headScene(o).scene, area = areas(o)[style], t0 = THICK[style], noise = valueNoise3(23), L = headLandmarks(o);
  const s = new Scene(), rigid = { bind:{ bone:'headB' } };
  const bounds = [-0.11, -0.2, -0.16, 0.11, 0.08, 0.06];
  s.add(new Fn((x, y, z) => {
    const m = area(x, y, z), d = head.dist(x, y, z);
    // thickness fades to nothing over the last 6 mm inside the area's edge
    const t = t0 * sm01(-m / 0.006) + (style === 'full' || style === 'long' ? 0.002 * noise(x * 60, y * 60, z * 60) : 0);
    // solid down through the head (hidden inside it), so there is no thin inner sheet
    return smax(d - t, m, 0.002);
  }, bounds), 0, rigid);
  if (style === 'long'){
    s.add(new Fn((x, y, z) => new Ellipsoid([0, -0.118, -0.066 * L.k], [0.042, 0.066, 0.034]).dist(x, y, z) + 0.003 * noise(x * 50, y * 50, z * 50), [-0.06, -0.2, -0.11, 0.06, -0.04, -0.02]), 0.03, rigid);
  }
  return { scene:s };
}
