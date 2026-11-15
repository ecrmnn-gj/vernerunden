// Signed distance primitives and a scene that blends them. Inside is negative. Units are metres.
// Formulas after Inigo Quilez (iquilezles.org/articles/distfunctions). Every primitive has an axis-aligned bounding
// box, so the grid can skip primitives that are far from the part of space it is sampling.
import { valueNoise3 } from './rng.js';

const INF = 1e9;
// Room for distance functions that are close to, but not exactly, true distances (the ellipsoid).
const SKIP_SLACK = 0.002;
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const sphereBounds = (cx, cy, cz, r) => [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r];
const segBounds = (a, b, r) => [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r];

// An orthonormal frame as a row-major 3x3 world-to-local matrix: rows are the local x, y, z axes in world space.
// basis(yAxis, zHint) makes local y point along yAxis, with local z as close to zHint as possible.
export function basis(yAxis, zHint = [0, 0, 1]){
  let [yx, yy, yz] = yAxis; const yl = len3(yx, yy, yz); yx /= yl; yy /= yl; yz /= yl;
  let [zx, zy, zz] = zHint; const d = zx * yx + zy * yy + zz * yz; zx -= d * yx; zy -= d * yy; zz -= d * yz;
  let zl = len3(zx, zy, zz);
  if (zl < 1e-6){ [zx, zy, zz] = Math.abs(yx) < 0.9 ? [1, 0, 0] : [0, 0, 1]; const d2 = zx * yx + zy * yy + zz * yz; zx -= d2 * yx; zy -= d2 * yy; zz -= d2 * yz; zl = len3(zx, zy, zz); }
  zx /= zl; zy /= zl; zz /= zl;
  const xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
  return [xx, xy, xz, yx, yy, yz, zx, zy, zz];
}
// Rotation about the coordinate axes (radians, applied x then y then z), as a world-to-local frame.
export function euler(rx = 0, ry = 0, rz = 0){
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // local-to-world R = Rz Ry Rx; rows of R^T are its columns
  const m = [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz, cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz, -sy, sx * cy, cx * cy];
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}
// Bounds of a box with local half extents (ex, ey, ez) in a frame R (world-to-local rows).
function frameBounds(c, R, ex, ey, ez){
  const hx = Math.abs(R[0]) * ex + Math.abs(R[3]) * ey + Math.abs(R[6]) * ez;
  const hy = Math.abs(R[1]) * ex + Math.abs(R[4]) * ey + Math.abs(R[7]) * ez;
  const hz = Math.abs(R[2]) * ex + Math.abs(R[5]) * ey + Math.abs(R[8]) * ez;
  return [c[0] - hx, c[1] - hy, c[2] - hz, c[0] + hx, c[1] + hy, c[2] + hz];
}

