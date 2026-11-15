// A hand, and the bare forearm (and upper arm, with a T-shirt) that comes out of the sleeve. Starts inside the sleeve,
// so the seam with the body part is always under cloth. Hanging palm-in, fingers in a relaxed curl; in work gloves the
// hand is a little fuller and ends in a gauntlet cuff. Built for the left side; the right is its mirror image.
import { Scene, Sphere, Capsule, RoundCone, Ellipsoid, RoundBox, Torus, Offset } from './sdf.js';
import { FORE, UPPER } from '../rig.js';
import { factors, keepBelow, boneFrame, localY } from './shape.js';
import { SHORT_HEM } from './body.js';

export const GLOVE_CUFF = -0.245; // local y on the forearm where the glove's gauntlet ends, inside the sleeve

export function handScene(o, spec, side = 'L'){
  const F = factors(o), g = F.girth, hs = F.hand, sh = 'sh' + side, el = 'el' + side;
  const s = new Scene(), bind = { bind:{ chain:'arm' + side } }, x = side === 'L' ? -1 : 1, m = -x; // m: towards the palm (medial)
  const P = (lx, ly, lz) => spec.pt(el, [lx, ly, lz]);
  // bare skin from inside the sleeve
  if (o.sleeves === 'short'){
    s.add(new RoundCone(spec.pt(sh, [0, SHORT_HEM + 0.04, 0]), spec.pt(sh, [0, -UPPER, 0]), 0.05 * g, 0.041 * g), 0, bind);
    s.add(new Ellipsoid(spec.pt(sh, [0, -0.19, -0.012]), [0.043 * g, 0.07, 0.044 * g], boneFrame(spec, sh)), 0.02, bind);
    s.add(new Sphere(spec.origin(el), 0.041 * g), 0.015, bind);
    s.add(new RoundCone(spec.origin(el), P(0, -FORE, 0), 0.044 * g, 0.03 * g), 0.015, bind);
    s.add(new Ellipsoid(P(0, -0.07, 0.004), [0.046 * g, 0.085, 0.043 * g], boneFrame(spec, el)), 0.02, bind);
  } else {
    s.add(new RoundCone(P(0, -0.21, 0), P(0, -FORE, 0), 0.034 * g, 0.03 * g), 0, bind);
  }
  // the hand itself
  const hand = new Scene();
  hand.add(new Ellipsoid(P(0, -FORE, 0), [0.021 * hs * g ** 0.5, 0.02, 0.03 * hs * g ** 0.5], boneFrame(spec, el)), 0, bind);
  hand.add(new RoundBox(P(m * 0.002, -FORE - 0.052 * hs, -0.003), [0.0155 * hs, 0.047 * hs, 0.041 * hs], 0.012 * hs, boneFrame(spec, el)), 0.012, bind);
  // the ball of the thumb
  hand.add(new Ellipsoid(P(m * 0.006, -FORE - 0.045 * hs, -0.024 * hs), [0.014 * hs, 0.03 * hs, 0.02 * hs], boneFrame(spec, el)), 0.01, bind);
  // four fingers, index (front) to little finger, curled towards the palm
  // Fingers lie together, overlapping slightly: either touching or at least two grid cells apart, never nearly
  // touching, which would extract as a non-manifold sliver.
  const fingers = [[-0.024, -0.03, -0.092, [0.042, 0.026, 0.02], 1], [-0.008, -0.01, -0.095, [0.047, 0.029, 0.022], 1],
    [0.008, 0.012, -0.092, [0.044, 0.027, 0.021], 0.97], [0.023, 0.035, -0.086, [0.034, 0.021, 0.018], 0.88]];
  const radii = [0.0098, 0.009, 0.0083], curl = [0.2, 0.35, 0.25];
  for (const [z0, fan, y0, lens, rs] of fingers){
    let p = [m * 0.003, -FORE + y0 * hs, z0 * hs], a = 0;
    for (let i = 0; i < 3; i++){
      a += curl[i];
      const d = [m * Math.sin(a), -Math.cos(a) * Math.cos(fan), Math.cos(a) * Math.sin(fan)], L = lens[i] * hs;
      const q = [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
      // a soft blend between neighbouring fingers turns any small gap into a groove instead of a sliver
      hand.add(new Capsule(P(...p), P(...q), radii[i] * rs * hs), 0.006, bind);
      p = q;
    }
  }
  // thumb: metacarpal, then two joints bending towards the fingers
  let tp = [m * 0.008, -FORE - 0.022 * hs, -0.03 * hs];
  for (const [dir, L, r] of [[[m * 0.3, -0.62, -0.72], 0.04, 0.013], [[m * 0.42, -0.62, -0.66], 0.031, 0.0115], [[m * 0.6, -0.6, -0.52], 0.025, 0.0103]]){
    const l = Math.hypot(...dir), q = [tp[0] + dir[0] / l * L * hs, tp[1] + dir[1] / l * L * hs, tp[2] + dir[2] / l * L * hs];
    hand.add(new Capsule(P(...tp), P(...q), r * hs), 0.004, bind);
    tp = q;
  }
  if (o.gloves === 'on'){
    // work gloves: the hand grows by the leather's thickness, with a gauntlet up the wrist
    s.add(new Offset(hand, 0.0022), 0.008, bind);
    // the gauntlet stays slimmer than the sleeve, so it disappears into it
    s.add(new RoundCone(P(0, GLOVE_CUFF, 0), P(0, -FORE - 0.01, 0), 0.035 * g, 0.032 * g), 0.01, bind);
  } else s.add(hand, 0.008);
  s.int(keepBelow(spec, o.sleeves === 'short' ? sh : el, o.sleeves === 'short' ? SHORT_HEM + 0.035 : -0.205));
  return { scene:s };
}

// Region distances: x: glove (negative below the cuff line, when gloves are on).
export function handRegions(o, spec, positions, side = 'L'){
  const nv = positions.length / 3, out = new Float32Array(nv * 4).fill(1);
  if (o.gloves !== 'on') return out;
  for (let v = 0; v < nv; v++) out[v * 4] = localY(spec, 'el' + side, [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]]) - GLOVE_CUFF - 0.004;
  return out;
}
