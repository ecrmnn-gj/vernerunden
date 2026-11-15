import { describe, it, expect, beforeAll } from 'vitest';
import { generatePart, TIERS } from '../src/characters/figure/gen/generate.js';
import { edgeReport, components, degenerateTriangles, signedVolume } from '../src/characters/figure/gen/mesh.js';
import { CHAR_DEFAULT } from '../src/characters/charSchema.js';

const BASE = { ...CHAR_DEFAULT };
const combos = (keys) => keys.reduce((acc, [k, vals]) => acc.flatMap(o => vals.map(v => ({ ...o, [k]:v }))), [{ ...BASE }]);
function expectSound(rec, pieces){
  const r = edgeReport(rec.index);
  expect(r.boundary, 'boundary edges').toBe(0);
  expect(r.nonManifold, 'non-manifold edges').toBe(0);
  expect(r.misoriented, 'misoriented edges').toBe(0);
  expect(degenerateTriangles(rec.index), 'degenerate triangles').toBe(0);
  expect(components(rec.positions.length / 3, rec.index), 'pieces').toBe(pieces);
  expect(signedVolume(rec.positions, rec.index)).toBeGreaterThan(0);
  for (const a of [rec.positions, rec.normals, rec.region]) expect(a.every(Number.isFinite)).toBe(true);
  const nv = rec.positions.length / 3;
  for (let v = 0; v < nv; v++){
    const w = rec.skinWeight[v * 4] + rec.skinWeight[v * 4 + 1] + rec.skinWeight[v * 4 + 2] + rec.skinWeight[v * 4 + 3];
    if (w !== 255) throw new Error(`vertex ${v}: weights sum to ${w}`);
    for (let c = 0; c < 4; c++) if (rec.skinIndex[v * 4 + c] >= rec.bones.length) throw new Error(`vertex ${v}: bad bone index`);
    const n = Math.hypot(rec.normals[v * 3], rec.normals[v * 3 + 1], rec.normals[v * 3 + 2]);
    if (Math.abs(n - 1) > 1e-3) throw new Error(`vertex ${v}: normal length ${n}`);
  }
}

describe('generated parts are closed, manifold and validly skinned', () => {
  for (const o of combos([['gender', ['male', 'female']], ['build', ['slim', 'average', 'sturdy']], ['sleeves', ['long', 'short']]])){
    it(`body ${o.gender} ${o.build} ${o.sleeves}`, async () => expectSound(await generatePart('body', o), 1), 30000);
    for (const gloves of ['on', 'off']) it(`hands ${o.gender} ${o.build} ${o.sleeves} gloves ${gloves}`, async () => expectSound(await generatePart('hands', { ...o, gloves }), 2), 30000);
  }
  for (const o of combos([['gender', ['male', 'female']], ['face', ['oval', 'round', 'square', 'long']]])){
    it(`head ${o.gender} ${o.face}`, async () => expectSound(await generatePart('head', o), 1), 30000);
  }
  it('boot', async () => expectSound(await generatePart('boot', BASE), 1), 30000);
});

describe('the face', () => {
  it('every eye sits in its socket: its front at the face surface, the head solid behind it', async () => {
    const { headScene } = await import('../src/characters/figure/gen/head.js');
    for (const o of combos([['gender', ['male', 'female']], ['face', ['oval', 'round', 'square', 'long']]])){
      const { scene, landmarks:L } = headScene(o);
      for (const c of [L.eye.L, L.eye.R]){
        const front = scene.dist(c[0], c[1], c[2] - L.eye.r);
        expect(Math.abs(front), `${o.gender} ${o.face}: eye front ${front}`).toBeLessThan(0.004);
        expect(scene.dist(c[0], c[1], c[2] + L.eye.r + 0.004), `${o.gender} ${o.face}: behind the eye`).toBeLessThan(0);
      }
    }
  });
});

describe('budgets and determinism', () => {
  // the whole figure, per quality tier
  const LIMIT = { high:52000, medium:40000, low:26000 };
  for (const tier of Object.keys(TIERS)){
    it(`${tier}: the default figure fits the triangle budget`, async () => {
      let total = 0;
      for (const kind of ['body', 'hands', 'head', 'boot']){
        const rec = await generatePart(kind, BASE, tier), tris = rec.index.length / 3;
        expect(tris, kind).toBeLessThanOrEqual(TIERS[tier][kind][1] * 1.3);
        total += tris * (kind === 'boot' ? 2 : 1);
      }
      expect(total).toBeLessThanOrEqual(LIMIT[tier]);
    }, 60000);
  }
  it('the same options always give the same mesh', async () => {
    const a = await generatePart('head', BASE), b = await generatePart('head', BASE);
    for (const k of ['positions', 'normals', 'index', 'skinIndex', 'skinWeight', 'region']) expect(Buffer.from(a[k].buffer).equals(Buffer.from(b[k].buffer)), k).toBe(true);
  }, 30000);
});

describe('the skinned figure deforms without collapsing', () => {
  let THREE, assembleFigure, poses, parts;
  beforeAll(async () => {
    // poses.js pulls in DOM helpers at import; a stub is enough for the pose maths
    globalThis.document ??= { getElementById:() => null, documentElement:{} };
    globalThis.matchMedia ??= () => ({ matches:false });
    globalThis.getComputedStyle ??= () => ({ getPropertyValue:() => '' });
    THREE = await import('three');
    ({ assembleFigure } = await import('../src/characters/figure/assemble.js'));
    poses = await import('../src/characters/poses.js');
    parts = {};
    for (const kind of ['body', 'hands', 'head', 'boot']) parts[kind] = await generatePart(kind, BASE);
  }, 60000);

  // Flexion creases (behind the knee, inside the elbow, the groin, under the chin) always squeeze a few triangles;
  // broken weights squeeze many. So: at most 1 % of a part's triangles below a quarter of their rest area.
  it('squeezes only a few crease triangles in any pose', () => {
    const fig = assembleFigure(BASE, parts);
    const P = poses, cheer = f => { P.poseReset(f); f.shL.rotation.z = -2.5; f.shR.rotation.z = 2.5; f.elL.rotation.x = f.elR.rotation.x = 0.55; };
    const set = [['reset', f => P.poseReset(f)], ['jump', P.poseJump], ['slide', P.poseSlide], ['ready', P.poseReady], ['cheer', cheer]];
    for (let i = 0; i < 8; i++) set.push(['run ' + i, f => P.poseRun(f, i * Math.PI / 4, 0.95)]);
    const v = new THREE.Vector3(), worst = {};
    // rest areas, from the bind-pose geometry
    const rest = fig.meshes.map(m => triAreas(m.geometry.attributes.position.array, m.geometry.index.array));
    for (const [name, pose] of set){
      pose(fig); fig.update(); fig.root.updateMatrixWorld(true);
      fig.meshes.forEach((m, mi) => {
        const pos = m.geometry.attributes.position, out = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++){ v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
        const a = triAreas(out, m.geometry.index.array);
        let n = 0, c = 0; for (let t = 0; t < a.length; t++) if (rest[mi][t] > 1e-7){ n++; if (a[t] / rest[mi][t] < 0.25) c++; }
        worst[`${name}/${mi}`] = c / n;
      });
    }
    const bad = Object.entries(worst).filter(([, f]) => f > 0.01);
    expect(bad, JSON.stringify(bad)).toEqual([]);
  }, 60000);
});
function triAreas(p, idx){
  const out = new Float64Array(idx.length / 3);
  for (let t = 0; t < idx.length; t += 3){
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    out[t / 3] = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
  return out;
}
