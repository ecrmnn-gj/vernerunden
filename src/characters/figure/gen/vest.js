// The hi-vis vest: the torso in its shirt grown by the vest's thickness, from just below the chest down to above the belt, with
// armholes and a V-neck. Built in the bind pose like the body and skinned like the torso under it. The reflective
// tape, the VERNEOMBUD print and the logo are drawn by the vest's shader, not modelled.
import { Scene, Ellipsoid, Capsule, smax } from './sdf.js';
import { BODY_Y, widths } from '../rig.js';
import { factors } from './shape.js';
import { torsoScene } from './body.js';
import { Fn } from './headshape.js';

// Hem and top of the vest (world y in the bind pose); the shader lays the tape out from these.
export const VEST = { hem:BODY_Y + 0.11, bandLow:BODY_Y + 0.29, bandHigh:BODY_Y + 0.46, strapX:0.085, tape:0.05 };

export function vestScene(o){
  const T = torsoScene(o), { bx } = widths(o), F = factors(o), Y = by => BODY_Y + by;
  const arms = [-1, 1].map(x => new Ellipsoid([x * 0.175 * bx, Y(0.49), 0.0], [0.064 * F.girth ** 0.5, 0.108, 0.09]));
  const neck = new Ellipsoid([0, Y(0.69), 0.0], [0.074, 0.1, 0.106]);
  const vee = new Capsule([0, Y(0.61), -0.11], [0, Y(0.48), -0.135], 0.024);
  const s = new Scene();
  s.add(new Fn((x, y, z) => {
    const d = T.dist(x, y, z);
    // 8 mm outside the shirt and solid through the body (hidden inside it): no thin inner sheet to extract, and the
    // hidden cut faces at the hem, neck and armholes are flat, so they simplify to almost nothing
    let v = d - 0.008;
    v = smax(v, VEST.hem - y, 0.004);
    const cut = Math.min(arms[0].dist(x, y, z), arms[1].dist(x, y, z), neck.dist(x, y, z), vee.dist(x, y, z));
    return smax(v, -cut, 0.008);
  }, T.bounds.map((b, i) => b + (i < 3 ? -0.02 : 0.02))), 0, { bind:{ scene:T } });
  return { scene:s };
}
