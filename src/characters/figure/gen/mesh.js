// Mesh checks shared by the generator and the tests: is it closed, manifold and consistently oriented, and how big.

// Every undirected edge must be used by exactly two triangles, once in each direction.
export function edgeReport(index){
  const uses = new Map();
  for (let t = 0; t < index.length; t += 3){
    for (let e = 0; e < 3; e++){
      const a = index[t + e], b = index[t + (e + 1) % 3];
      if (a === b) continue;
      const key = a < b ? a * 4194304 + b : b * 4194304 + a;
      const u = uses.get(key) || [0, 0];
      u[a < b ? 0 : 1]++;
      uses.set(key, u);
    }
  }
  let boundary = 0, nonManifold = 0, misoriented = 0;
  for (const [f, r] of uses.values()){
    const n = f + r;
    if (n === 1) boundary++;
    else if (n > 2) nonManifold++;
    else if (f !== 1) misoriented++;
  }
  return { edges:uses.size, boundary, nonManifold, misoriented };
}
export function degenerateTriangles(index){
  let n = 0;
  for (let t = 0; t < index.length; t += 3) if (index[t] === index[t + 1] || index[t + 1] === index[t + 2] || index[t] === index[t + 2]) n++;
  return n;
}
// V - E + F over referenced vertices: 2 for a closed sphere-like shell, 0 for a torus.
export function eulerCharacteristic(index){
  const used = new Set(index);
  return used.size - edgeReport(index).edges + index.length / 3;
}
// Enclosed volume by the divergence theorem; positive when the triangles face outwards.
export function signedVolume(pos, index){
  let v = 0;
  for (let t = 0; t < index.length; t += 3){
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  return v / 6;
}
// Number of separate connected pieces.
export function components(nv, index){
  const parent = new Int32Array(nv); for (let i = 0; i < nv; i++) parent[i] = i;
  const find = x => { while (parent[x] !== x){ parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let t = 0; t < index.length; t += 3){ const a = find(index[t]), b = find(index[t + 1]), c = find(index[t + 2]); parent[b] = a; parent[find(c)] = a; }
  const roots = new Set(); for (const v of new Set(index)) roots.add(find(v));
  return roots.size;
}
