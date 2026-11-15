// Builds one part of the figure as plain typed arrays, ready to send from the worker: sample the part's distance
// field, extract the surface, compute region distances for the shader, simplify to the tier's budget, then skin.
//
// Parts: 'body' (clothed torso, arms and legs) and 'hands' (both hands with any bare forearm) in bind-pose world space;
// 'head' in the head bone's space and 'boot' in the ankle bone's space, so they don't depend on the body build.
import { sampleGrid } from './grid.js';
import { surfaceNets } from './surfacenets.js';
import { simplify } from './simplify.js';
import { inheritWeights, smoothWeights, packWeights } from './weights.js';
import { rigSpec, chains, BONES } from '../rig.js';
import { bodyScene, bodyRegions } from './body.js';
import { handScene, handRegions } from './hands.js';
import { headScene } from './head.js';
import { bootScene, bootRegions } from './boots.js';
import { partKey } from '../keys.js';
export { partKey };

// Bump whenever any generated output changes, so cached parts from older code are not reused.
export const GEN_VERSION = 1;

// Grid cell size (m) and triangle budget per part and quality tier.
export const TIERS = {
  high:{ body:[0.006, 14000], hands:[0.002, 5200], head:[0.0025, 10000], boot:[0.004, 1000] },
  medium:{ body:[0.007, 11000], hands:[0.0025, 4000], head:[0.003, 8000], boot:[0.005, 800] },
  low:{ body:[0.01, 6500], hands:[0.003, 2400], head:[0.004, 4800], boot:[0.006, 500] }
};
const BONE_NAMES = BONES.map(([n]) => n);
export const REG_CLAMP = 0.02;
const pad = (b, m) => [b[0] - m, b[1] - m, b[2] - m, b[3] + m, b[4] + m, b[5] + m];

function extract(scene, h){
  const t0 = now(), G = sampleGrid(scene, pad(scene.bounds, 3 * h), h), t1 = now(), m = surfaceNets(G), t2 = now();
  return { m, ms:{ sample:t1 - t0, extract:t2 - t1 }, cells:G.nx * G.ny * G.nz };
}
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Simplify, then skin. regions(positions) gives the per-vertex region distances (4 floats each).
async function finish(kind, scene, m, regions, budget, bones, wopts){
  // Region distances only matter near zero, where the shader draws a line; clamped, they are constant elsewhere
  // and don't hold the simplifier back.
  const reg = regions(m.positions); for (let i = 0; i < reg.length; i++) reg[i] = reg[i] < -REG_CLAMP ? -REG_CLAMP : reg[i] > REG_CLAMP ? REG_CLAMP : reg[i];
  let mesh = { positions:m.positions, normals:m.normals, index:m.index, flags:m.flags, attrs:{ region:[reg, 4] } };
  // the budget decides how far to simplify; the error cap only stops it from ruining the shape
  mesh = await simplify(mesh, budget, { weighted:{ normal:0.3, region:0.5 }, maxError:0.015 });
  let lists = inheritWeights(scene, mesh.positions, wopts);
  if (wopts.smooth) lists = smoothWeights(lists, mesh.index, wopts.smooth);
  const { skinIndex, skinWeight } = packWeights(lists, bones);
  return { positions:mesh.positions, normals:mesh.normals, index:mesh.index, region:mesh.attrs.region[0], skinIndex, skinWeight, bones, lists };
}

export async function generatePart(kind, o, tier = 'medium'){
  const t0 = now(), [h, budget] = TIERS[tier][kind];
  let rec;
  if (kind === 'body'){
    const spec = rigSpec(o), { scene, tags } = bodyScene(o, spec), x = extract(scene, h);
    rec = await finish(kind, scene, x.m, p => bodyRegions(p, tags), budget, BONE_NAMES, { chains:chains(spec), smooth:2 });
    rec.anchor = null; rec.ms = x.ms; rec.cells = x.cells;
  } else if (kind === 'hands'){
    const spec = rigSpec(o), { scene } = handScene(o, spec, 'L'), x = extract(scene, h);
    const left = await finish(kind, scene, x.m, p => handRegions(o, spec, p, 'L'), budget / 2, BONE_NAMES, { chains:chains(spec), smooth:1 });
    rec = mergeMirrored(left); rec.anchor = null; rec.ms = x.ms; rec.cells = x.cells;
  } else if (kind === 'head'){
    const { scene } = headScene(o), x = extract(scene, h);
    rec = await finish(kind, scene, x.m, p => new Float32Array(p.length / 3 * 4).fill(1), budget, ['chest', 'neckB', 'headB'], {});
    rec.anchor = 'headB'; rec.ms = x.ms; rec.cells = x.cells;
  } else if (kind === 'boot'){
    const { scene, sole } = bootScene(), x = extract(scene, h);
    rec = await finish(kind, scene, x.m, p => bootRegions(p, sole), budget, ['an', 'kn'], {});
    rec.anchor = 'an'; rec.ms = x.ms; rec.cells = x.cells;
  } else throw new Error('unknown part ' + kind);
  delete rec.lists;
  rec.kind = kind; rec.key = partKey(kind, o); rec.tier = tier; rec.v = GEN_VERSION;
  rec.ms.total = now() - t0;
  return rec;
}

// The right hand is the left mirrored in x: same mesh, flipped winding, L and R bones swapped.
function mergeMirrored(L){
  const nv = L.positions.length / 3, nt = L.index.length;
  const positions = new Float32Array(nv * 6), normals = new Float32Array(nv * 6), region = new Float32Array(nv * 8);
  const index = new Uint32Array(nt * 2), skinIndex = new Uint8Array(nv * 8), skinWeight = new Uint8Array(nv * 8);
  positions.set(L.positions); normals.set(L.normals); region.set(L.region); index.set(L.index); skinIndex.set(L.skinIndex); skinWeight.set(L.skinWeight);
  const bi = new Map(L.bones.map((b, i) => [b, i])), swap = L.bones.map(b => bi.get(b.replace(/L(_h)?$/, 'R$1')) ?? bi.get(b));
  for (let v = 0; v < nv; v++){
    for (let c = 0; c < 3; c++){ positions[(nv + v) * 3 + c] = L.positions[v * 3 + c] * (c === 0 ? -1 : 1); normals[(nv + v) * 3 + c] = L.normals[v * 3 + c] * (c === 0 ? -1 : 1); }
    for (let c = 0; c < 4; c++){ region[(nv + v) * 4 + c] = L.region[v * 4 + c]; skinIndex[(nv + v) * 4 + c] = swap[L.skinIndex[v * 4 + c]]; skinWeight[(nv + v) * 4 + c] = L.skinWeight[v * 4 + c]; }
  }
  for (let t = 0; t < nt; t += 3){ index[nt + t] = L.index[t] + nv; index[nt + t + 1] = L.index[t + 2] + nv; index[nt + t + 2] = L.index[t + 1] + nv; }
  return { positions, normals, region, index, skinIndex, skinWeight, bones:L.bones };
}
