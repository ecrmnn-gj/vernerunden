// Skin weights inherited from the SDF. Each scene node carries a bind: a rigid bone ({ bone }), a fixed mix
// ({ mix:[[bone, w], ...] }) or a chain ({ chain }) that ramps between bones across its joints (rig.js). A vertex is
// weighted by the nodes that formed it: a soft minimum over the distances to every node near the surface there. An
// inner-thigh vertex therefore only takes weight from thigh primitives, and the arm can't bleed into the torso.
import { Scene, ADD } from './sdf.js';
import { chainWeights } from '../rig.js';

// Collect [node, distance] for the union nodes with a bind, looking inside nested scenes.
function contributions(scene, x, y, z, out){
  for (const nd of scene.nodes){
    if (nd.op !== ADD) continue;
    if (nd.bind) out.push(nd, nd.p.dist(x, y, z));
    else if (nd.p instanceof Scene) contributions(nd.p, x, y, z, out);
  }
  return out;
}
// Per-vertex weights as a list of [bone, w] (unnormalised mixes are fine; pack() normalises).
// opts.chains: from rig.chains(spec); opts.blend: softmin radius.
export function inheritWeights(scene, positions, opts){
  const ks = opts.blend || 0.01, chains = opts.chains, nv = positions.length / 3, out = new Array(nv);
  for (let v = 0; v < nv; v++) out[v] = pointWeights(scene, [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]], chains, ks);
  return out;
}
// The weights at one point: a soft minimum over the nodes whose surfaces are near it.
function pointWeights(scene, p, chains, ks){
  const buf = []; contributions(scene, p[0], p[1], p[2], buf);
  let dmin = Infinity; for (let i = 1; i < buf.length; i += 2) if (buf[i] < dmin) dmin = buf[i];
  const acc = new Map();
  let tot = 0;
  for (let i = 0; i < buf.length; i += 2){
    const d = buf[i + 1]; if (d > dmin + 3 * ks) continue;
    const s = Math.exp(-(d - dmin) / ks); tot += s;
    for (const [b, w] of bindWeights(buf[i].bind, p, chains)) acc.set(b, (acc.get(b) || 0) + w * s);
  }
  return tot > 0 ? [...acc] : [['body', 1]];
}
// bind.scene: weighted like that scene at this point (a garment takes the weights of the body under it).
export function bindWeights(bind, p, chains){
  if (bind.scene) return pointWeights(bind.scene, p, chains, 0.01);
  if (bind.bone) return [[bind.bone, 1]];
  if (bind.mix) return bind.mix;
  if (bind.chain) return chainWeights(chains[bind.chain], p);
  if (bind.fn) return bind.fn(p);
  throw new Error('bad bind');
}

// Smooth weights over the mesh graph where several bones share a vertex (the joint zones), so bends stay even.
// Vertices flagged in pin keep their weights, so overlapping parts that must deform identically stay together.
export function smoothWeights(lists, index, iterations, pin){
  const nv = lists.length, nbr = Array.from({ length:nv }, () => new Set());
  for (let t = 0; t < index.length; t += 3) for (let e = 0; e < 3; e++){ const a = index[t + e], b = index[t + (e + 1) % 3]; nbr[a].add(b); nbr[b].add(a); }
  let cur = lists.map(l => new Map(l.map(([b, w]) => { return [b, w]; })));
  for (const m of cur){ let s = 0; for (const w of m.values()) s += w; for (const [b, w] of m) m.set(b, w / s); }
  for (let it = 0; it < iterations; it++){
    const next = cur.map((m, v) => {
      if ((pin && pin[v]) || (m.size < 2 && [...nbr[v]].every(u => cur[u].size < 2 && sameBone(cur[u], m)))) return m;
      const acc = new Map(m);
      for (const [b, w] of acc) acc.set(b, w * 0.5);
      const k = 0.5 / Math.max(1, nbr[v].size);
      for (const u of nbr[v]) for (const [b, w] of cur[u]) acc.set(b, (acc.get(b) || 0) + w * k);
      return acc;
    });
    cur = next;
  }
  return cur.map(m => [...m]);
}
const sameBone = (a, b) => a.size === 1 && b.size === 1 && a.keys().next().value === b.keys().next().value;

// Top four influences per vertex, as Uint8 indices into `bones` and Uint8 weights that sum to exactly 255.
export function packWeights(lists, bones){
  const nv = lists.length, idx = new Uint8Array(nv * 4), wt = new Uint8Array(nv * 4), bi = new Map(bones.map((b, i) => [b, i]));
  for (let v = 0; v < nv; v++){
    const l = lists[v].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4);
    let s = 0; for (const [, w] of l) s += w;
    // largest-remainder rounding to exactly 255
    const raw = l.map(([, w]) => w / s * 255), fl = raw.map(Math.floor);
    let rem = 255 - fl.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let i = 0; rem > 0; i = (i + 1) % order.length, rem--) fl[order[i][1]]++;
    for (let i = 0; i < l.length; i++){
      const b = bi.get(l[i][0]); if (b === undefined) throw new Error('unknown bone ' + l[i][0]);
      idx[v * 4 + i] = b; wt[v * 4 + i] = fl[i];
    }
  }
  return { skinIndex:idx, skinWeight:wt };
}
