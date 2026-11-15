// Builds one part of the figure as plain typed arrays, ready to send from the worker: sample the part's distance
// field, extract the surface, compute region distances for the shader, simplify to the tier's budget, then skin.
//
// Parts: 'body' (clothed torso, arms and legs) and 'hands' (both hands with any bare forearm) in bind-pose world space;
// 'head' in the head bone's space and 'boot' in the ankle bone's space, so they don't depend on the body build.
import { sampleGrid } from './grid.js';
import { surfaceNets } from './surfacenets.js';
import { simplify } from './simplify.js';
import { edgeReport, dropSpecks } from './mesh.js';
import { inheritWeights, smoothWeights, packWeights } from './weights.js';
import { rigSpec, chains, BONES } from '../rig.js';
import { bodyScene, bodyRegions } from './body.js';
import { handScene, handRegions } from './hands.js';
import { headScene, headRegions } from './head.js';
import { bootScene, bootRegions } from './boots.js';
import { partKey } from '../keys.js';
import { hairScene } from './hair.js';
import { beardScene } from './beard.js';
export { partKey };

// Bump whenever any generated output changes, so cached parts from older code are not reused.
export const GEN_VERSION = 5;

// Grid cell size (m) and triangle budget per part and quality tier.
export const TIERS = {
  high:{ body:[0.006, 14000], hands:[0.002, 5200], head:[0.0025, 10000], boot:[0.004, 1000], hair:[0.0035, 6500], hairU:[0.0035, 5000], beard:[0.0025, 3200] },
  medium:{ body:[0.007, 11000], hands:[0.0025, 4000], head:[0.003, 8000], boot:[0.005, 800], hair:[0.004, 5000], hairU:[0.004, 3800], beard:[0.003, 2500] },
  low:{ body:[0.01, 6500], hands:[0.003, 2400], head:[0.004, 4800], boot:[0.006, 500], hair:[0.006, 3000], hairU:[0.006, 2300], beard:[0.004, 1500] }
};
const BONE_NAMES = BONES.map(([n]) => n);
export const REG_CLAMP = 0.02;
const pad = (b, m) => [b[0] - m, b[1] - m, b[2] - m, b[3] + m, b[4] + m, b[5] + m];

// Rarely, the surface passes a near-tangent saddle (a bridge about one cell thick) that extracts as a non-manifold
// edge. That depends on exactly where the samples fall, so the part is re-extracted with the grid shifted by a
// fraction of a cell, or the surface offset by a fifth of one (well under a millimetre), until it comes out clean.
const RETRIES = [[0, 0], [0.37, 0], [0, 0.2], [0, -0.2], [0.71, 0.2], [0.19, -0.2]];
function extract(scene, h){
  const t0 = now();
  let m, G, t1;
  for (const [s, iso] of RETRIES){
    const box = pad(scene.bounds, 3 * h).map((v, i) => v + (i < 3 ? -s * h : 0));
    G = sampleGrid(scene, box, h, { iso:iso * h }); t1 = now(); m = surfaceNets(G);
    if (!edgeReport(m.index).nonManifold) break;
  }
  m.index = dropSpecks(m.index, m.positions.length / 3, 40);
  return { m, ms:{ sample:t1 - t0, extract:now() - t1 }, cells:G.nx * G.ny * G.nz };
}
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Simplify, then skin. regions(positions) gives the per-vertex region distances (4 floats each).
async function finish(kind, scene, m, regions, budget, bones, wopts){
  // Region distances only matter near zero, where the shader draws a line; clamped, they are constant elsewhere
  // and don't hold the simplifier back.
  let r = regions(m.positions);
  if (r instanceof Float32Array) r = { region:r };
  const attrs = {};
  for (const [name, arr] of Object.entries(r)){ for (let i = 0; i < arr.length; i++) arr[i] = arr[i] < -REG_CLAMP ? -REG_CLAMP : arr[i] > REG_CLAMP ? REG_CLAMP : arr[i]; attrs[name] = [arr, 4]; }
  let mesh = { positions:m.positions, normals:m.normals, index:m.index, flags:m.flags, attrs };
  // the budget decides how far to simplify; the error cap only stops it from ruining the shape
  mesh = await simplify(mesh, budget, { weighted:{ normal:0.3, region:0.5, region2:0.5 }, maxError:0.015 });
  let lists = inheritWeights(scene, mesh.positions, wopts);
  if (wopts.smooth) lists = smoothWeights(lists, mesh.index, wopts.smooth);
  const { skinIndex, skinWeight } = packWeights(lists, bones);
  return { positions:mesh.positions, normals:mesh.normals, index:mesh.index, region:mesh.attrs.region[0], region2:mesh.attrs.region2 ? mesh.attrs.region2[0] : null, skinIndex, skinWeight, bones, lists };
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
    const { scene, tags, landmarks } = headScene(o), x = extract(scene, h);
    rec = await finish(kind, scene, x.m, p => headRegions(p, tags, landmarks), budget, ['chest', 'neckB', 'headB'], {});
    rec.anchor = 'headB'; rec.ms = x.ms; rec.cells = x.cells;
  } else if (kind === 'boot'){
    const { scene, sole } = bootScene(), x = extract(scene, h);
    rec = await finish(kind, scene, x.m, p => bootRegions(p, sole), budget, ['an', 'kn'], {});
    rec.anchor = 'an'; rec.ms = x.ms; rec.cells = x.cells;
  } else if (kind === 'hair' || kind === 'hairU' || kind === 'beard'){
    const built = kind === 'beard' ? beardScene(o) : hairScene(o, kind === 'hairU');
    if (!built) rec = emptyPart();
    else {
      const x = extract(built.scene, h), none = p => new Float32Array(p.length / 3 * 4).fill(1);
      rec = await finish(kind, built.scene, x.m, none, budget, BONE_NAMES, { chains:built.chains || {} });
      rec.ms = x.ms; rec.cells = x.cells;
    }
    rec.anchor = 'headB';
  } else throw new Error('unknown part ' + kind);
  delete rec.lists;
  rec.kind = kind; rec.key = partKey(kind, o); rec.tier = tier; rec.v = GEN_VERSION;
  rec.ms.total = now() - t0;
  return rec;
}

// A part with nothing to draw (no beard, a shaved head).
function emptyPart(){
  return { positions:new Float32Array(0), normals:new Float32Array(0), index:new Uint32Array(0), region:new Float32Array(0), region2:null,
    skinIndex:new Uint8Array(0), skinWeight:new Uint8Array(0), bones:BONE_NAMES, ms:{}, cells:0 };
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
