// Trees and site clutter between the fence and the buildings.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, pick } from '../core/utils.js';
import { canvasTex } from '../textures/canvas.js';
import { LOOP, Z_NEAR } from './layout.js';
import { M, mat } from '../render/materials.js';
import { TEX, rng } from '../textures/procedural.js';
import { box, GEO, addMesh, scaleBoxUV } from './geometry.js';
import { addScen, isFree, claim } from './scenery.js';
import { corrMat } from './props.js';

// birches and rowans between the fence and the buildings
const TREE_GEOS = (() => {
  const out = [], leaf = ['#5E8A3A', '#6F9A42', '#4F7A33', '#7DA54C', '#8BAA4A'];
  for (let n = 0; n < 5; n++){
    const parts = [], hgt = rand(4.5, 7.5);
    const cnt = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < cnt; i++){
      const rr = rand(1.0, 1.7) * (i ? 0.85 : 1), b = mergeVertices(new THREE.IcosahedronGeometry(rr, 3).deleteAttribute('normal').deleteAttribute('uv')), p = b.attributes.position, cols = [];
      const base = new THREE.Color(pick(leaf)), cx = rand(-0.9, 0.9), cy = hgt - rand(0, 2.2), cz = rand(-0.9, 0.9);
      for (let k = 0; k < p.count; k++){
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nn = 1 + (Math.sin(x * 3.1 + n) * Math.cos(y * 2.7) * Math.sin(z * 3.3 + i)) * 0.18;
        p.setXYZ(k, x * nn + cx, y * nn * 0.85 + cy, z * nn + cz);
        const shade = (0.62 + 0.38 * ((y / rr) * 0.5 + 0.5)) * (0.85 + Math.random() * 0.3); cols.push(base.r * shade, base.g * shade, base.b * shade);
      }
      b.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); b.computeVertexNormals(); parts.push(b);
    }
    out.push({ canopy:mergeGeometries(parts), trunk:new THREE.CylinderGeometry(0.1, 0.17, hgt, 8).translate(0, hgt / 2, 0) });
  }
  return out;
})();
const birchTex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#ECEAE4'; c.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 40; i++){ c.fillStyle = r() < 0.7 ? '#2B2722' : '#7A746C'; c.fillRect(r() * w, r() * h, r() * 22 + 6, r() * 3 + 1.5); } });
const leafMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.85 }), trunkMat = new THREE.MeshStandardMaterial({ map:birchTex, roughness:0.8 });
function placeBeside(half, x0, x1, tries, make){
  for (let t = 0; t < (tries || 40); t++){
    const side = Math.random() < 0.5 ? -1 : 1, z = Z_NEAR - rand(0, LOOP), x = rand(x0, x1);
    if (!isFree(side, z, half, x - half, x + half)) continue;
    claim(side, z, half, x - half, x + half); const obj = make(side); obj.position.x = side * x; addScen(obj, z); return true;
  }
  return false;
}
for (let i = 0; i < 22; i++) placeBeside(1.6, 6.3, 9.6, 40, () => {
  const T = pick(TREE_GEOS), grp = new THREE.Group();
  const tr = new THREE.Mesh(T.trunk, trunkMat), cn = new THREE.Mesh(T.canopy, leafMat);
  tr.castShadow = cn.castShadow = true; tr.receiveShadow = cn.receiveShadow = true; grp.add(tr, cn);
  grp.rotation.y = rand(0, 6.28); grp.scale.setScalar(rand(0.8, 1.15)); return grp;
});
// site clutter: gravel heaps, pallets of blocks, portable toilets and skips
const gravelGeo = (() => { const gq = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), p = gq.attributes.position; for (let k = 0; k < p.count; k++){ const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nn = 1 + Math.sin(x * 5) * Math.cos(z * 4) * 0.06; p.setXYZ(k, x * nn, y * 0.55, z * nn); } gq.computeVertexNormals(); return gq; })();
const gravelMat = new THREE.MeshStandardMaterial({ map:TEX.dirtPit, normalMap:TEX.dirtNPit, roughness:1, color:new THREE.Color('#E6DED0') });
for (let i = 0; i < 4; i++) placeBeside(2.2, 6.6, 9.4, 40, () => { const m = new THREE.Mesh(gravelGeo, gravelMat); m.scale.set(rand(1.6, 2.2), rand(1.1, 1.8), rand(1.6, 2.4)); m.castShadow = m.receiveShadow = true; return m; });
const blockMat = mat('#B8B4AC', { roughness:0.95 }), wrapMat = new THREE.MeshPhysicalMaterial({ color:new THREE.Color('#DDE6EA'), roughness:0.15, transparent:true, opacity:0.5, depthWrite:false });
for (let i = 0; i < 6; i++) placeBeside(0.9, 5.5, 9.6, 40, () => {
  const grp = new THREE.Group(), n = 1 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++){
    const y = k * 1.05;
    addMesh(grp, GEO.unit, M.wood, 0, y + 0.07, 0, 1.2, 0.14, 1.0);
    addMesh(grp, new RoundedBoxGeometry(1.1, 0.8, 0.95, 2, 0.03), Math.random() < 0.5 ? blockMat : M.paper, 0, y + 0.55, 0);
    addMesh(grp, GEO.unit, wrapMat, 0, y + 0.56, 0, 1.13, 0.84, 0.98).castShadow = false;
  }
  grp.rotation.y = rand(-0.3, 0.3); return grp;
});
const toiletMat = mat('#2F6FB5', { roughness:0.45 });
for (let i = 0; i < 3; i++) placeBeside(0.8, 5.6, 8.5, 40, side => {
  const grp = new THREE.Group();
  addMesh(grp, new RoundedBoxGeometry(1.1, 2.3, 1.1, 3, 0.08), toiletMat, 0, 1.15, 0);
  addMesh(grp, new RoundedBoxGeometry(1.2, 0.12, 1.2, 2, 0.05), M.white, 0, 2.34, 0);
  addMesh(grp, GEO.unit, M.white, -side * 0.56, 1.1, 0, 0.02, 1.9, 0.8);
  return grp;
});
const skipMat = corrMat('#E36F1E');
for (let i = 0; i < 2; i++) placeBeside(2.2, 6.6, 9.2, 40, () => {
  const grp = new THREE.Group(), geo = box(2.0, 1.4, 4.0); scaleBoxUV(geo, 2.0, 1.4, 4.0, 1.4);
  const sk = new THREE.Mesh(geo, skipMat); sk.position.y = 0.75; sk.castShadow = sk.receiveShadow = true; grp.add(sk);
  addMesh(grp, gravelGeo, gravelMat, 0, 1.4, 0, 0.9, 0.6, 1.8);
  for (const s of [-0.5, 0.8]) addMesh(grp, GEO.unit, M.wood, s, 1.6, 0.4, 0.15, 0.15, 2.6).rotation.z = s;
  return grp;
});
