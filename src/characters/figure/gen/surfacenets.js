// Surface Nets: one vertex per grid cell that the surface passes through, joined into quads across every grid edge
// with a sign change. Watertight by construction; about half the triangles of marching cubes. Each vertex starts at
// the mean of its cell's edge crossings and is then pulled onto the true surface with Newton steps along the gradient,
// which recovers detail smaller than a cell (lips, nostrils, the brow ridge).
import { cellCandidates } from './grid.js';

const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
const TET = [[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]];

// Gradient of the scene at a point by the tetrahedron technique (4 evaluations), into out.
function gradient(scene, cand, x, y, z, e, out){
  let gx = 0, gy = 0, gz = 0;
  for (const [a, b, c] of TET){ const f = scene.distC(x + a * e, y + b * e, z + c * e, cand); gx += a * f; gy += b * f; gz += c * f; }
  out[0] = gx; out[1] = gy; out[2] = gz;
  return out;
}

// G: a grid from sampleGrid. Returns positions, normals (unit), triangle indices, and per-vertex flags (1 = on the
// grid's capped boundary, where the surface is the cap rather than the shape).
export function surfaceNets(G, opts = {}){
  const { scene, vals, nx, ny, nz, h, x0, y0, z0 } = G;
  const steps = opts.newtonSteps != null ? opts.newtonSteps : 2;
  const px = nx + 1, py = ny + 1, sxy = px * py;
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const P = [], F = [], N = [];
  const c = new Float64Array(8), g = [0, 0, 0], eps = h * 0.05;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const base = i + px * j + sxy * k;
    c[0] = vals[base]; c[1] = vals[base + 1]; c[2] = vals[base + px]; c[3] = vals[base + px + 1];
    c[4] = vals[base + sxy]; c[5] = vals[base + sxy + 1]; c[6] = vals[base + sxy + px]; c[7] = vals[base + sxy + px + 1];
    let mask = 0; for (let q = 0; q < 8; q++) if (c[q] < 0) mask |= 1 << q;
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES){
      const va = c[a], vb = c[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
      n++;
    }
    const cx0 = x0 + i * h, cy0 = y0 + j * h, cz0 = z0 + k * h;
    let x = cx0 + sx / n * h, y = cy0 + sy / n * h, z = cz0 + sz / n * h;
    const boundary = i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1;
    let nrm = null;
    const cand = boundary ? null : cellCandidates(G, i, j, k);
    if (!boundary && cand){
      const cc = cand === 'all' ? null : cand, lo = -0.25 * h, hi = 1.25 * h;
      for (let s = 0; s < steps; s++){
        const f = scene.distC(x, y, z, cc); gradient(scene, cc, x, y, z, eps, g);
        const g2 = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (16 * eps * eps);
        if (g2 < 1e-10) break;
        const sc = f / g2 / (4 * eps);
        x -= g[0] * sc; y -= g[1] * sc; z -= g[2] * sc;
        // stay near the cell, so a vertex can't jump across a thin feature and fold the mesh
        x = Math.min(cx0 + hi, Math.max(cx0 + lo, x)); y = Math.min(cy0 + hi, Math.max(cy0 + lo, y)); z = Math.min(cz0 + hi, Math.max(cz0 + lo, z));
      }
      gradient(scene, cc, x, y, z, eps, g);
      const gl = Math.hypot(g[0], g[1], g[2]);
      if (gl > 1e-12) nrm = [g[0] / gl, g[1] / gl, g[2] / gl];
    }
    cellVert[i + nx * (j + ny * k)] = P.length / 3;
    P.push(x, y, z); N.push(nrm ? nrm[0] : NaN, nrm ? nrm[1] : 0, nrm ? nrm[2] : 0); F.push(boundary ? 1 : 0);
  }
  // Quads: around every grid edge with a sign change, joining the four cells that share it. Edges on the outer
  // layer have no full ring of cells, but the capped boundary guarantees no sign change there.
  const I = [];
  const cv = (i, j, k) => cellVert[i + nx * (j + ny * k)];
  const quad = (a, b, cc, d, flip) => {
    if (a < 0 || b < 0 || cc < 0 || d < 0) return;
    if (flip){ const t = b; b = d; d = t; }
    // split along the shorter diagonal
    const dac = dist2(P, a, cc), dbd = dist2(P, b, d);
    if (dac <= dbd) I.push(a, b, cc, a, cc, d); else I.push(a, b, d, b, cc, d);
  };
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + 1 + px * j + sxy * k];
    if ((v0 < 0) !== (v1 < 0)) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !(v0 < 0));
  }
  for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + px * (j + 1) + sxy * k];
    if ((v0 < 0) !== (v1 < 0)) quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !(v0 < 0));
  }
  for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + px * j + sxy * (k + 1)];
    if ((v0 < 0) !== (v1 < 0)) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !(v0 < 0));
  }
  const positions = new Float32Array(P), index = new Uint32Array(I), normals = new Float32Array(N), flags = new Uint8Array(F);
  // vertices without a field normal (the cap) take the area-weighted normal of their triangles
  fillMissingNormals(positions, index, normals);
  return { positions, normals, index, flags };
}
function dist2(P, a, b){ const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]; return dx * dx + dy * dy + dz * dz; }
function fillMissingNormals(pos, index, nrm){
  const nv = pos.length / 3, acc = new Float64Array(nv * 3);
  let missing = false;
  for (let v = 0; v < nv; v++) if (nrm[v * 3] !== nrm[v * 3]){ missing = true; break; }
  if (!missing) return;
  for (let t = 0; t < index.length; t += 3){
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (const o of [a, b, c]){ acc[o] += fx; acc[o + 1] += fy; acc[o + 2] += fz; }
  }
  for (let v = 0; v < nv; v++){
    if (nrm[v * 3] === nrm[v * 3]) continue;
    const l = Math.hypot(acc[v * 3], acc[v * 3 + 1], acc[v * 3 + 2]) || 1;
    nrm[v * 3] = acc[v * 3] / l; nrm[v * 3 + 1] = acc[v * 3 + 1] / l; nrm[v * 3 + 2] = acc[v * 3 + 2] / l;
  }
}
