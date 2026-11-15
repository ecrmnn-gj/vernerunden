// Shared head measurements, in the head bone's space (y up, facing -z): face shapes, landmarks, the cranium the hair
// grows on, the scalp and beard areas, and the hard hat's fit per hair style. The head, hair and beard parts and the
// helmet all use these, so they always line up.
import { Scene, Sphere, Capsule, Ellipsoid, Plane, smin, smax } from './sdf.js';
import { factors } from './shape.js';

export const FACE_SHAPES = {
  oval:{ w:1, jaw:1, jawK:0.025, chin:1, tall:1, cheek:1 },
  round:{ w:1.06, jaw:1.1, jawK:0.04, chin:0.85, tall:0.96, cheek:1.15 },
  square:{ w:1.03, jaw:1.16, jawK:0.012, chin:1.12, tall:1, cheek:0.95 },
  long:{ w:0.95, jaw:0.95, jawK:0.025, chin:1.05, tall:1.08, cheek:0.95 }
};

// Where the eyes, brows and mouth go. Used by the sculpt and by assemble.js to place the eyeballs and lids.
export function headLandmarks(o){
  const F = factors(o), fs = FACE_SHAPES[o.face] || FACE_SHAPES.oval, k = F.female ? 0.95 : 1;
  const eyeY = 0.036 * fs.tall, eyeX = 0.032 * k * fs.w ** 0.5, eyeZ = -0.08 * k;
  return {
    k, fs, female:F.female,
    eye:{ r:0.0122 * k, L:[-eyeX, eyeY, eyeZ], R:[eyeX, eyeY, eyeZ] },
    // a brow as two segments, inner to outer, slightly arched; thick is the half-width of the painted band
    brow:{ inner:[0.013 * k, eyeY + 0.021, -0.096 * k], mid:[0.032 * k * fs.w, eyeY + 0.026, -0.094 * k], outer:[0.05 * k * fs.w, eyeY + 0.02, -0.083 * k], thick:F.female ? 0.0028 : 0.0042 },
    mouth:{ y:-0.037 * fs.tall, z:-0.096 * k, w:(F.female ? 0.021 : 0.023) * k },
    nose:[0, -0.006, -0.113 * k]
  };
}

// The cranium: the head's main ellipsoid, which hair grows on.
export function cranium(o){
  const L = headLandmarks(o), { k, fs } = L;
  return new Ellipsoid([0, 0.07 * fs.tall, 0.012], [0.077 * k * fs.w, 0.097 * k * fs.tall, 0.098 * k]);
}

// A primitive from a plain distance function, with bounds.
export class Fn {
  constructor(fn, bounds){ this.fn = fn; this.bounds = bounds; }
  dist(x, y, z){ return this.fn(x, y, z); }
}

// Where hair grows (negative inside): the top and back of the head down to the nape, with the hairline about
// 5 cm above the brows, and not over the ears.
export function scalpMask(o){
  const { k, fs } = headLandmarks(o);
  const E = new Ellipsoid([0, 0.095 * fs.tall, 0.045], [0.105 * k * fs.w, 0.112 * k * fs.tall, 0.125 * k]);
  const ears = [-1, 1].map(x => new Sphere([x * 0.077 * k * fs.w, 0.022, 0.012], 0.028));
  return new Fn((x, y, z) => smax(E.dist(x, y, z), -Math.min(ears[0].dist(x, y, z), ears[1].dist(x, y, z)), 0.01), E.bounds);
}

// Where a full beard grows (negative inside): jaw, cheeks below the cheek line, chin, upper lip and under the jaw,
// but not on the lips or the nose.
export function beardArea(o){
  const L = headLandmarks(o), { k } = L, M = L.mouth;
  const E = new Ellipsoid([0, -0.045, -0.035], [0.086 * k * L.fs.w * L.fs.jaw ** 0.5, 0.072, 0.09 * k]);
  // the mouth is kept clear with a capsule: its round ends can't cut a thin wedge into the beard at the corners
  const lips = [new Capsule([-M.w + 0.004, M.y, M.z + 0.002], [M.w - 0.004, M.y, M.z + 0.002], 0.0125), new Ellipsoid([0, M.y - 0.006, M.z + 0.0012], [M.w * 0.88 + 0.004, 0.0105, 0.013])];
  const nose = new Sphere(L.nose, 0.021);
  return new Fn((x, y, z) => {
    // the cheek line rises from the mouth towards the sideburns in front of the ears
    const cheek = y - (-0.004 + 0.42 * (z + 0.08 * k));
    let d = smax(E.dist(x, y, z), cheek, 0.006);
    d = smax(d, -Math.min(lips[0].dist(x, y, z), lips[1].dist(x, y, z)), 0.006);
    return smax(d, -nose.dist(x, y, z), 0.004);
  }, E.bounds);
}

// The hard hat sits on the hair: bigger and higher over an afro, lower on a shaved head.
export const HELMET_FIT = {
  short:{ s:1, lift:0.002 }, buzz:{ s:0.98, lift:-0.004 }, bald:{ s:0.98, lift:-0.004 }, long:{ s:1.01, lift:0.002 },
  ponytail:{ s:1, lift:0 }, bun:{ s:1, lift:0 }, braids:{ s:1, lift:0 }, curly:{ s:1.05, lift:0.008 }, afro:{ s:1.2, lift:0.022 }
};
export const HELMET = { y:0.095, z:0.004, outer:[0.118, 0.115, 0.135], inner:[0.112, 0.109, 0.129] };
export function helmetFit(o){ return HELMET_FIT[o.hairStyle] || HELMET_FIT.short; }
// The space inside the helmet's dome (negative inside), where hair under the helmet is cut away.
export function helmetInside(o){
  const f = helmetFit(o), c = [0, HELMET.y + f.lift, HELMET.z], r = HELMET.inner.map(v => v * f.s);
  const E = new Ellipsoid(c, r), floor = c[1] - 0.012;
  return new Fn((x, y, z) => Math.max(E.dist(x, y, z), floor - y), E.bounds);
}
export { Scene, Sphere, Capsule, Plane, smin, smax };
