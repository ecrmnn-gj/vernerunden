import { describe, it, expect } from 'vitest';
import { Scene, Sphere, Capsule, RoundCone, Ellipsoid, RoundBox, Torus, Cylinder, Plane, Warp, basis, euler, smin } from '../src/characters/figure/gen/sdf.js';
import { sampleGrid } from '../src/characters/figure/gen/grid.js';
import { surfaceNets } from '../src/characters/figure/gen/surfacenets.js';
import { edgeReport, eulerCharacteristic, signedVolume, degenerateTriangles, components } from '../src/characters/figure/gen/mesh.js';
import { valueNoise3, fnv1a } from '../src/characters/figure/gen/rng.js';

const pad = (b, m) => [b[0] - m, b[1] - m, b[2] - m, b[3] + m, b[4] + m, b[5] + m];
function extract(scene, h, opts){ return surfaceNets(sampleGrid(scene, pad(scene.bounds, 3 * h), h, opts)); }
function expectClosed(m){
  const r = edgeReport(m.index);
  expect(r.boundary, 'boundary edges').toBe(0);
  expect(r.nonManifold, 'non-manifold edges').toBe(0);
  expect(r.misoriented, 'misoriented edges').toBe(0);
  expect(degenerateTriangles(m.index)).toBe(0);
}

describe('primitives', () => {
  it('sphere, capsule and round cone are exact distances', () => {
    expect(new Sphere([1, 2, 3], 0.5).dist(1, 2, 4)).toBeCloseTo(0.5, 12);
    const cap = new Capsule([0, 0, 0], [0, 1, 0], 0.1);
    expect(cap.dist(0.3, 0.5, 0)).toBeCloseTo(0.2, 12);
    expect(cap.dist(0, 1.5, 0)).toBeCloseTo(0.4, 12);
    const rc = new RoundCone([0, 0, 0], [0, 1, 0], 0.2, 0.1);
    expect(rc.dist(0, -0.5, 0)).toBeCloseTo(0.3, 9);   // below the big end: distance to its sphere
    expect(rc.dist(0, 1.5, 0)).toBeCloseTo(0.4, 9);    // above the small end
    expect(rc.dist(0, 0.5, 0)).toBeLessThan(0);
    // equal radii make a round cone a capsule
    const rc2 = new RoundCone([0, 0, 0], [0, 1, 0], 0.1, 0.1);
    for (const p of [[0.3, 0.5, 0], [0.2, -0.3, 0.1], [0, 1.2, 0.05]]) expect(rc2.dist(...p)).toBeCloseTo(cap.dist(...p), 9);
  });

  it('oriented primitives match their axis-aligned versions under rotation', () => {
    const R = euler(0.3, 0.7, -0.2), e1 = new Ellipsoid([0, 0, 0], [0.3, 0.2, 0.1]), e2 = new Ellipsoid([0, 0, 0], [0.3, 0.2, 0.1], R);
    // a point expressed in the local frame of e2 gives the same distance as the plain ellipsoid
    const lp = [0.25, -0.12, 0.2];
    const wp = [R[0] * lp[0] + R[3] * lp[1] + R[6] * lp[2], R[1] * lp[0] + R[4] * lp[1] + R[7] * lp[2], R[2] * lp[0] + R[5] * lp[1] + R[8] * lp[2]];
    expect(e2.dist(...wp)).toBeCloseTo(e1.dist(...lp), 12);
    const Rb = basis([1, 1, 0]); // local y along (1,1,0)
    const cyl = new Cylinder([0, 0, 0], 0.1, 0.5, Rb);
    expect(cyl.dist(0.3, 0.3, 0)).toBeLessThan(0);
    expect(cyl.dist(0, 0, 0.3)).toBeCloseTo(0.2, 9);
  });

  it('round box, torus and plane', () => {
    expect(new RoundBox([0, 0, 0], [0.5, 0.2, 0.1], 0.02).dist(0, 0.5, 0)).toBeCloseTo(0.3, 9);
    expect(new Torus([0, 0, 0], 0.5, 0.1).dist(0.5, 0, 0)).toBeCloseTo(-0.1, 12);
    expect(new Plane([0, 2, 0], 0.5).dist(3, 1, 7)).toBeCloseTo(0.5, 12);
  });

  it('smooth min equals min outside the blend radius and stays below it inside', () => {
    expect(smin(0.1, 0.5, 0.2)).toBe(0.1);
    expect(smin(0.1, 0.15, 0.2)).toBeLessThan(0.1);
    expect(smin(0.1, 0.15, 0)).toBe(0.1);
  });

  it('noise is deterministic, bounded and smooth', () => {
    const n1 = valueNoise3(5), n2 = valueNoise3(5), n3 = valueNoise3(6);
    let diff = 0;
    for (let i = 0; i < 200; i++){
      const x = i * 0.37, y = i * 0.11, z = -i * 0.23;
      expect(n1(x, y, z)).toBe(n2(x, y, z));
      expect(Math.abs(n1(x, y, z))).toBeLessThanOrEqual(1);
      expect(Math.abs(n1(x + 1e-4, y, z) - n1(x, y, z))).toBeLessThan(0.01);
      diff += Math.abs(n1(x, y, z) - n3(x, y, z));
    }
    expect(diff).toBeGreaterThan(1);
    expect(fnv1a('afro')).not.toBe(fnv1a('afro2'));
  });
});

