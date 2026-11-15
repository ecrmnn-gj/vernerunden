// Shared shape helpers for the part recipes: proportion factors per gender and build, and clip planes along bones.
import { Plane } from './sdf.js';

// Girth and shape factors. Height never changes with build, so the figure's hitbox stays the same.
export function factors(o){
  const female = o.gender === 'female', b = o.build || 'average';
  return {
    female,
    girth:(b === 'slim' ? 0.86 : b === 'sturdy' ? 1.16 : 1) * (female ? 0.92 : 1),
    waist:(b === 'slim' ? 0.86 : b === 'sturdy' ? 1.22 : 1) * (female ? 0.88 : 1),
    chest:(b === 'slim' ? 0.93 : b === 'sturdy' ? 1.09 : 1) * (female ? 0.93 : 1),
    belly:b === 'sturdy',
    hand:female ? 0.92 : 1
  };
}
// The bone's local y axis and origin in bind-pose world space.
export function boneAxis(spec, bone){ const f = spec.frame(bone); return { o:spec.origin(bone), y:[f[3], f[4], f[5]] }; }
// Half-spaces across a bone: inside where the point's local y is above (keepAbove) or below (keepBelow) ly.
export function keepAbove(spec, bone, ly){ const { o, y } = boneAxis(spec, bone); return new Plane([-y[0], -y[1], -y[2]], -(y[0] * o[0] + y[1] * o[1] + y[2] * o[2] + ly)); }
export function keepBelow(spec, bone, ly){ const { o, y } = boneAxis(spec, bone); return new Plane(y, y[0] * o[0] + y[1] * o[1] + y[2] * o[2] + ly); }
// Local y of a world point along a bone.
export function localY(spec, bone, p){ const { o, y } = boneAxis(spec, bone); return (p[0] - o[0]) * y[0] + (p[1] - o[1]) * y[1] + (p[2] - o[2]) * y[2]; }
// A frame for sdf.js primitives aligned with a bone, optionally rotated about the bone's local x/y/z first.
export function boneFrame(spec, bone, rx = 0, ry = 0, rz = 0){
  const R = spec.frame(bone);
  if (!rx && !ry && !rz) return R;
  // local rotation (x then y then z) composed with the bone frame: rows of (Rb^T * Rl)^T = Rl^T * Rb
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const L = [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz, cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz, -sy, sx * cy, cx * cy]; // local-to-bone, row-major
  const out = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[r * 3 + c] = L[0 * 3 + r] * R[0 * 3 + c] + L[1 * 3 + r] * R[1 * 3 + c] + L[2 * 3 + r] * R[2 * 3 + c];
  return out;
}
