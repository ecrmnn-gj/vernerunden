// Hair, sculpted as solid shapes (no transparent cards): the cranium grown by the hair's thickness, inside the
// hairline (solid through the head, where the head mesh hides it), with grooves
// fanning out from the crown so it reads as strands, plus each style's own volumes. Built in the head bone's space.
// Every style also comes in an "under the helmet" version, cut away where the hard hat's dome sits, so hair never
// pokes through it; the figure swaps between the two when the helmet comes off in the creator.
import { Scene, Sphere, Ellipsoid, RoundBox, Torus, smax, smin } from './sdf.js';
import { valueNoise3 } from './rng.js';
import { cranium, scalpMask, headLandmarks, helmetInside, Fn } from './headshape.js';
import { rigSpec, chainWeights } from '../rig.js';

export const HAIR_STYLES = ['short', 'buzz', 'long', 'ponytail', 'bun', 'braids', 'curly', 'afro', 'bald'];
// Styles with no mesh: a buzz cut is painted on the scalp by the head's shader, bald is bald.
export const NO_MESH = new Set(['buzz', 'bald']);
const sm01 = s => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };

// Hair bone positions in the head bone's space (the chains hang straight in the rest pose).
function chainPoints(o, names){
  const rest = rigSpec(o).rest, out = [];
  let p = [0, 0, 0];
  for (const n of names){ p = [p[0] + rest[n][0], p[1] + rest[n][1], p[2] + rest[n][2]]; out.push(p); }
  return out;
}
function hairChain(o, names){
  const pts = chainPoints(o, names), last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const end = [last[0] + (last[0] - prev[0]) * 2, last[1] + (last[1] - prev[1]) * 2, last[2] + (last[2] - prev[2]) * 2];
  return { pts:[[pts[0][0], pts[0][1] + 0.08, pts[0][2] - 0.02], ...pts, end], segs:['headB', ...names], joints:names.map(() => ({ w:0.03 })) };
}

