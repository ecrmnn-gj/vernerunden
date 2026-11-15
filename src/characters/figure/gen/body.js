// The clothed body: torso in a work shirt, arms in sleeves, legs in craftsman trousers with knee pads and holster
// pockets, a belt and a shirt collar. Modelled in the bind (A-) pose, in world space. The head part's neck plugs
// into the torso under the collar; the hands and bare forearms are their own parts.
import { Scene, Sphere, Capsule, RoundCone, Ellipsoid, RoundBox, Torus, basis } from './sdf.js';
import { UPPER, FORE, THIGH, SHIN, BODY_Y, widths } from '../rig.js';
import { factors, keepAbove, boneFrame } from './shape.js';

export const BELT_Y = BODY_Y + 0.065;
// Where the T-shirt sleeve ends, as local y along the upper arm.
export const SHORT_HEM = -0.15;

export function bodyScene(o, spec){
  const F = factors(o), { hx } = widths(o), s = new Scene(), torso = { bind:{ chain:'torso' } }, tags = {};
  addTorso(s, o);
  // shirt collar: a ring tilted down at the front
  const ca = 0.3;
  s.add(new Torus([0, BODY_Y + 0.62, 0.004], 0.064, 0.011, basis([0, Math.cos(ca), -Math.sin(ca)])), 0.008, torso);
  // belt and buckle
  s.add(tag(tags, 'belt', new Ellipsoid([0, BELT_Y, 0.005], [0.162 * hx * F.waist ** 0.3, 0.022, 0.116 * F.waist ** 0.5])), 0.006, torso);
  s.add(tag(tags, 'buckle', new RoundBox([0, BELT_Y, 0.005 - 0.116 * F.waist ** 0.5 - 0.002], [0.03, 0.021, 0.006], 0.003)), 0.002, torso);
  for (const side of ['L', 'R']){ s.add(armScene(o, spec, side, F), 0.045); s.add(legScene(spec, side, F, tags), 0.04); }
  return { scene:s, tags };
}

// The torso in its shirt, without arms, legs, collar or belt: the body's core, and what the vest is shaped over.
export function torsoScene(o){ const s = new Scene(); addTorso(s, o); return s; }
function addTorso(s, o){
  const F = factors(o), { bx, hx } = widths(o), g = F.girth, Y = by => BODY_Y + by, torso = { bind:{ chain:'torso' } };
  // pelvis, seat and belly
  s.add(new Ellipsoid([0, Y(0.01), 0.005], [0.165 * hx * F.waist ** 0.3, 0.115, 0.11 * F.waist ** 0.5]), 0, torso);
  for (const x of [-1, 1]) s.add(new Ellipsoid([x * 0.072 * hx, Y(-0.045), 0.055], [0.08 * hx * g, 0.09, 0.07 * g]), 0.03, { bind:{ mix:[['pelvis', 0.5], [x < 0 ? 'hipL_h' : 'hipR_h', 0.5]] } });
  s.add(new Ellipsoid([0, Y(0.17), -0.01], [0.15 * F.waist, 0.14, 0.105 * F.waist]), 0.05, torso);
  if (F.belly) s.add(new Ellipsoid([0, Y(0.14), -0.05], [0.13, 0.11, 0.08]), 0.05, torso);
  // ribcage, shoulder girdle, chest and shoulder blades
  s.add(new Ellipsoid([0, Y(0.37), 0.005], [0.17 * bx * F.chest, 0.18, 0.118 * F.chest]), 0.06, torso);
  s.add(new Ellipsoid([0, Y(0.53), 0.01], [0.178 * bx, 0.075, 0.1]), 0.06, torso);
  for (const x of [-1, 1]){
    // under a work shirt the chest reads as a soft shape, not as muscle
    if (F.female) s.add(new Ellipsoid([x * 0.068, Y(0.38), -0.084], [0.058, 0.052, 0.044]), 0.045, torso);
    else s.add(new Ellipsoid([x * 0.066 * bx, Y(0.43), -0.08], [0.07 * F.chest, 0.05, 0.03]), 0.05, torso);
    s.add(new Ellipsoid([x * 0.085 * bx, Y(0.45), 0.08], [0.07, 0.085, 0.035]), 0.03, torso);
    // trapezius, sloping from behind the neck down to the shoulder
    s.add(new Capsule([x * 0.05, Y(0.635), 0.03], [x * 0.15 * bx, Y(0.6), 0.02], 0.042), 0.035, { bind:{ chain:x < 0 ? 'trapL' : 'trapR' } });
  }
  // the back of the shirt between the trapezius and the neck, so no notch shows at the nape
  s.add(new Ellipsoid([0, Y(0.615), 0.042], [0.06, 0.035, 0.035]), 0.03, torso);
}
function tag(tags, name, p){ (tags[name] = tags[name] || []).push(p); return p; }