export class Sphere {
  constructor(c, r){ this.cx = c[0]; this.cy = c[1]; this.cz = c[2]; this.r = r; this.bounds = sphereBounds(c[0], c[1], c[2], r); }
  dist(x, y, z){ return len3(x - this.cx, y - this.cy, z - this.cz) - this.r; }
}
export class Capsule {
  constructor(a, b, r){
    this.a = a; this.r = r; this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
    this.il = 1 / Math.max(1e-12, this.bx * this.bx + this.by * this.by + this.bz * this.bz); this.bounds = segBounds(a, b, r);
  }
  dist(x, y, z){
    const px = x - this.a[0], py = y - this.a[1], pz = z - this.a[2];
    let h = (px * this.bx + py * this.by + pz * this.bz) * this.il; h = h < 0 ? 0 : h > 1 ? 1 : h;
    return len3(px - this.bx * h, py - this.by * h, pz - this.bz * h) - this.r;
  }
}
// A capsule whose radius changes linearly from r1 at a to r2 at b: the basic limb segment. Exact.
export class RoundCone {
  constructor(a, b, r1, r2){
    this.a = a; this.r1 = r1; this.r2 = r2;
    this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
    this.l2 = this.bx * this.bx + this.by * this.by + this.bz * this.bz; this.rr = r1 - r2;
    this.a2 = this.l2 - this.rr * this.rr; this.il2 = 1 / this.l2;
    this.bounds = segBounds(a, b, Math.max(r1, r2));
  }
  dist(x, y, z){
    const { bx, by, bz, l2, rr, a2, il2 } = this;
    const px = x - this.a[0], py = y - this.a[1], pz = z - this.a[2];
    const yy = px * bx + py * by + pz * bz, zz = yy - l2;
    const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy;
    const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - this.r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - this.r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - this.r1;
  }
}
// Ellipsoid with radii r = [rx, ry, rz] in frame R. Bound-corrected approximation: close to exact near the surface.
export class Ellipsoid {
  constructor(c, r, R){
    this.c = c; this.rx = r[0]; this.ry = r[1]; this.rz = r[2]; this.R = R || null; this.rmin = Math.min(r[0], r[1], r[2]);
    this.bounds = R ? frameBounds(c, R, r[0], r[1], r[2]) : [c[0] - r[0], c[1] - r[1], c[2] - r[2], c[0] + r[0], c[1] + r[1], c[2] + r[2]];
  }
  dist(x, y, z){
    let px = x - this.c[0], py = y - this.c[1], pz = z - this.c[2];
    const R = this.R;
    if (R){ const lx = R[0] * px + R[1] * py + R[2] * pz, ly = R[3] * px + R[4] * py + R[5] * pz, lz = R[6] * px + R[7] * py + R[8] * pz; px = lx; py = ly; pz = lz; }
    const k0 = len3(px / this.rx, py / this.ry, pz / this.rz), k1 = len3(px / (this.rx * this.rx), py / (this.ry * this.ry), pz / (this.rz * this.rz));
    return k1 < 1e-12 ? -this.rmin : k0 * (k0 - 1) / k1;
  }
}
// Box with half extents e and rounded edges of radius r, in frame R.
export class RoundBox {
  constructor(c, e, r, R){ this.c = c; this.ex = e[0] - r; this.ey = e[1] - r; this.ez = e[2] - r; this.r = r; this.R = R || null; this.bounds = R ? frameBounds(c, R, e[0], e[1], e[2]) : [c[0] - e[0], c[1] - e[1], c[2] - e[2], c[0] + e[0], c[1] + e[1], c[2] + e[2]]; }
  dist(x, y, z){
    let px = x - this.c[0], py = y - this.c[1], pz = z - this.c[2];
    const R = this.R;
    if (R){ const lx = R[0] * px + R[1] * py + R[2] * pz, ly = R[3] * px + R[4] * py + R[5] * pz, lz = R[6] * px + R[7] * py + R[8] * pz; px = lx; py = ly; pz = lz; }
    const qx = Math.abs(px) - this.ex, qy = Math.abs(py) - this.ey, qz = Math.abs(pz) - this.ez;
    return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - this.r;
  }
}
// Torus around the local y axis: ring radius R0, tube radius r.
export class Torus {
  constructor(c, R0, r, R){ this.c = c; this.R0 = R0; this.r = r; this.R = R || null; this.bounds = R ? frameBounds(c, R, R0 + r, r, R0 + r) : [c[0] - R0 - r, c[1] - r, c[2] - R0 - r, c[0] + R0 + r, c[1] + r, c[2] + R0 + r]; }
  dist(x, y, z){
    let px = x - this.c[0], py = y - this.c[1], pz = z - this.c[2];
    const R = this.R;
    if (R){ const lx = R[0] * px + R[1] * py + R[2] * pz, ly = R[3] * px + R[4] * py + R[5] * pz, lz = R[6] * px + R[7] * py + R[8] * pz; px = lx; py = ly; pz = lz; }
    return len3(Math.sqrt(px * px + pz * pz) - this.R0, py, 0) - this.r;
  }
}
// Capped cylinder along the local y axis: radius r, half height h.
export class Cylinder {
  constructor(c, r, h, R){ this.c = c; this.r = r; this.h = h; this.R = R || null; this.bounds = R ? frameBounds(c, R, r, h, r) : [c[0] - r, c[1] - h, c[2] - r, c[0] + r, c[1] + h, c[2] + r]; }
  dist(x, y, z){
    let px = x - this.c[0], py = y - this.c[1], pz = z - this.c[2];
    const R = this.R;
    if (R){ const lx = R[0] * px + R[1] * py + R[2] * pz, ly = R[3] * px + R[4] * py + R[5] * pz, lz = R[6] * px + R[7] * py + R[8] * pz; px = lx; py = ly; pz = lz; }
    const dx = Math.sqrt(px * px + pz * pz) - this.r, dy = Math.abs(py) - this.h;
    return Math.min(Math.max(dx, dy), 0) + len3(Math.max(dx, 0), Math.max(dy, 0), 0);
  }
}
// Half-space: negative on the side the normal points away from (dot(n, p) < d). Unbounded.
export class Plane {
  constructor(n, d){ const l = len3(n[0], n[1], n[2]); this.nx = n[0] / l; this.ny = n[1] / l; this.nz = n[2] / l; this.d = d; this.bounds = null; }
  dist(x, y, z){ return x * this.nx + y * this.ny + z * this.nz - this.d; }
}
// Grows (t > 0) or shrinks a primitive by a constant distance.
export class Offset {
  constructor(p, t){ this.p = p; this.t = t; this.bounds = p.bounds && p.bounds.map((v, i) => i < 3 ? v - Math.max(t, 0) : v + Math.max(t, 0)); }
  dist(x, y, z){ return this.p.dist(x, y, z) - this.t; }
}
// Adds smooth noise of amplitude amp to a primitive's surface (curls, clumps). freq in cycles per metre.
export class Warp {
  constructor(p, amp, freq, seed){ this.p = p; this.amp = amp; this.f = freq; this.n = valueNoise3(seed); this.bounds = p.bounds && p.bounds.map((v, i) => i < 3 ? v - amp : v + amp); }
  dist(x, y, z){ return this.p.dist(x, y, z) + this.amp * this.n(x * this.f, y * this.f, z * this.f); }
}

