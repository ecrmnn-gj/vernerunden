// Buildings beside the site and the city skyline beyond it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rand, pick } from '../core/utils.js';
import { scene } from '../render/renderer.js';
import { LOOP, Z_NEAR } from './layout.js';
import { M } from '../render/materials.js';
import { GEO, addMesh, bake, regroupBox, scaleBoxUV } from './geometry.js';
import { addScen } from './scenery.js';
import { makeBuilding } from './props.js';
import { FAC, FAC_DATA, FAC_TILE, FAC_KINDS } from '../textures/facades.js';

// Distant buildings get their own, thinner haze than the scene fog, so the skyline stays readable far out.
function hazeMat(m){
  m.fog = true;
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#ifdef USE_FOG\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, 0.9 * (1.0 - exp(-vFogDepth * 0.0058)));\n#endif'); };
  m.customProgramCacheKey = () => 'haze';
  return m;
}
const facMatCache = {};
function facMat(kind, far){
  const k = kind + (far ? '|far' : '');
  if (!facMatCache[k]){
    const D = FAC_DATA[FAC_KINDS[kind].lay], glassy = kind === 'glass' || kind === 'tower';
    const m = new THREE.MeshStandardMaterial({ map:FAC[kind], normalMap:D.n, roughnessMap:D.r, roughness:1, metalness:glassy ? 0.15 : 0, envMapIntensity:glassy ? 1.35 : 1 });
    facMatCache[k] = far ? hazeMat(m) : m;
  }
  return facMatCache[k];
}
const roofMatCache = {};
function roofMat(hex, far){ const k = hex + (far ? '|far' : ''); if (!roofMatCache[k]){ const m = new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), roughness:0.9 }); roofMatCache[k] = far ? hazeMat(m) : m; } return roofMatCache[k]; }
function block(parent, w, h, d, kind, roof, x, y, z, far){
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, FAC_TILE); regroupBox(geo, [0, 0, 1, -1, 0, 0]);
  const m = new THREE.Mesh(geo, [facMat(kind, far), roofMat(roof, far)]);
  m.position.set(x || 0, (y || 0) + h / 2, z || 0); m.castShadow = !far; m.receiveShadow = !far; parent.add(m);
  if (!far){ // parapet
    const pm = roofMat('#8C8A85'), py = (y || 0) + h + 0.25;
    for (const [px, pz, sw, sd] of [[0, d / 2 - 0.1, w, 0.2], [0, -d / 2 + 0.1, w, 0.2], [w / 2 - 0.1, 0, 0.2, d], [-w / 2 + 0.1, 0, 0.2, d]]) addMesh(parent, GEO.unit, pm, (x || 0) + px, py, (z || 0) + pz, sw, 0.5, sd).castShadow = false;
  }
  return m;
}
function makeApartment(side){
  const grp = new THREE.Group(), floors = 4 + Math.floor(Math.random() * 5), w = rand(11, 16), d = rand(18, 26), h = floors * 3.2;
  block(grp, w, h, d, pick(['apt', 'aptGrey', 'brick']), '#6E6A64', 0, 0, 0);
  const face = -side * (w / 2 + 0.5), rail = M.balcony, slab = roofMat('#B9B6AE');
  for (let f = 1; f < floors; f++) for (let k = -1; k <= 1; k++){
    addMesh(grp, GEO.unit, slab, face, f * 3.2, k * d / 3.2, 1.0, 0.12, 2.6);
    addMesh(grp, GEO.unit, rail, face - side * 0.48, f * 3.2 + 0.5, k * d / 3.2, 0.04, 0.9, 2.6).castShadow = false;
    addMesh(grp, GEO.unit, M.steel, face - side * 0.48, f * 3.2 + 0.97, k * d / 3.2, 0.06, 0.05, 2.62).castShadow = false;
  }
  block(grp, w * 0.35, 2.2, d * 0.25, 'aptGrey', '#5E5A55', 0, h, 0);
  return { grp, w };
}
M.balcony = new THREE.MeshPhysicalMaterial({ color:new THREE.Color('#BFD4DE'), roughness:0.05, transmission:0, transparent:true, opacity:0.45, envMapIntensity:1.4, depthWrite:false });
function makeOffice(){
  const grp = new THREE.Group(), floors = 3 + Math.floor(Math.random() * 5), w = rand(16, 22), d = rand(18, 26), h = floors * 3.6;
  block(grp, w, h, d, 'glass', '#4E555B', 0, 0, 0);
  addMesh(grp, GEO.unit, roofMat('#D7D9DA'), 0, h + 0.4, 0, w + 0.4, 0.8, d + 0.4);
  for (let i = 0; i < 3; i++) addMesh(grp, new RoundedBoxGeometry(2.2, 1.3, 1.6, 2, 0.1), M.steel, rand(-w / 3, w / 3), h + 1.45, rand(-d / 3, d / 3));
  return { grp, w };
}
function makeHouse(){
  const grp = new THREE.Group(), w = rand(7, 9), d = rand(9, 12), h = 6.2, kind = pick(['houseRed', 'houseWhite', 'houseYellow', 'houseBlue']);
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, FAC_TILE);
  const hm = new THREE.Mesh(geo, facMat(kind)); hm.position.y = h / 2; hm.castShadow = hm.receiveShadow = true; grp.add(hm);
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, w * 0.42); shape.lineTo(-w / 2 - 0.4, 0);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth:d + 0.8, bevelEnabled:false });
  const roof = new THREE.Mesh(roofGeo, roofMat(pick(['#3A3A3A', '#5A2E25', '#2F3B44']))); roof.position.set(0, h, -d / 2 - 0.4); roof.castShadow = roof.receiveShadow = true; grp.add(roof);
  addMesh(grp, GEO.unit, roofMat('#6B4A33'), w * 0.25, h + w * 0.3, 0, 0.6, 1.6, 0.6);
  return { grp, w };
}
function makeTowerNear(){
  const grp = new THREE.Group(), floors = 12 + Math.floor(Math.random() * 10), w = rand(14, 18), d = rand(14, 18), h = floors * 3.3;
  block(grp, w, h, d, pick(['tower', 'glass', 'aptGrey']), '#4E555B', 0, 0, 0);
  if (Math.random() < 0.6) block(grp, w * 0.6, 6.6, d * 0.6, 'tower', '#4E555B', 0, h, 0);
  return { grp, w };
}
const NEAR_TYPES = [['apt', 3], ['office', 2], ['house', 2.2], ['frame', 2], ['tower', 1.2]];
export function pickWeighted(list){ let t = 0; list.forEach(([, w]) => t += w); let r = Math.random() * t; for (const [k, w] of list){ r -= w; if (r <= 0) return k; } return list[0][0]; }
for (let i = 0; i < 12; i++){
  const side = i % 2 ? 1 : -1, type = pickWeighted(NEAR_TYPES);
  let b, w, gap = rand(0, 5);
  if (type === 'frame'){ w = rand(12, 18); b = makeBuilding(w, 3 + Math.floor(Math.random() * 3), rand(9, 13)); }
  else if (type === 'apt'){ const r = makeApartment(side); b = r.grp; w = r.w; }
  else if (type === 'office'){ const r = makeOffice(); b = r.grp; w = r.w; }
  else if (type === 'house'){ const r = makeHouse(); b = r.grp; w = r.w; gap = rand(-1, 2); }
  else { const r = makeTowerNear(); b = r.grp; w = r.w; gap = rand(10, 18); }
  b.position.x = side * (11 + w / 2 + gap); addScen(b, Z_NEAR - 12 - i * (LOOP / 12));
}
// the city skyline beyond the site: hazy towers that drift past slowly, and a fixed cluster on the horizon
export const skyline = [], SKY_SPAN = 470;
function makeSkyscraper(scale){
  const grp = new THREE.Group(), h = rand(38, 150) * (scale || 1), w = rand(14, 30), d = rand(14, 28), kind = pick(['tower', 'glass', 'tower', 'aptGrey']);
  block(grp, w, h, d, kind, '#7F8C95', 0, 0, 0, true);
  let top = h;
  if (Math.random() < 0.55){ const h2 = rand(10, 40); block(grp, w * rand(0.55, 0.75), h2, d * rand(0.55, 0.75), kind, '#7F8C95', 0, h, 0, true); top += h2; }
  if (Math.random() < 0.35){ const a = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, rand(8, 22), 6), roofMat('#9AA6AE', true)); a.position.y = top + a.geometry.parameters.height / 2; grp.add(a); }
  return grp;
}
for (let i = 0; i < 26; i++){
  const side = i % 2 ? 1 : -1, b = makeSkyscraper(i % 3 === 0 ? 1.15 : 0.85);
  bake(b); b.position.set(side * rand(55, 170), 0, 25 - (i / 26) * SKY_SPAN - rand(0, 12)); scene.add(b); skyline.push(b);
}
for (let i = 0; i < 12; i++){ const b = bake(makeSkyscraper(1.2)); b.position.set(rand(-150, 150), 0, -rand(330, 400)); scene.add(b); }
