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
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(mesh.index, mesh.positions, 3, attr, Math.max(1, stride), w, opts.lock || null,
    targetTris * 3, opts.maxError != null ? opts.maxError : 0.002, ['ErrorAbsolute', 'Regularize']);
  return compact({ ...mesh, index:idx });
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
