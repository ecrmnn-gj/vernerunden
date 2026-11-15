// The figure's skeleton: bone table, bind pose and forward kinematics. Pure (no three.js), so the generator in the
// worker, the main thread and the tests all share it.
//
// The joints that poses.js drives keep the names and pivots of makeHuman (body, shL, elL, hipL, knL, anL and the R
// side), so the existing poses work unchanged. The extra bones (pelvis, spine, chest, clavicles, neck, head, the *_h
// half-joint helpers and the hair chains) are derived from those every frame by refine.js.
//
// The figure is modelled in an A-pose (arms out 0.75 rad): sculpting the arms away from the torso keeps the armpits
// clean, and posing the arms down from there bends the shoulder half as far as from a T-pose.

// [name, parent]. The order is the skeleton's bone index order; never reorder without bumping GEN_VERSION.
export const BONES = [
  ['body', null], ['pelvis', 'body'], ['spine', 'body'], ['chest', 'spine'], ['neckB', 'chest'], ['headB', 'neckB'],
  ['clavL', 'chest'], ['shL', 'clavL'], ['shL_h', 'clavL'], ['elL', 'shL'], ['elL_h', 'shL'],
  ['clavR', 'chest'], ['shR', 'clavR'], ['shR_h', 'clavR'], ['elR', 'shR'], ['elR_h', 'shR'],
  ['hipL', 'pelvis'], ['hipL_h', 'pelvis'], ['knL', 'hipL'], ['knL_h', 'hipL'], ['anL', 'knL'],
  ['hipR', 'pelvis'], ['hipR_h', 'pelvis'], ['knR', 'hipR'], ['knR_h', 'hipR'], ['anR', 'knR'],
  ['pony0', 'headB'], ['pony1', 'pony0'], ['pony2', 'pony1'],
  ['braidL0', 'headB'], ['braidL1', 'braidL0'], ['braidL2', 'braidL1'],
  ['braidR0', 'headB'], ['braidR1', 'braidR0'], ['braidR2', 'braidR1'],
  ['hairBack0', 'headB'], ['hairBack1', 'hairBack0'], ['hairBack2', 'hairBack1']
];
export const BONE_INDEX = Object.fromEntries(BONES.map(([n], i) => [n, i]));
// Joints the existing poses write to; everything else is derived.
export const POSED = ['body', 'shL', 'elL', 'hipL', 'knL', 'anL', 'shR', 'elR', 'hipR', 'knR', 'anR'];

export const BODY_Y = 0.97;
export const UPPER = 0.33, FORE = 0.27, THIGH = 0.44, SHIN = 0.41;
// Shoulder and hip width factors, as makeHuman's bx and hx, plus build.
export function widths(o){
  const female = o.gender === 'female', build = o.build || 'average';
  return {
    bx:(female ? 0.92 : 1) * (build === 'sturdy' ? 1.04 : build === 'slim' ? 0.98 : 1),
    hx:(female ? 1.07 : 1) * (build === 'sturdy' ? 1.03 : build === 'slim' ? 0.97 : 1)
  };
}
// The bind (A-) pose rotations, Euler XYZ like three.js.
export const BIND_ROT = { shL:[0, 0, -0.75], shR:[0, 0, 0.75], elL:[0.15, 0, 0], elR:[0.15, 0, 0], hipL:[0, 0, -0.06], hipR:[0, 0, 0.06] };

// Rest positions of each bone in its parent's space.
function restPositions(o){
  const { bx, hx } = widths(o);
  const P = {
    body:[0, BODY_Y, 0], pelvis:[0, 0, 0], spine:[0, 0.12, 0], chest:[0, 0.34, 0], neckB:[0, 0.24, 0], headB:[0, 0.075, 0.005],
    // hair chains, in the head bone's space: the ponytail hangs from its tie, braids from behind the ears, long hair
    // from the back of the head
    pony0:[0, 0.055, 0.108], pony1:[0, -0.075, 0.012], pony2:[0, -0.075, 0.006],
    braidL0:[-0.05, 0.0, 0.075], braidL1:[0, -0.07, 0.006], braidL2:[0, -0.07, 0.002],
    braidR0:[0.05, 0.0, 0.075], braidR1:[0, -0.07, 0.006], braidR2:[0, -0.07, 0.002],
    hairBack0:[0, 0.0, 0.085], hairBack1:[0, -0.07, 0.006], hairBack2:[0, -0.07, 0.002]
  };
  for (const [s, x] of [['L', -1], ['R', 1]]){
    // the clavicle starts beside the sternum; the shoulder sits at makeHuman's pivot (±0.205·bx, 0.60) in body space
    P['clav' + s] = [x * 0.035, 0.16, 0];
    P['sh' + s] = P['sh' + s + '_h'] = [x * (0.205 * bx - 0.035), -0.02, 0];
    P['el' + s] = P['el' + s + '_h'] = [0, -UPPER, 0];
    P['hip' + s] = P['hip' + s + '_h'] = [x * 0.09 * hx, -0.02, 0];
    P['kn' + s] = P['kn' + s + '_h'] = [0, -THIGH, 0];
    P['an' + s] = [0, -SHIN, 0];
  }
  return P;
}

