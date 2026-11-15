// The head and neck, in the head bone's local space (y up, facing -z), so one head fits every body build.
// The neck reaches down inside the torso; the shirt collar hides where it meets the body part.
import { Scene, Sphere, RoundCone, Ellipsoid, Plane } from './sdf.js';
import { factors } from './shape.js';

// Face shapes as factors on the base proportions.
export const FACE_SHAPES = {
  oval:{ w:1, jaw:1, jawK:0.025, chin:1, tall:1 },
  round:{ w:1.06, jaw:1.1, jawK:0.04, chin:0.85, tall:0.96 },
  square:{ w:1.03, jaw:1.16, jawK:0.012, chin:1.1, tall:1 },
  long:{ w:0.95, jaw:0.95, jawK:0.025, chin:1.05, tall:1.08 }
};

// Neck and head weights along local y: chest at the base of the neck, then neck, then head.
function headWeights(p){
  const y = p[1];
  if (y < -0.135) return [['chest', 1]];
  if (y < -0.065){ const s = sm((y + 0.135) / 0.07); return [['chest', 1 - s], ['neckB', s]]; }
  if (y < -0.06) return [['neckB', 1]];
  if (y < 0.04){ const s = sm((y + 0.06) / 0.1); return [['neckB', 1 - s], ['headB', s]]; }
  return [['headB', 1]];
}
const sm = s => s * s * (3 - 2 * s);

export function headScene(o){
  const F = factors(o), fs = FACE_SHAPES[o.face] || FACE_SHAPES.oval, k = F.female ? 0.95 : 1;
  const s = new Scene(), bind = { bind:{ fn:headWeights } };
  s.add(new RoundCone([0, -0.24, 0], [0, -0.03, 0.02], (F.female ? 0.054 : 0.062) * F.girth ** 0.5, F.female ? 0.048 : 0.054), 0, bind);
  s.add(new Ellipsoid([0, 0.07 * fs.tall, 0.012], [0.077 * k * fs.w, 0.097 * k * fs.tall, 0.098 * k]), 0.03, bind);
  s.add(new Ellipsoid([0, 0, -0.035], [0.066 * k * fs.w, 0.085 * k * fs.tall, 0.07 * k]), 0.03, bind);
  s.add(new Ellipsoid([0, -0.04 * fs.tall, -0.03], [0.062 * k * fs.jaw * (F.female ? 0.9 : 1), 0.045, 0.065 * k]), fs.jawK, bind);
  s.add(new Sphere([0, -0.068 * fs.tall * fs.chin, -0.07], 0.024 * k * (F.female ? 0.9 : 1)), 0.02, bind);
  for (const x of [-1, 1]) s.add(new Ellipsoid([x * 0.077 * k * fs.w, 0.01, 0.012], [0.011, 0.03, 0.019]), 0.006, bind);
  s.add(new RoundCone([0, 0.03, -0.098 * k], [0, -0.005, -0.112 * k], 0.009, 0.014), 0.006, bind);
  // the neck ends inside the torso
  s.int(new Plane([0, -1, 0], 0.235));
  return { scene:s };
}
