// The WebGL renderer, scene, camera, fog and lights, and the shadow camera fit.
import * as THREE from 'three';
import { canvas } from '../core/utils.js';
import { Q } from '../core/quality.js';

export const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance', stencil:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().dpr));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Neutral tone mapping keeps the brand green and the hazard yellow true to their hex values.
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
export const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 650);
export const FOG = { near:30, far:128 };
scene.fog = new THREE.Fog(0xffffff, FOG.near, FOG.far);
// Light intensities in the palette are in the old (legacy) units. Physically based lighting needs them times pi.
export const LIGHT_K = Math.PI;
export const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); scene.add(hemi);
// Late-morning sun from behind and to the right: it lights the faces the player runs towards and throws shadows forward-left.
export const SUN_DIR = new THREE.Vector3(0.6, 0.62, 0.5).normalize();
export const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.camera.up.set(0, 0, -1); // align the shadow map with the track so its texels are spent along the road
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035;
scene.add(sun); scene.add(sun.target);
export const SHADOW_Z = [-64, 10]; // the stretch of track the shadow map covers, from far ahead to just behind the camera
export function fitShadow(){
  const [sw, sh] = Q().shadow;
  if (sun.shadow.mapSize.x !== sw || sun.shadow.mapSize.y !== sh){ sun.shadow.mapSize.set(sw, sh); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } }
  const tgt = new THREE.Vector3(0, 0, -22);
  sun.target.position.copy(tgt); sun.position.copy(SUN_DIR).multiplyScalar(80).add(tgt);
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  // Cover the track from just behind the camera to 64 m ahead, including tall props beside the road.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity; const v = new THREE.Vector3();
  for (const x of [-9, 9]) for (const y of [0, 9]) for (const z of SHADOW_Z){ v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  Object.assign(cam, { left:x0, right:x1, bottom:y0, top:y1, near:Math.max(0.5, -z1 - 60), far:-z0 + 4 }); cam.updateProjectionMatrix();
}
fitShadow();