// 4x4 column-major matrices, like three.js.
export function compose(pos, rot){
  const [x, y, z] = rot, a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  return [c * e, af + be * d, bf - ae * d, 0, -c * f, ae - bf * d, be + af * d, 0, d, -b * c, a * c, 0, pos[0], pos[1], pos[2], 1];
}
export function mul(A, B){
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = A[r] * B[c * 4] + A[4 + r] * B[c * 4 + 1] + A[8 + r] * B[c * 4 + 2] + A[12 + r] * B[c * 4 + 3];
  return o;
}
// Inverse of a rigid transform (rotation + translation).
export function invRigid(M){
  return [M[0], M[4], M[8], 0, M[1], M[5], M[9], 0, M[2], M[6], M[10], 0,
    -(M[0] * M[12] + M[1] * M[13] + M[2] * M[14]), -(M[4] * M[12] + M[5] * M[13] + M[6] * M[14]), -(M[8] * M[12] + M[9] * M[13] + M[10] * M[14]), 1];
}
export const apply = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]];
export const applyDir = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2], M[1] * p[0] + M[5] * p[1] + M[9] * p[2], M[2] * p[0] + M[6] * p[1] + M[10] * p[2]];

// The rig for a set of options: bone rest positions, bind rotations and bind-pose world matrices, plus helpers to
// place things relative to a bone in the bind pose.
export function rigSpec(o){
  const rest = restPositions(o), world = {};
  for (const [n, parent] of BONES){
    const local = compose(rest[n], BIND_ROT[n] || [0, 0, 0]);
    world[n] = parent ? mul(world[parent], local) : local;
  }
  return {
    rest, world,
    // a point given in a bone's local space, in bind-pose world space
    pt:(bone, p) => apply(world[bone], p),
    // a bone's world-to-local rotation as row-major 3x3 (the frame sdf.js primitives take)
    frame:bone => { const M = world[bone]; return [M[0], M[1], M[2], M[4], M[5], M[6], M[8], M[9], M[10]]; },
    origin:bone => [world[bone][12], world[bone][13], world[bone][14]]
  };
}

// Skin-weight chains. A chain is a polyline through joints in the bind pose; a point is weighted by the segment it
// projects onto, blended across each joint over a zone of ±w along the chain. Joints with a half-joint helper blend
// parent, helper and child with quadratic Bernstein weights ((1-s)², 2s(1-s), s²), which keeps volume when they bend.
export function chains(spec){
  const W = n => spec.origin(n), add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const torso = { pts:[[0, 0.80, 0], W('spine'), W('chest'), W('neckB'), W('headB'), [0, 2.1, 0]],
    segs:['pelvis', 'spine', 'chest', 'neckB', 'headB'],
    joints:[{ w:0.06 }, { w:0.08 }, { w:0.035 }, { w:0.03 }] };
  const out = { torso };
  for (const s of ['L', 'R']){
    const tip = spec.pt('el' + s, [0, -FORE - 0.2, 0]);
    out['arm' + s] = { pts:[W('clav' + s), W('sh' + s), W('el' + s), tip], segs:['clav' + s, 'sh' + s, 'el' + s],
      joints:[{ w:0.05, helper:'sh' + s + '_h' }, { w:0.05, helper:'el' + s + '_h' }] };
    // from the neck out along the trapezius to the shoulder: chest, then clavicle
    out['trap' + s] = { pts:[add(W('neckB'), [0, -0.05, 0]), W('sh' + s)], segs:['chest', 'clav' + s], mid:0.45, joints:[{ w:0.07 }] };
    const toe = spec.pt('an' + s, [0, -0.06, -0.2]);
    out['leg' + s] = { pts:[add(W('hip' + s), [0, 0.12, 0]), W('hip' + s), W('kn' + s), W('an' + s), toe], segs:['pelvis', 'hip' + s, 'kn' + s, 'an' + s],
      joints:[{ w:0.06, helper:'hip' + s + '_h' }, { w:0.05, helper:'kn' + s + '_h' }, { w:0.035 }] };
  }
  return out;
}
// Weights [[bone, w], ...] of point p on a chain.
export function chainWeights(ch, p){
  // closest point on the polyline, as arc length t
  let best = Infinity, bt = 0, acc = 0;
  const arcs = [0];
  for (let i = 0; i < ch.pts.length - 1; i++){
    const a = ch.pts[i], b = ch.pts[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...ab);
    let u = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (L * L); u = u < 0 ? 0 : u > 1 ? 1 : u;
    const d = Math.hypot(a[0] + ab[0] * u - p[0], a[1] + ab[1] * u - p[1], a[2] + ab[2] * u - p[2]);
    if (d < best){ best = d; bt = acc + u * L; }
    acc += L; arcs.push(acc);
  }
  // joints sit at interior polyline points (the 'mid' option puts a single joint partway along a two-point chain)
  const jointAt = ch.mid != null ? [arcs[1] * ch.mid] : arcs.slice(1, -1);
  if (ch.mid != null){
    const j = ch.joints[0], s = smooth01((bt - (jointAt[0] - j.w)) / (2 * j.w));
    return mix2(ch.segs[0], ch.segs[1], s);
  }
  for (let i = 0; i < jointAt.length; i++){
    const j = ch.joints[i], a0 = jointAt[i] - j.w, a1 = jointAt[i] + j.w;
    if (bt < a0) return [[ch.segs[i], 1]];
    if (bt <= a1){
      const s = (bt - a0) / (a1 - a0);
      if (j.helper) return [[ch.segs[i], (1 - s) * (1 - s)], [j.helper, 2 * s * (1 - s)], [ch.segs[i + 1], s * s]];
      return mix2(ch.segs[i], ch.segs[i + 1], smooth01(s));
    }
  }
  return [[ch.segs[ch.segs.length - 1], 1]];
}
const smooth01 = s => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };
const mix2 = (a, b, s) => s <= 0 ? [[a, 1]] : s >= 1 ? [[b, 1]] : [[a, 1 - s], [b, s]];
