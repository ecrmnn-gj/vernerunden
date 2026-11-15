// The road, the dirt beside it, pit materials and the site fence.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene } from '../render/renderer.js';
import { _m4, _q, _s3, _up, _v3 } from '../core/scratch.js';
import { setSkyColours } from '../render/sky.js';
import { LOOP, Z_NEAR, ZC } from './layout.js';
import { M } from '../render/materials.js';
import { TEX } from '../textures/procedural.js';
import { ROAD_W, makeGroundTextures, makeDirtTextures, makeFenceTextures } from '../textures/ground.js';

setSkyColours();
makeGroundTextures(); makeDirtTextures(); makeFenceTextures();
export const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, LOOP), new THREE.MeshStandardMaterial({ map:TEX.ground, normalMap:TEX.groundN, roughnessMap:TEX.groundR, roughness:1, metalness:0, normalScale:new THREE.Vector2(1, 1) }));
groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.set(0, 0, ZC); groundMesh.receiveShadow = true; groundMesh.renderOrder = -3; scene.add(groundMesh);
export const dirt = new THREE.Mesh(new THREE.PlaneGeometry(220, LOOP + 200), M.dirt);
M.dirt.map = TEX.dirt; M.dirt.normalMap = TEX.dirtN; M.dirt.roughnessMap = TEX.dirtR; M.dirt.color.set('#FFFFFF');
dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, -0.03, ZC - 100); dirt.receiveShadow = true; dirt.renderOrder = -3; scene.add(dirt);
// Holes are real: a quad resets the depth where the ground opens, then the pit's inside walls draw into the gap.
M.pitPunch = new THREE.ShaderMaterial({ vertexShader:'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader:'void main(){ gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }', colorWrite:false, depthFunc:THREE.AlwaysDepth, fog:false });
M.pitWall = new THREE.MeshStandardMaterial({ map:TEX.dirtPit, normalMap:TEX.dirtNPit, roughness:1, vertexColors:true, side:THREE.BackSide });
export const GEO_PIT = (() => {
  const gq = new THREE.BoxGeometry(1, 1, 1, 1, 8, 1); gq.translate(0, -0.5, 0);
  const pos = gq.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++){ const k = Math.pow(1 + pos.getY(i), 2.2) * 0.85 + 0.06; cols.push(k, k * 0.97, k * 0.93); }
  gq.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return { walls:gq, punch:new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) };
})();
// Fence panels and their feet are instanced and slide past with the ground.
const FENCE = { P:3, N:52, X:4.5 };
const fenceMat = new THREE.MeshStandardMaterial({ map:TEX.fence, transparent:true, alphaTest:0.08, side:THREE.DoubleSide, depthWrite:false, roughness:0.42, metalness:0.65 });
const fencePanels = new THREE.InstancedMesh(new THREE.PlaneGeometry(FENCE.P, 2.05), fenceMat, FENCE.N * 2);
fencePanels.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:TEX.fenceShadow, alphaTest:0.5, side:THREE.DoubleSide });
fencePanels.castShadow = true; fencePanels.frustumCulled = false; scene.add(fencePanels);
const fenceFeet = new THREE.InstancedMesh(new RoundedBoxGeometry(0.24, 0.15, 0.7, 2, 0.04), M.concrete, FENCE.N * 2);
fenceFeet.castShadow = fenceFeet.receiveShadow = true; fenceFeet.frustumCulled = false; scene.add(fenceFeet);
export function updateFence(dist){
  const span = FENCE.N * FENCE.P;
  for (let k = 0; k < FENCE.N; k++){
    const z = Z_NEAR - ((((k * FENCE.P - dist) % span) + span) % span);
    for (const side of [0, 1]){
      const sx = side ? FENCE.X : -FENCE.X, i = k * 2 + side;
      _q.setFromAxisAngle(_up, side ? -Math.PI / 2 : Math.PI / 2);
      fencePanels.setMatrixAt(i, _m4.compose(_v3.set(sx, 1.1, z), _q, _s3));
      fenceFeet.setMatrixAt(i, _m4.compose(_v3.set(sx, 0.075, z + FENCE.P / 2), _q.identity(), _s3));
    }
  }
  fencePanels.instanceMatrix.needsUpdate = true; fenceFeet.instanceMatrix.needsUpdate = true;
}
updateFence(0);