export function hairScene(o, underHelmet){
  const style = o.hairStyle || 'short';
  if (NO_MESH.has(style)) return null;
  const crn = cranium(o), mask = scalpMask(o), L = headLandmarks(o), k = L.k, noise = valueNoise3(11);
  const rigid = { bind:{ bone:'headB' } }, s = new Scene();
  // The shell over the scalp, thickest on top, with grooves fanning from the crown.
  const shell = (t0, groove, curl) => new Fn((x, y, z) => {
    const d = crn.dist(x, y, z), f = 0.55 + 0.45 * sm01((y - 0.02) / 0.1), t = t0 * f;
    // solid down through the head (hidden inside it), so there is no thin inner sheet to extract badly
    let v = d - t;
    if (groove) v += groove * f * Math.sin(30 * Math.atan2(x, z - 0.03) + 40 * y);
    if (curl) v += curl * noise(x * 45, y * 45, z * 45);
    return smax(v, mask.dist(x, y, z), 0.004);
  }, crn.bounds.map((b, i) => b + (i < 3 ? -1 : 1) * (t0 + (curl || 0) + 0.01)));
  let chain = null;
  if (style === 'short'){
    s.add(shell(0.01, 0.0015), 0, rigid);
    s.add(new Ellipsoid([0, 0.152 * L.fs.tall, -0.02], [0.058 * k, 0.026, 0.066 * k]), 0.02, rigid); // a little lift at the front
  } else if (style === 'long'){
    chain = hairChain(o, ['hairBack0', 'hairBack1', 'hairBack2']);
    s.add(shell(0.009, 0.0015), 0, rigid);
    // the curtain down the back to the shoulders, and locks either side of the face
    const curtain = new Fn((x, y, z) => smax(new RoundBox([0, -0.06, 0.062], [0.082 * k, 0.13, 0.045], 0.035).dist(x, y, z) + 0.0015 * Math.sin(70 * x), -(z + 0.02), 0.01), [-0.12, -0.22, -0.03, 0.12, 0.1, 0.12]);
    s.add(curtain, 0.03, { bind:{ chain:'hair' } });
    for (const x of [-1, 1]) s.add(new Ellipsoid([x * 0.079 * k * L.fs.w, -0.035, 0.0], [0.016, 0.09, 0.034]), 0.025, { bind:{ chain:'hair' } });
  } else if (style === 'ponytail'){
    chain = hairChain(o, ['pony0', 'pony1', 'pony2']);
    s.add(shell(0.006, 0.0012), 0, rigid);
    const P = chain.pts;
    s.add(new Sphere(P[1], 0.016), 0.006, rigid);
    // the tail: a row of overlapping lobes, thick under the tie and tapering to the tip
    for (let i = 0; i <= 8; i++){
      const t = i / 8, a = lerp3(P[1], P[3], t), r = 0.027 - 0.014 * t;
      s.add(new Ellipsoid([a[0], a[1] - 0.012, a[2] + 0.012], [r, 0.03, r * 0.9]), 0.012, { bind:{ chain:'hair' } });
    }
  } else if (style === 'bun'){
    s.add(shell(0.006, 0.0012), 0, rigid);
    // low enough to sit under the back of the helmet's brim
    s.add(new Fn((x, y, z) => new Sphere([0, 0.055, 0.108 * k], 0.04).dist(x, y, z) + 0.002 * Math.sin(25 * Math.atan2(y - 0.055, x)), [-0.05, 0.005, 0.06, 0.05, 0.11, 0.16]), 0.015, rigid);
  } else if (style === 'braids'){
    // cornrows front to back, then two braids hanging behind the ears
    s.add(new Fn((x, y, z) => {
      const d = crn.dist(x, y, z), rows = 0.0035 * Math.abs(Math.sin(x * Math.PI / 0.017)), t = 0.0065 - rows;
      return smax(d - t, mask.dist(x, y, z), 0.004);
    }, crn.bounds.map((b, i) => b + (i < 3 ? -0.02 : 0.02))), 0, rigid);
    chain = { L:hairChain(o, ['braidL0', 'braidL1', 'braidL2']), R:hairChain(o, ['braidR0', 'braidR1', 'braidR2']) };
    for (const side of ['L', 'R']){
      const P = chain[side].pts;
      for (let i = 0; i <= 12; i++){
        const t = i / 12, a = lerp3(P[1], P[3], t), r = 0.012 - 0.004 * t, sx = (i % 2 ? 1 : -1) * 0.004;
        s.add(new Ellipsoid([a[0] + sx, a[1] - 0.015, a[2]], [r, 0.013, r]), 0.004, { bind:{ chain:'hair' + side } });
      }
      const tip = lerp3(P[1], P[3], 1.08);
      s.add(new Sphere([tip[0], tip[1] - 0.02, tip[2]], 0.009), 0.004, { bind:{ chain:'hair' + side } });
    }
  } else if (style === 'curly'){
    s.add(shell(0.017, 0, 0.006), 0, rigid);
  } else if (style === 'afro'){
    // a full rounded volume that grows outwards from the hairline: the scalp area projected out from the head's
    // centre, so its edge follows the hairline round the face instead of ending in a wall
    const E = new Ellipsoid([0, 0.088, 0.02], [0.13 * k, 0.128 * k, 0.135 * k]), c = crn.c;
    s.add(new Fn((x, y, z) => {
      const dx = x - c[0], dy = y - c[1], dz = z - c[2], r = Math.hypot(dx, dy, dz) || 1, sc = Math.min(1, 0.09 / r);
      const allowed = mask.dist(c[0] + dx * sc, c[1] + dy * sc, c[2] + dz * sc) - 0.004;
      return smax(E.dist(x, y, z) + 0.005 * noise(x * 38, y * 38, z * 38), allowed, 0.014);
    }, E.bounds.map((b, i) => b + (i < 3 ? -0.01 : 0.01))), 0, rigid);
  }
  if (underHelmet){
    const inside = helmetInside(o);
    s.sub(inside, 0.004);
  }
  return { scene:s, chains:chain && (chain.L ? { hairL:chain.L, hairR:chain.R } : { hair:chain }) };
}
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export { chainWeights };
