// Tower cranes: lattice mast and jib, slewing slowly with a load on the hook.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rand } from '../core/utils.js';
import { LOOP, Z_NEAR } from './layout.js';
import { M } from '../render/materials.js';
import { TEX } from '../textures/procedural.js';
import { GEO, addMesh, bake } from './geometry.js';
import { addScen } from './scenery.js';

// tower cranes: lattice mast and jib, slewing slowly with a load on the hook
export const craneLights = [], cranes = [];
const latticeMat = new THREE.MeshStandardMaterial({ color:new THREE.Color('#E8B21F'), map:TEX.lattice, alphaTest:0.02, alphaToCoverage:true, side:THREE.DoubleSide, roughness:0.5, metalness:0.3 });
function latticeBox(cross, len){
  const geo = new THREE.BoxGeometry(cross, len, cross), uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){ if (f === 2 || f === 3) continue; for (let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, uv.getX(i), uv.getY(i) * len / (cross * 4)); } }
  return geo;
}
for (let i = 0; i < 3; i++){
  const side = i % 2 ? -1 : 1, grp = new THREE.Group(), hgt = rand(30, 38), slew = new THREE.Group();
  const mast = new THREE.Mesh(latticeBox(1.6, hgt), latticeMat); mast.position.y = hgt / 2; grp.add(mast);
  addMesh(grp, GEO.unit, M.concrete, 0, 0.5, 0, 4, 1, 4);
  slew.position.y = hgt; grp.add(slew);
  const jib = new THREE.Mesh(latticeBox(1.2, 40), latticeMat); jib.rotation.z = Math.PI / 2; jib.position.set(-side * 14, 0.6, 0); slew.add(jib);
  const cj = new THREE.Mesh(latticeBox(1.2, 10), latticeMat); cj.rotation.z = Math.PI / 2; cj.position.set(side * 9, 0.6, 0); slew.add(cj);
  addMesh(slew, GEO.unit, M.concrete, side * 12, -0.4, 0, 2.4, 2.2, 1.8);
  const cab = addMesh(slew, new RoundedBoxGeometry(2, 2, 2, 2, 0.2), M.white, -side * 1.2, -0.6, 1.4);
  addMesh(slew, GEO.unit, M.glass, -side * 2.21, -0.4, 1.4, 0.02, 1.2, 1.6);
  const tip = new THREE.Mesh(latticeBox(1.0, 5), latticeMat); tip.position.set(0, 3.6, 0); slew.add(tip);
  for (const s2 of [-1, 1]){ const tie = addMesh(slew, GEO.unit, M.steel, s2 * side * -9, 3.6, 0, 18, 0.06, 0.06); tie.rotation.z = s2 * side * 0.33; tie.castShadow = false; }
  const trolley = new THREE.Group(); trolley.position.set(-side * rand(14, 26), 0, 0); slew.add(trolley);
  const cableLen = rand(10, 20); addMesh(trolley, GEO.unit, M.dark, 0, -cableLen / 2, 0, 0.05, cableLen, 0.05).castShadow = false;
  addMesh(trolley, GEO.unit, M.yellow, 0, -cableLen - 0.3, 0, 0.5, 0.6, 0.3);
  addMesh(trolley, GEO.unit, M.wood, 0, -cableLen - 1.6, 0, 1.6, 0.9, 1.2);
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M.redLight); l.position.set(0, 6.4, 0); l.userData.noBake = true; slew.add(l); craneLights.push(l);
  bake(slew); slew.userData.noBake = true; slew.rotation.y = rand(-0.8, 0.8); grp.userData.slew = slew; grp.userData.slewPhase = rand(0, 6.28);
  grp.position.x = side * rand(26, 36); addScen(grp, Z_NEAR - 40 - i * (LOOP / 3)); cranes.push(grp);
}
