// Surface Nets: a vertex in each grid cell the surface passes through, joined into quads across every grid edge with
// a sign change. About half the triangles of marching cubes. Each vertex starts at the mean of its edge crossings and
// is then pulled onto the true surface with Newton steps along the gradient, which recovers detail smaller than a
// cell (lips, nostrils, the brow ridge).
//
// Where two separate sheets of surface pass through one cell (thin features), plain Surface Nets gives them a shared
// vertex and the mesh pinches into non-manifold edges. Here each cell gets one vertex per sheet: its crossed edges
// are grouped by following the surface's contour across the cell's faces, and ambiguous faces (two diagonal corners
// inside) are always read the same way ("inside corners separate"), so neighbouring cells agree and the result is
// manifold.
import { cellCandidates } from './grid.js';

// Corners: bit 0 = +x, bit 1 = +y, bit 2 = +z.
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
const EDGE_ID = new Int8Array(64).fill(-1);
EDGES.forEach(([a, b], i) => { EDGE_ID[a * 8 + b] = EDGE_ID[b * 8 + a] = i; });
// The six faces, corners in cyclic order.
const FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];
const FACE_EDGES = FACES.map(f => f.map((c, i) => EDGE_ID[c * 8 + f[(i + 1) % 4]]));
const TET = [[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]];

// For each of the 256 corner sign masks: the patch (0..3) each crossed edge belongs to, -1 for uncrossed edges.
const PATCHES = (() => {
  const table = [];
  for (let mask = 0; mask < 256; mask++){
    const inside = c => (mask >> c) & 1, parent = Array.from({ length:12 }, (_, i) => i);
    const find = x => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
    const join = (a, b) => { parent[find(a)] = find(b); };
    const crossed = EDGES.map(([a, b]) => inside(a) !== inside(b));
    FACES.forEach((f, fi) => {
      const fe = FACE_EDGES[fi], cr = fe.filter(e => crossed[e]);
      if (cr.length === 2) join(cr[0], cr[1]);
      else if (cr.length === 4){
        // ambiguous: each inside corner is its own island, so pair the two edges at each inside corner
        for (let i = 0; i < 4; i++) if (inside(f[i])) join(fe[(i + 3) % 4], fe[i]);
      }
    });
    const ids = new Map(), out = new Int8Array(12).fill(-1);
    for (let e = 0; e < 12; e++) if (crossed[e]){ const r = find(e); if (!ids.has(r)) ids.set(r, ids.size); out[e] = ids.get(r); }
    table.push(out);
  }
  return table;
})();

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
  // per active cell: the offset of its 12 per-edge vertex ids in edgeVert
  const cellSlot = new Int32Array(nx * ny * nz).fill(-1), edgeVert = [];
  const P = [], N = [], F = [];
  const c = new Float64Array(8), g = [0, 0, 0], eps = h * 0.05, acc = new Float64Array(16);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const base = i + px * j + sxy * k;
    c[0] = vals[base]; c[1] = vals[base + 1]; c[2] = vals[base + px]; c[3] = vals[base + px + 1];
    c[4] = vals[base + sxy]; c[5] = vals[base + sxy + 1]; c[6] = vals[base + sxy + px]; c[7] = vals[base + sxy + px + 1];
    let mask = 0; for (let q = 0; q < 8; q++) if (c[q] < 0) mask |= 1 << q;
    if (mask === 0 || mask === 255) continue;
    const patch = PATCHES[mask];
    // mean crossing per patch
    acc.fill(0);
    for (let e = 0; e < 12; e++){
      const pi = patch[e]; if (pi < 0) continue;
      const [a, b] = EDGES[e], va = c[a], vb = c[b], t = va / (va - vb);
      acc[pi * 4] += (a & 1) + ((b & 1) - (a & 1)) * t;
      acc[pi * 4 + 1] += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
      acc[pi * 4 + 2] += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
      acc[pi * 4 + 3]++;
    }
    const slot = edgeVert.length; cellSlot[i + nx * (j + ny * k)] = slot;
    for (let e = 0; e < 12; e++) edgeVert.push(-1);
    const cx0 = x0 + i * h, cy0 = y0 + j * h, cz0 = z0 + k * h;
    const boundary = i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1;
    const cand = boundary ? null : cellCandidates(G, i, j, k);
    const vid = [];
    for (let pi = 0; acc[pi * 4 + 3] > 0 && pi < 4; pi++){
      const n = acc[pi * 4 + 3];
      let x = cx0 + acc[pi * 4] / n * h, y = cy0 + acc[pi * 4 + 1] / n * h, z = cz0 + acc[pi * 4 + 2] / n * h, nrm = null;
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
      vid.push(P.length / 3);
      P.push(x, y, z); N.push(nrm ? nrm[0] : NaN, nrm ? nrm[1] : 0, nrm ? nrm[2] : 0); F.push(boundary ? 1 : 0);
    }
    for (let e = 0; e < 12; e++) if (patch[e] >= 0) edgeVert[slot + e] = vid[patch[e]];
  }
  // Quads: around every grid edge with a sign change, joining the four cells that share it, each through the vertex
  // of the patch that edge belongs to. The capped boundary guarantees no sign change on the outer layer.
  const I = [];
  const ev = (i, j, k, e) => { const s = cellSlot[i + nx * (j + ny * k)]; return s < 0 ? -1 : edgeVert[s + e]; };
  const quad = (a, b, cc, d, flip) => {
    if (a < 0 || b < 0 || cc < 0 || d < 0) return;
    if (flip){ const t = b; b = d; d = t; }
    // split along the shorter diagonal
    if (dist2(P, a, cc) <= dist2(P, b, d)) I.push(a, b, cc, a, cc, d); else I.push(a, b, d, b, cc, d);
  };
  // x edges: in cells (i,j-1,k-1), (i,j,k-1), (i,j,k), (i,j-1,k) this lattice edge is cube edge 3, 2, 0, 1
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + 1 + px * j + sxy * k];
    if ((v0 < 0) !== (v1 < 0)) quad(ev(i, j - 1, k - 1, 3), ev(i, j, k - 1, 2), ev(i, j, k, 0), ev(i, j - 1, k, 1), !(v0 < 0));
  }
  // y edges: cells (i-1,j,k-1), (i-1,j,k), (i,j,k), (i,j,k-1) → cube edge 7, 5, 4, 6
  for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + px * (j + 1) + sxy * k];
    if ((v0 < 0) !== (v1 < 0)) quad(ev(i - 1, j, k - 1, 7), ev(i - 1, j, k, 5), ev(i, j, k, 4), ev(i, j, k - 1, 6), !(v0 < 0));
  }
  // z edges: cells (i-1,j-1,k), (i,j-1,k), (i,j,k), (i-1,j,k) → cube edge 11, 10, 8, 9
  for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++){
    const v0 = vals[i + px * j + sxy * k], v1 = vals[i + px * j + sxy * (k + 1)];
    if ((v0 < 0) !== (v1 < 0)) quad(ev(i - 1, j - 1, k, 11), ev(i, j - 1, k, 10), ev(i, j, k, 8), ev(i - 1, j, k, 9), !(v0 < 0));
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