// Polynomial smooth min/max: blend radius k; with k = 0 (or far apart) exactly min/max.
export function smin(a, b, k){
  if (k <= 0) return a < b ? a : b;
  const h = k - Math.abs(a - b);
  return h <= 0 ? (a < b ? a : b) : (a < b ? a : b) - h * h * 0.25 / k;
}
export function smax(a, b, k){ return -smin(-a, -b, k); }

export const ADD = 0, SUB = 1, INT = 2;
// A scene is an ordered list of nodes { p, op, k, tag, bind }: each node is unioned (ADD), cut away (SUB) or intersected
// (INT) with everything before it, blended over radius k. tag and bind are carried for the skin-weight pass.
export class Scene {
  constructor(){ this.nodes = []; this.bounds = null; }
  add(p, k = 0, extra){ return this._push(p, ADD, k, extra); }
  sub(p, k = 0, extra){ return this._push(p, SUB, k, extra); }
  int(p, k = 0, extra){ return this._push(p, INT, k, extra); }
  _push(p, op, k, extra){
    const n = Object.assign({ p, op, k, i:this.nodes.length }, extra);
    this.nodes.push(n);
    if (op === ADD && p.bounds){
      const b = this.bounds;
      this.bounds = b ? [Math.min(b[0], p.bounds[0]), Math.min(b[1], p.bounds[1]), Math.min(b[2], p.bounds[2]), Math.max(b[3], p.bounds[3]), Math.max(b[4], p.bounds[4]), Math.max(b[5], p.bounds[5])] : p.bounds.slice();
    }
    return n;
  }
  dist(x, y, z){ return this.distC(x, y, z, null); }
  // Distance using only the nodes listed in cand (indices in scene order), or all nodes when cand is null.
  // A node whose bounding box is farther away than it could matter is skipped without evaluating it: the distance to
  // a primitive is at least the distance to its box, so a union node beyond d + k, or a cut-away node beyond k - d,
  // can't change the result. This is what keeps nested scenes (an arm, the torso under the vest) cheap.
  distC(x, y, z, cand){
    const nodes = this.nodes, n = cand ? cand.length : nodes.length;
    let d = INF;
    for (let j = 0; j < n; j++){
      const nd = nodes[cand ? cand[j] : j], b = nd.p.bounds;
      if (b && nd.op !== INT && d < INF){
        const ex = b[0] - x > 0 ? b[0] - x : x - b[3] > 0 ? x - b[3] : 0, ey = b[1] - y > 0 ? b[1] - y : y - b[4] > 0 ? y - b[4] : 0, ez = b[2] - z > 0 ? b[2] - z : z - b[5] > 0 ? z - b[5] : 0;
        const lb = ex * ex + ey * ey + ez * ez, lim = (nd.op === ADD ? d + nd.k : nd.k - d) + SKIP_SLACK;
        if (lim <= 0 || lb > lim * lim) continue;
      }
      const di = nd.p.dist(x, y, z);
      d = nd.op === ADD ? smin(d, di, nd.k) : nd.op === SUB ? smax(d, -di, nd.k) : smax(d, di, nd.k);
    }
    return d;
  }
  // Indices of the nodes that can affect points inside box (minx, miny, minz, maxx, maxy, maxz), given a margin
  // beyond each node's blend radius. A node outside that is guaranteed to leave the field near the surface unchanged.
  // Intersections are never skipped: outside one, everything is outside, which only evaluating it says.
  candidates(b, margin){
    const out = [];
    let anyAdd = false;
    for (const nd of this.nodes){
      const pb = nd.p.bounds, m = nd.k + margin;
      if (pb && nd.op !== INT && (pb[0] - m > b[3] || pb[3] + m < b[0] || pb[1] - m > b[4] || pb[4] + m < b[1] || pb[2] - m > b[5] || pb[5] + m < b[2])) continue;
      out.push(nd.i); if (nd.op === ADD) anyAdd = true;
    }
    return anyAdd ? out : null;
  }
}
