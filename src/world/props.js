// Roadside props: signs, street lamps, billboards and site cabins.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, dataTex } from '../textures/canvas.js';
import { LOOP, Z_NEAR } from './layout.js';
import { M, mat } from '../render/materials.js';
import { mkCanvas, normalFromHeight, grain } from '../textures/procedural.js';
import { box, GEO, addMesh, regroupBox, scaleBoxUV } from './geometry.js';
import { addScen, claim } from './scenery.js';
import { SIGNS, signPlane } from '../textures/signs.js';

// signs on the fences
const signKinds = ['adgang', 'logo', 'banner', 'hjelm', 'forste', 'logo', 'hjelm', 'adgang'];
signKinds.forEach((k, i) => {
  const side = i % 2 ? 1 : -1;
  const dims = { adgang:[1.5, 0.75], hjelm:[0.8, 0.8], banner:[2.6, 0.5], forste:[0.7, 0.7], logo:[2.3, 0.84] }[k];
  const grp = new THREE.Group();
  const s = signPlane(SIGNS[k], dims[0], dims[1]); s.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; s.position.x = side * 4.43; s.receiveShadow = true; grp.add(s);
  const back = addMesh(grp, GEO.unit, M.white, side * 4.46, 0, 0, 0.03, dims[1] + 0.06, dims[0] + 0.06); back.castShadow = true;
  grp.position.y = 1.2; addScen(grp, Z_NEAR - 10 - i * (LOOP / signKinds.length));
});
// lamp masts
for (let i = 0; i < 8; i++){
  const side = i % 2 ? 1 : -1, grp = new THREE.Group();
  addMesh(grp, new THREE.CylinderGeometry(0.07, 0.11, 6.8, 12), M.sil, 0, 3.4, 0);
  addMesh(grp, new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10), M.sil, -side * 0.9, 6.8, 0).rotation.z = Math.PI / 2;
  addMesh(grp, new RoundedBoxGeometry(0.75, 0.16, 0.5, 2, 0.05), M.sil, -side * 1.6, 6.72, 0);
  const lens = addMesh(grp, GEO.unit, M.lamp, -side * 1.6, 6.63, 0, 0.62, 0.02, 0.38); lens.castShadow = false;
  addMesh(grp, new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.06), M.concrete, 0, 0.2, 0);
  grp.position.x = side * 5.6; addScen(grp, Z_NEAR - 5 - i * (LOOP / 8));
  claim(side, grp.position.z, 0.6, 5.2, 6.0);
}
// Grønn Jobb billboards behind the fence
for (let i = 0; i < 2; i++){
  const side = i % 2 ? 1 : -1, grp = new THREE.Group();
  for (const z of [-3, 3]) addMesh(grp, new THREE.CylinderGeometry(0.11, 0.13, 4.4, 12), M.steel, 0, 2.2, z);
  const face = side < 0 ? 0 : 1, slots = [0, 0, 0, 0, 0, 0]; slots[face] = 1;
  const board = new THREE.Mesh(regroupBox(box(0.14, 3.5, 8.0), slots), [M.white, new THREE.MeshStandardMaterial({ map:SIGNS.billboard, roughness:0.45 })]); board.position.y = 5.3; board.castShadow = board.receiveShadow = true; grp.add(board);
  for (const y of [3.5, 7.1]) addMesh(grp, GEO.unit, M.steel, side * 0.04, y, 0, 0.1, 0.1, 8.2);
  grp.position.x = side * 9.2; addScen(grp, Z_NEAR - 60 - i * (LOOP / 2));
  claim(side, grp.position.z, 4.5, 8.6, 9.8);
}
// corrugated steel for site cabins and skips
const CORR = (() => {
  const draw = (c, w, h, mode) => {
    c.fillStyle = mode === 'color' ? '#E9E7E1' : '#808080'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16){ const gr = c.createLinearGradient(x, 0, x + 16, 0);
      if (mode === 'color'){ gr.addColorStop(0, 'rgba(0,0,0,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)'); }
      else { gr.addColorStop(0, '#303030'); gr.addColorStop(0.5, '#D0D0D0'); gr.addColorStop(1, '#303030'); }
      c.fillStyle = gr; c.fillRect(x, 0, 16, h); }
    if (mode === 'color'){ const gr = c.createLinearGradient(0, h * 0.6, 0, h); gr.addColorStop(0, 'rgba(90,75,55,0)'); gr.addColorStop(1, 'rgba(90,75,55,0.35)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); grain(c, w, h, 10, 4, false); }
  };
  const color = canvasTex(128, 128, (c, w, h) => draw(c, w, h, 'color'));
  const hc = mkCanvas(128, 128); draw(hc.getContext('2d'), 128, 128, 'height');
  const normal = dataTex(normalFromHeight(hc, 1.6, true, true));
  for (const t of [color, normal]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { color, normal };
})();
export const corrMat = hex => new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), map:CORR.color, normalMap:CORR.normal, roughness:0.55, metalness:0.35 });
const CABIN_MATS = ['#F2F0EA', '#DADCD8', '#2E6FA8', '#E7C33A'].map(corrMat);
// stacked site cabins (brakkerigg) with windows towards the road and an outside stair
for (let i = 0; i < 4; i++){
  const side = i % 2 ? -1 : 1, grp = new THREE.Group(), levels = i % 3 === 0 ? 2 : 1;
  for (let lv = 0; lv < levels; lv++){
    const cm = CABIN_MATS[(i + lv) % CABIN_MATS.length], geo = box(2.5, 2.55, 6); scaleBoxUV(geo, 2.5, 2.55, 6, 1.4);
    const c = new THREE.Mesh(geo, cm); c.position.y = lv * 2.6 + 1.3; c.castShadow = c.receiveShadow = true; grp.add(c);
    for (const dz of [-1.6, 1.6]){
      addMesh(grp, GEO.unit, M.white, -side * 1.255, lv * 2.6 + 1.5, dz, 0.03, 0.82, 1.12);
      const w = addMesh(grp, GEO.unit, M.glass, -side * 1.27, lv * 2.6 + 1.5, dz, 0.02, 0.7, 1.0); w.castShadow = false;
    }
    addMesh(grp, GEO.unit, M.plastic, -side * 1.26, lv * 2.6 + 1.1, 0, 0.03, 2.0, 0.9);
  }
  if (levels > 1){
    // outside stair: a landing, treads and yellow hand rails
    addMesh(grp, GEO.unit, M.steel, -side * 1.75, 2.6, 2.0, 0.9, 0.06, 1.0);
    for (let s = 0; s < 10; s++) addMesh(grp, GEO.unit, M.steel, -side * 1.75, 0.24 + s * 0.24, -1.6 + s * 0.33, 0.86, 0.04, 0.28);
    for (const dx of [-0.44, 0.44]){
      const r = addMesh(grp, GEO.unit, M.yellow, -side * (1.75 + dx), 2.15, 0.0, 0.04, 0.04, 4.0); r.rotation.x = -0.63;
      addMesh(grp, GEO.unit, M.steel, -side * (1.75 + dx), 1.3, -0.15, 0.05, 0.05, 4.1).rotation.x = -0.63;
    }
  }
  grp.position.x = side * 7.8; addScen(grp, Z_NEAR - 30 - i * (LOOP / 4));
  claim(side, grp.position.z, 3.4, 5.9, 9.2);
}
// concrete frames of buildings under construction
export function makeBuilding(w, floors, d){
  const grp = new THREE.Group(), fh = 3.1;
  for (let f = 0; f <= floors; f++) addMesh(grp, GEO.unit, M.frame, 0, f * fh + 0.15, 0, w, 0.3, d);
  const nx = Math.max(2, Math.round(w / 4)), nz = Math.max(2, Math.round(d / 4)), top = floors - (Math.random() < 0.5 ? 0 : 1);
  for (let f = 0; f < top; f++)
    for (let i = 0; i <= nx; i++) for (const j of [0, nz]) addMesh(grp, GEO.unit, M.frame, -w / 2 + 0.25 + i * (w - 0.5) / nx, f * fh + fh / 2 + 0.15, -d / 2 + 0.25 + j * (d - 0.5) / nz, 0.4, fh - 0.3, 0.4);
  // rebar sticking out of the top columns and a safety net on one floor
  for (let i = 0; i <= nx; i++) for (const j of [0, nz]) for (const o of [-0.1, 0.1]) addMesh(grp, GEO.unit, M.rust, -w / 2 + 0.25 + i * (w - 0.5) / nx + o, top * fh + 0.55, -d / 2 + 0.25 + j * (d - 0.5) / nz, 0.025, 0.8, 0.025).castShadow = false;
  return grp;
}
M.rust = mat('#7A4A2E', { roughness:0.8, metalness:0.4 });
