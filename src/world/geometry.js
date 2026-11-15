// Shared geometry and the helpers that build and bake (merge) meshes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const GEO = {
  unit:box(1, 1, 1), limbArm:new THREE.CylinderGeometry(0.06, 0.055, 0.56, 8), limbLeg:new THREE.CylinderGeometry(0.08, 0.07, 0.88, 8),
  torso:new THREE.CylinderGeometry(0.21, 0.17, 0.62, 12), stripe:new THREE.CylinderGeometry(0.215, 0.2, 0.05, 12), head:new THREE.SphereGeometry(0.15, 16, 12),
  dome:new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brim:new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20),
  disc:new THREE.CylinderGeometry(0.34, 0.34, 0.07, 28), wheel:new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), cone:new THREE.ConeGeometry(0.22, 0.72, 18),
  beam:new THREE.ConeGeometry(1.7, 6.2, 22, 1, true), post:new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
};
Object.assign(GEO, {
  vanBox:new RoundedBoxGeometry(1.95, 1.9, 3.3, 3, 0.14), vanNose:new RoundedBoxGeometry(1.95, 1.08, 1.15, 3, 0.16),
  vanWind:new RoundedBoxGeometry(1.82, 0.78, 0.05, 2, 0.02), vanBumper:new RoundedBoxGeometry(2.02, 0.24, 0.16, 2, 0.06),
  vanLamp:new RoundedBoxGeometry(0.38, 0.17, 0.04, 2, 0.015), tyre:new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24), rim:new THREE.CylinderGeometry(0.21, 0.21, 0.12, 16)
});
const vanCache = {};
export const vanPaint = hex => vanCache[hex] || (vanCache[hex] = new THREE.MeshPhysicalMaterial({ color:new THREE.Color(hex), roughness:0.35, metalness:0.15, clearcoat:1, clearcoatRoughness:0.06 }));
export const PIT_DEPTH = 4.6;
GEO.pickRim = new THREE.TorusGeometry(0.34, 0.035, 10, 40);
GEO.ground1 = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
// CylinderGeometry maps cap UVs a quarter turn off. Pickups stand the disc up (rotation.x = PI/2), so remap both caps to keep icons upright from either side.
{ const pos = GEO.disc.attributes.position, nrm = GEO.disc.attributes.normal, uv = GEO.disc.attributes.uv;
  for (let i = 0; i < uv.count; i++){ const s = nrm.getY(i); if (Math.abs(s) > 0.99) uv.setXY(i, 0.5 + s * pos.getX(i) / 0.68, 0.5 - pos.getZ(i) / 0.68); } }
export function addMesh(parent, geo, material, x, y, z, sx, sy, sz){
  const m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
  if (sx != null) m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// Collapse the meshes of a rigid group that share a material into one mesh: far fewer draw calls for the same picture.
// shallow: only the group's own meshes, so jointed children (arms, legs, head) keep moving on their own.
export function bake(root, shallow){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material) || o.userData.noBake || (shallow && o.parent !== root)) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.noBake) return;
    const ge = o.geometry, sig = [o.material.uuid, ge.index ? 'i' : 'n', Object.keys(ge.attributes).sort().join(','), o.castShadow, o.receiveShadow, o.renderOrder].join('|');
    if (!buckets.has(sig)) buckets.set(sig, []);
    buckets.get(sig).push(o);
  });
  for (const list of buckets.values()){
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map(o => o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))));
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder; m.userData.baked = true;
    for (const o of list) o.parent.remove(o);
    root.add(m);
  }
  return root;
}
export function disposeBaked(root){ root.traverse(o => { if (o.userData.baked) o.geometry.dispose(); }); }
// Re-sort a BoxGeometry's six faces into contiguous groups, one per material slot (-1 drops a face). Fewer groups means fewer draw calls.
export function regroupBox(geo, slots){
  const idx = geo.index.array, per = [];
  for (const gr of geo.groups){ const s = slots[gr.materialIndex]; if (s < 0) continue; (per[s] = per[s] || []).push(...idx.subarray(gr.start, gr.start + gr.count)); }
  const all = []; geo.clearGroups();
  per.forEach((list, s) => { if (!list) return; geo.addGroup(all.length, list.length, s); all.push(...list); });
  geo.setIndex(all); return geo;
}
export function scaleBoxUV(geo, w, h, d, tile){
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){
    if (f === 2 || f === 3) continue;
    const su = (f < 2 ? d : w) / tile, sv = h / tile;
    for (let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
  }
  uv.needsUpdate = true;
}