describe('surface extraction', () => {
  it('a sphere becomes a closed, outward-facing shell of the right volume', () => {
    const s = new Scene(); s.add(new Sphere([0.01, 0.02, -0.03], 0.1));
    const m = extract(s, 0.008);
    expectClosed(m);
    expect(eulerCharacteristic(m.index)).toBe(2);
    const v = signedVolume(m.positions, m.index), exact = 4 / 3 * Math.PI * 0.001;
    expect(v).toBeGreaterThan(0);
    expect(Math.abs(v - exact) / exact).toBeLessThan(0.03);
    // vertices sit on the surface, and normals point outwards
    for (let i = 0; i < m.positions.length; i += 3){
      const x = m.positions[i] - 0.01, y = m.positions[i + 1] - 0.02, z = m.positions[i + 2] + 0.03, r = Math.hypot(x, y, z);
      expect(Math.abs(r - 0.1)).toBeLessThan(2e-4);
      expect((x * m.normals[i] + y * m.normals[i + 1] + z * m.normals[i + 2]) / r).toBeGreaterThan(0.999);
    }
  });

  it('a torus has genus one', () => {
    const s = new Scene(); s.add(new Torus([0, 0, 0], 0.15, 0.05, euler(0.4, 0, 0.2)));
    const m = extract(s, 0.01);
    expectClosed(m);
    expect(eulerCharacteristic(m.index)).toBe(0);
  });

  it('blended and carved shapes stay closed and in one piece', () => {
    const s = new Scene();
    s.add(new RoundCone([0, 0, 0], [0, 0.4, 0], 0.08, 0.05));
    s.add(new Ellipsoid([0, 0.45, 0], [0.12, 0.07, 0.09]), 0.04);
    s.add(new Capsule([-0.1, 0.3, 0], [-0.3, 0.1, 0.05], 0.035), 0.03);
    s.sub(new Sphere([0, 0.5, -0.08], 0.03), 0.01);
    s.add(new Warp(new Sphere([0.11, 0.2, 0], 0.06), 0.006, 30, 3), 0.02);
    const m = extract(s, 0.006);
    expectClosed(m);
    expect(components(m.positions.length / 3, m.index)).toBe(1);
    expect(eulerCharacteristic(m.index)).toBe(2);
  });

  it('a shape cut by the grid boundary is capped, not left open', () => {
    const s = new Scene(); s.add(new Capsule([0, -1, 0], [0, 1, 0], 0.1));
    const m = surfaceNets(sampleGrid(s, [-0.2, -0.3, -0.2, 0.2, 0.3, 0.2], 0.01));
    expectClosed(m);
    expect(m.flags.some(f => f === 1)).toBe(true);
    expect(signedVolume(m.positions, m.index)).toBeGreaterThan(0);
  });

  it('the sparse brick path gives exactly the same mesh as evaluating everything', () => {
    const s = new Scene();
    for (let i = 0; i < 12; i++) s.add(new Sphere([Math.cos(i) * 0.3, Math.sin(i * 1.3) * 0.2, (i % 3) * 0.1], 0.04 + (i % 4) * 0.01), 0.02);
    s.sub(new Capsule([-0.4, 0, 0.1], [0.4, 0, 0.1], 0.02), 0.01);
    const box = pad(s.bounds, 0.03), sparse = sampleGrid(s, box, 0.006), dense = sampleGrid(s, box, 0.006, { dense:true });
    expect(sparse.stats.evaluated).toBeLessThan(sparse.stats.bricks);
    const a = surfaceNets(sparse), b = surfaceNets(dense);
    expect(Array.from(a.index)).toEqual(Array.from(b.index));
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });

  it('is deterministic', () => {
    const make = () => { const s = new Scene(); s.add(new Warp(new Ellipsoid([0, 0, 0], [0.1, 0.15, 0.08]), 0.005, 40, 9)); return extract(s, 0.005); };
    const a = make(), b = make();
    expect(Buffer.from(a.positions.buffer).equals(Buffer.from(b.positions.buffer))).toBe(true);
    expect(Buffer.from(a.index.buffer).equals(Buffer.from(b.index.buffer))).toBe(true);
  });
});
