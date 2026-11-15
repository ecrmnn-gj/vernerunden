// Mesh simplification to a triangle budget with meshoptimizer (WASM), keeping normals and region attributes so
// shading and hem lines survive. If the WASM can't load, the mesh is returned unchanged.
import { MeshoptSimplifier } from 'meshoptimizer';

let ready = null;
export function simplifierReady(){
  if (!ready) ready = MeshoptSimplifier.ready.then(() => MeshoptSimplifier.supported, () => false);
  return ready;
}

// mesh: { positions, normals, index, attrs: { name: [Float32Array, itemSize] } }. Attributes listed in weighted
// take part in the error metric with the given weight; all attributes are carried to the output.
export async function simplify(mesh, targetTris, opts = {}){
  const tris = mesh.index.length / 3;
  if (tris <= targetTris || !(await simplifierReady())) return mesh;
  const nv = mesh.positions.length / 3, weighted = opts.weighted || {};
  // pack the weighted attributes, normals first
  const names = Object.keys(weighted).filter(n => n === 'normal' || mesh.attrs[n]);
  const comps = names.map(n => n === 'normal' ? [mesh.normals, 3] : mesh.attrs[n]);
  const stride = comps.reduce((s, [, k]) => s + k, 0);
  let attr = new Float32Array(Math.max(1, nv * stride)), w = [];
  names.forEach((n, i) => { for (let c = 0; c < comps[i][1]; c++) w.push(weighted[n]); });
  for (let v = 0; v < nv; v++){ let o = v * stride; for (const [a, k] of comps) for (let c = 0; c < k; c++) attr[o++] = a[v * k + c]; }
  if (!stride){ attr = new Float32Array(nv); w = [0]; }
  // Collapsing across a thin spot can fold two sheets of surface into a non-manifold edge, or open a hole. If that
  // happens, lock the original vertices around it and simplify again.
  const lock = opts.lock ? Uint8Array.from(opts.lock) : new Uint8Array(nv);
  let idx;
  for (let attempt = 0; attempt < 4; attempt++){
    [idx] = MeshoptSimplifier.simplifyWithAttributes(mesh.index, mesh.positions, 3, attr, Math.max(1, stride), w, lock,
      targetTris * 3, opts.maxError != null ? opts.maxError : 0.002, ['ErrorAbsolute', 'Regularize']);
    const bad = brokenVertices(idx);
    if (!bad.length) break;
    for (const v of ring(mesh.index, nv, bad, 3)) lock[v] = 1;
  }
  return compact({ ...mesh, index:idx });
}
// Vertices on edges not used by exactly two triangles (holes and non-manifold edges).
function brokenVertices(index){
  const uses = new Map(), out = new Set();
  for (let t = 0; t < index.length; t += 3) for (let e = 0; e < 3; e++){
    const a = index[t + e], b = index[t + (e + 1) % 3], key = a < b ? a * 4194304 + b : b * 4194304 + a;
    uses.set(key, (uses.get(key) || 0) + 1);
  }
  for (const [key, n] of uses) if (n !== 2){ out.add(Math.floor(key / 4194304)); out.add(key % 4194304); }
  return [...out];
}
// The vertices within `depth` edges of the seeds.
function ring(index, nv, seeds, depth){
  const nbr = Array.from({ length:nv }, () => []);
  for (let t = 0; t < index.length; t += 3) for (let e = 0; e < 3; e++){ const a = index[t + e], b = index[t + (e + 1) % 3]; nbr[a].push(b); nbr[b].push(a); }
  let front = new Set(seeds); const all = new Set(seeds);
  for (let d = 0; d < depth; d++){ const next = new Set(); for (const v of front) for (const u of nbr[v]) if (!all.has(u)){ all.add(u); next.add(u); } front = next; }
  return all;
}

// Drop vertices no triangle uses and renumber, carrying every per-vertex array along.
export function compact(mesh){
  const nv = mesh.positions.length / 3, remap = new Int32Array(nv).fill(-1);
  let n = 0;
  const index = new Uint32Array(mesh.index.length);
  for (let i = 0; i < mesh.index.length; i++){ const v = mesh.index[i]; if (remap[v] < 0) remap[v] = n++; index[i] = remap[v]; }
  const take = (arr, k) => { const out = new arr.constructor(n * k); for (let v = 0; v < nv; v++) if (remap[v] >= 0) for (let c = 0; c < k; c++) out[remap[v] * k + c] = arr[v * k + c]; return out; };
  const attrs = {};
  for (const [name, [a, k]] of Object.entries(mesh.attrs || {})) attrs[name] = [take(a, k), k];
  return { ...mesh, positions:take(mesh.positions, 3), normals:take(mesh.normals, 3), flags:mesh.flags ? take(mesh.flags, 1) : undefined, attrs, index, remap };
}
