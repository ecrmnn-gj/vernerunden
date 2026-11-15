// The head and neck, in the head bone's local space (y up, facing -z), so one head fits every body build.
// The neck reaches down inside the torso; the shirt collar hides where it meets the body part.
//
// Proportions follow the classic thirds: the eyes sit halfway between chin and crown, the base of the nose and the
// brow ridge divide the face in three. Fine lines (lip border, mouth line, eyebrows) are drawn by the shader from
// region distances rather than carved, so they stay crisp at any mesh resolution; eyes and lids are separate meshes.
import { Scene, Sphere, Capsule, RoundCone, Ellipsoid, Plane } from './sdf.js';
import { factors } from './shape.js';

// Face shapes as factors on the base proportions.
export const FACE_SHAPES = {
  oval:{ w:1, jaw:1, jawK:0.025, chin:1, tall:1, cheek:1 },
  round:{ w:1.06, jaw:1.1, jawK:0.04, chin:0.85, tall:0.96, cheek:1.15 },
  square:{ w:1.03, jaw:1.16, jawK:0.012, chin:1.12, tall:1, cheek:0.95 },
  long:{ w:0.95, jaw:0.95, jawK:0.025, chin:1.05, tall:1.08, cheek:0.95 }
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

// Where the eyes, brows and mouth go for these options. Used by the sculpt here and by assemble.js to place the
// eyeballs and lids, so the two always agree.
export function headLandmarks(o){
  const F = factors(o), fs = FACE_SHAPES[o.face] || FACE_SHAPES.oval, k = F.female ? 0.95 : 1;
  const eyeY = 0.036 * fs.tall, eyeX = 0.032 * k * fs.w ** 0.5, eyeZ = -0.08 * k;
  return {
    k, fs, female:F.female,
    eye:{ r:0.0122 * k, L:[-eyeX, eyeY, eyeZ], R:[eyeX, eyeY, eyeZ] },
    // a brow as two segments, inner to outer, slightly arched; thickness is the half-width of the painted band
    brow:{ inner:[0.013 * k, eyeY + 0.021, -0.096 * k], mid:[0.032 * k * fs.w, eyeY + 0.026, -0.094 * k], outer:[0.05 * k * fs.w, eyeY + 0.02, -0.083 * k], thick:F.female ? 0.0028 : 0.0042 },
    mouth:{ y:-0.037 * fs.tall, z:-0.096 * k, w:(F.female ? 0.021 : 0.023) * k }
  };
}

export function headScene(o){
  const F = factors(o), L = headLandmarks(o), { k, fs } = L, f = F.female;
  const s = new Scene(), bind = { bind:{ fn:headWeights } }, tags = {};
  // neck, with an Adam's apple on men
  s.add(new RoundCone([0, -0.24, 0], [0, -0.03, 0.02], (f ? 0.058 : 0.066) * F.girth ** 0.5, f ? 0.051 : 0.058), 0, bind);
  if (!f) s.add(new Ellipsoid([0, -0.115, -0.048], [0.01, 0.016, 0.01]), 0.012, bind);
  // cranium, face mass, jaw and chin
  s.add(new Ellipsoid([0, 0.07 * fs.tall, 0.012], [0.077 * k * fs.w, 0.097 * k * fs.tall, 0.098 * k]), 0.03, bind);
  s.add(new Ellipsoid([0, 0.006, -0.03], [0.066 * k * fs.w, 0.08 * k * fs.tall, 0.066 * k]), 0.03, bind);
  s.add(new Ellipsoid([0, -0.042 * fs.tall, -0.028], [0.06 * k * fs.jaw * (f ? 0.9 : 1), 0.042, 0.06 * k]), fs.jawK, bind);
  s.add(new Sphere([0, -0.066 * fs.tall * fs.chin, -0.068 * k], (f ? 0.019 : 0.022) * k * fs.chin), 0.02, bind);
  // brow ridge and cheekbones
  s.add(new Capsule([-0.042 * k, L.brow.mid[1] - 0.004, -0.086 * k], [0.042 * k, L.brow.mid[1] - 0.004, -0.086 * k], f ? 0.008 : 0.011), 0.02, bind);
  for (const x of [-1, 1]) s.add(new Ellipsoid([x * 0.044 * k * fs.w, 0.008, -0.068 * k], [0.026 * fs.cheek, 0.018, 0.02]), 0.03, bind);
  // eye sockets: the eyeballs (separate meshes) sit in them with the lids just in front
  for (const e of [L.eye.L, L.eye.R]) s.sub(new Sphere(e, L.eye.r + 0.0014), 0.004);
  // nose: bridge, tip and the wings either side, with nostrils
  const nk = (f ? 0.88 : 1) * k;
  s.add(new RoundCone([0, L.eye.L[1] + 0.008, -0.092 * k], [0, -0.002, -0.114 * k], 0.0065 * nk, 0.0085 * nk), 0.008, bind);
  s.add(new Sphere([0, -0.006, -0.113 * k], 0.0105 * nk), 0.006, bind);
  for (const x of [-1, 1]){
    s.add(new Sphere([x * 0.0115 * nk, -0.011, -0.103 * k], 0.0082 * nk), 0.006, bind);
    s.sub(new Sphere([x * 0.0072 * nk, -0.0175, -0.1065 * k], 0.0038 * nk), 0.002);
  }
  // lips
  const M = L.mouth, lips = [
    new Ellipsoid([0, M.y + 0.0055, M.z], [M.w, f ? 0.0062 : 0.005, 0.0085]),
    new Ellipsoid([0, M.y - 0.006, M.z + 0.0012], [M.w * 0.88, f ? 0.007 : 0.006, 0.0085])
  ];
  for (const lp of lips) s.add(lp, 0.006, bind);
  tags.lips = lips;
  // ears, with a hollow
  for (const x of [-1, 1]){
    s.add(new Ellipsoid([x * 0.077 * k * fs.w, 0.022, 0.012], [0.011, 0.03, 0.019]), 0.006, bind);
    s.sub(new Sphere([x * 0.086 * k * fs.w, 0.018, 0.008], 0.0085), 0.003);
  }
  // the neck ends inside the torso
  s.int(new Plane([0, -1, 0], 0.235));
  return { scene:s, tags, landmarks:L };
}

// Distance from p to a polyline (list of points).
function segDist(p, a, b){
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  let t = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]); t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}
// Region distances for the head (negative = inside):
// region:  x lips, y mouth line, z eyebrows, w (spare)
// region2: x beard/stubble area, y scalp (buzz cut), z cheek blush, w (spare)
export function headRegions(positions, tags, L){
  const nv = positions.length / 3, r1 = new Float32Array(nv * 4), r2 = new Float32Array(nv * 4).fill(1), M = L.mouth;
  for (let v = 0; v < nv; v++){
    const p = [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]];
    r1[v * 4] = Math.min(tags.lips[0].dist(...p), tags.lips[1].dist(...p)) - 0.0012;
    // the mouth line: where the lips meet, fading out at the corners
    const across = Math.abs(p[0]) / M.w;
    r1[v * 4 + 1] = p[2] < M.z + 0.004 && across < 1 ? Math.abs(p[1] - M.y) - 0.0009 * (1 - across * across) - 0.0002 : 1;
    // brows on the front of the head only
    let b = 1;
    if (p[2] < -0.07){
      const x = Math.abs(p[0]), q = [x, p[1], p[2]], B = L.brow;
      const d = Math.min(segDist(q, B.inner, B.mid), segDist(q, B.mid, B.outer));
      // thicker at the inner end, tapering outwards
      const taper = 1 - 0.45 * Math.min(1, Math.max(0, (x - B.inner[0]) / (B.outer[0] - B.inner[0])));
      b = d - B.thick * taper;
    }
    r1[v * 4 + 2] = b;
    r1[v * 4 + 3] = 1;
    // cheeks: a soft blush area (the shader uses it as a gradient, not a line)
    r2[v * 4 + 2] = Math.hypot(Math.abs(p[0]) - 0.045 * L.k, p[1] + 0.005, (p[2] + 0.08) * 0.6) - 0.022;
  }
  return { region:r1, region2:r2 };
}
