// A safety boot in the ankle bone's local space (facing -z). Symmetric, so one mesh serves both feet. The trouser
// hem covers the top of the shaft; the shaft bends with the shin (knee bone) and the foot with the ankle.
import { Scene, RoundCone, Ellipsoid, RoundBox, Torus, Plane } from './sdf.js';

const sm = s => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };
function bootWeights(p){ const s = sm((p[1] - 0.02) / 0.07); return s <= 0 ? [['an', 1]] : [['an', 1 - s], ['kn', s]]; }

export function bootScene(){
  const s = new Scene(), bind = { bind:{ fn:bootWeights } }, sole = [];
  s.add(new RoundBox([0, -0.05, -0.05], [0.051, 0.04, 0.12], 0.03), 0, bind);
  s.add(new Ellipsoid([0, -0.055, -0.15], [0.054, 0.04, 0.058]), 0.015, bind);
  s.add(new Ellipsoid([0, -0.055, 0.045], [0.05, 0.04, 0.05]), 0.015, bind);
  s.add(new RoundCone([0, -0.03, 0.005], [0, 0.09, 0], 0.058, 0.055), 0.02, bind);
  s.add(new Torus([0, 0.085, 0], 0.055, 0.008), 0.005, bind);
  const so = new RoundBox([0, -0.087, -0.055], [0.057, 0.0125, 0.145], 0.006); sole.push(so);
  s.add(so, 0.004, bind);
  s.int(new Plane([0, 1, 0], 0.095));
  return { scene:s, sole };
}
// Region distances: x: the sole (negative on it).
export function bootRegions(positions, sole){
  const nv = positions.length / 3, out = new Float32Array(nv * 4).fill(1);
  for (let v = 0; v < nv; v++) out[v * 4] = sole[0].dist(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]) - 0.0015;
  return out;
}