function armScene(o, spec, side, F){
  const s = new Scene(), g = F.girth, sh = 'sh' + side, el = 'el' + side, x = side === 'L' ? -1 : 1, bind = { bind:{ chain:'arm' + side } };
  s.add(new Ellipsoid(spec.pt(sh, [x * 0.006, -0.035, 0]), [0.056 * g, 0.08, 0.062 * g], boneFrame(spec, sh)), 0, bind);
  if (o.sleeves === 'short'){
    // a T-shirt sleeve: a loose tube ending in a hem halfway down the upper arm
    s.add(new RoundCone(spec.pt(sh, [0, -0.02, 0]), spec.pt(sh, [0, SHORT_HEM - 0.01, 0]), 0.064 * g, 0.06 * g), 0.02, bind);
    s.add(new Torus(spec.pt(sh, [0, SHORT_HEM + 0.006, 0]), 0.059 * g, 0.006, boneFrame(spec, sh)), 0.005, bind);
    s.int(keepAbove(spec, sh, SHORT_HEM));
    return s;
  }
  s.add(new RoundCone(spec.pt(sh, [0, -0.02, 0]), spec.pt(sh, [0, -UPPER, 0]), 0.058 * g, 0.048 * g), 0.02, bind);
  s.add(new Ellipsoid(spec.pt(sh, [0, -0.16, -0.014]), [0.047 * g, 0.085, 0.049 * g], boneFrame(spec, sh)), 0.02, bind);
  s.add(new Ellipsoid(spec.pt(sh, [0, -0.14, 0.016]), [0.047 * g, 0.1, 0.049 * g], boneFrame(spec, sh)), 0.02, bind);
  s.add(new Sphere(spec.origin(el), 0.047 * g), 0.015, bind);
  s.add(new RoundCone(spec.origin(el), spec.pt(el, [0, -FORE, 0]), 0.049 * g, 0.038 * g), 0.015, bind);
  s.add(new Ellipsoid(spec.pt(el, [0, -0.07, 0.004]), [0.051 * g, 0.085, 0.048 * g], boneFrame(spec, el)), 0.02, bind);
  // sleeve cuff, then the sleeve ends; the bare wrist and hand come out of it (hands.js)
  s.add(new Torus(spec.pt(el, [0, -0.252, 0]), 0.037 * g, 0.0075, boneFrame(spec, el)), 0.006, bind);
  s.int(keepAbove(spec, el, -0.262));
  return s;
}

function legScene(spec, side, F, tags){
  const s = new Scene(), g = F.girth, hip = 'hip' + side, kn = 'kn' + side, x = side === 'L' ? -1 : 1, bind = { bind:{ chain:'leg' + side } };
  s.add(new RoundCone(spec.pt(hip, [0, 0.02, 0]), spec.pt(hip, [0, -THIGH, 0]), 0.098 * g, 0.068 * g), 0, bind);
  s.add(new Ellipsoid(spec.pt(hip, [0, -0.17, -0.022]), [0.072 * g, 0.16, 0.06 * g], boneFrame(spec, hip)), 0.03, bind);
  s.add(new Sphere(spec.origin(kn), 0.067 * g), 0.02, bind);
  s.add(new RoundCone(spec.origin(kn), spec.pt(kn, [0, -SHIN, 0]), 0.066 * g, 0.063 * g), 0.02, bind);
  s.add(new Ellipsoid(spec.pt(kn, [0, -0.12, 0.022]), [0.06 * g, 0.1, 0.056 * g], boneFrame(spec, kn)), 0.03, bind);
  // knee pad and holster pocket, coloured by the shader from their own distance
  s.add(tag(tags, 'pad', new RoundBox(spec.pt(kn, [0, -0.035, -0.066 * g]), [0.052 * g, 0.066, 0.012], 0.008, boneFrame(spec, kn))), 0.006, bind);
  s.add(tag(tags, 'pocket', new RoundBox(spec.pt(hip, [x * 0.05 * g, -0.1, -0.075 * g]), [0.05, 0.072, 0.016], 0.008, boneFrame(spec, hip, 0.12, x * 0.35, 0))), 0.008, bind);
  // the hem sits over the boot shaft
  s.int(keepAbove(spec, kn, -SHIN + 0.005));
  return s;
}

// Per-vertex region distances for the shader (negative = inside the region):
// x: above the waist (shirt) vs below (trousers), y: belt band, z: knee pad, w: pocket.
export function bodyRegions(positions, tags){
  const nv = positions.length / 3, out = new Float32Array(nv * 4), d = (list, x, y, z) => list ? Math.min(...list.map(p => p.dist(x, y, z))) - 0.0015 : 1;
  for (let v = 0; v < nv; v++){
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    out[v * 4] = BELT_Y - y;
    out[v * 4 + 1] = Math.min(Math.abs(y - BELT_Y) - 0.021, d(tags.buckle, x, y, z));
    out[v * 4 + 2] = d(tags.pad, x, y, z);
    out[v * 4 + 3] = d(tags.pocket, x, y, z);
  }
  return out;
}
