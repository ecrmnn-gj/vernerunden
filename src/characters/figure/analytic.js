// Parts built directly as meshes rather than extracted: the hard hat. Its size and height follow the hair style
// (headshape.js HELMET_FIT), the same numbers that cut the hair away under it, so hair never pokes through.
import * as THREE from 'three';
import { HELMET, helmetFit } from './gen/headshape.js';

// The dome (with a rolled rim), a brim that becomes a visor at the front, and a ridge from front to back.
export function makeHelmet(o, material){
  const f = helmetFit(o), [R, H] = [HELMET.outer[0], HELMET.outer[1]], zs = HELMET.outer[2] / HELMET.outer[0], t = 0.006;
  const g = new THREE.Group();
  // dome: outer ellipse down to the rim, a rolled edge, then the inside back up
  const prof = [];
  for (let i = 0; i <= 14; i++){ const a = i / 14 * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(1e-4, R * Math.sin(a)), H * Math.cos(a))); }
  prof.push(new THREE.Vector2(R + 0.003, -0.004), new THREE.Vector2(R - t, -0.004));
  for (let i = 14; i >= 0; i--){ const a = i / 14 * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(1e-4, (R - t) * Math.sin(a)), (H - t) * Math.cos(a))); }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), material); dome.scale.z = zs;
  g.add(dome);
  g.add(new THREE.Mesh(brimGeometry(R - 0.004, zs), material));
  // ridge over the top, following the dome
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(R, 0.011, 8, 40, Math.PI), material);
  ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, H / R, zs); ridge.position.y = 0.001;
  g.add(ridge);
  g.position.set(0, HELMET.y + f.lift, HELMET.z); g.scale.setScalar(f.s);
  g.traverse(m => { if (m.isMesh){ m.castShadow = m.receiveShadow = true; } });
  return g;
}
// A flat ring from the dome's rim outwards: 12 mm at the sides, a 4.5 cm visor at the front, drooping slightly.
function brimGeometry(r0, zs){
  const N = 72, pos = [], idx = [];
  for (let i = 0; i <= N; i++){
    const a = i / N * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a), front = Math.max(0, -cz);
    const ext = 0.012 + 0.033 * front * front + 0.006 * Math.max(0, cz);
    const ri = r0, ro = r0 + 0.004 + ext, droop = -0.004 - 0.008 * front * front;
    // top inner, top outer, bottom outer, bottom inner
    pos.push(ri * sx, -0.002, ri * cz * zs, ro * sx, droop, ro * cz * zs, ro * sx, droop - 0.005, ro * cz * zs, ri * sx, -0.007, ri * cz * zs);
  }
  for (let i = 0; i < N; i++){
    const a = i * 4, b = (i + 1) * 4;
    for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
