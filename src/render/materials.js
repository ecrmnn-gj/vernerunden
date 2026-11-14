// Shared physically based materials.
import * as THREE from 'three';
import { P } from '../core/palette.js';

export const M = {};
// Every lit surface is physically based so it picks up the sky's environment light and reflections.
export const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness:0.72, metalness:0 }, extra || {}));
export const GLOW = 2.6; // emissive colours above 1.0 reach the bloom pass
function makeMaterials(){
  M.green = mat(P.green, { roughness:0.62 }); M.greenDark = mat(P.greenDark); M.gold = mat(P.gold, { roughness:0.3, metalness:0.85 });
  M.yellowGlow = mat(P.yellow, { emissive:new THREE.Color(P.yellow), emissiveIntensity:0.32, roughness:0.35 });
  M.red = mat(P.red, { roughness:0.5 }); M.orange = mat(P.orange, { roughness:0.48 }); M.yellow = mat(P.yellow, { roughness:0.5 });
  M.paper = mat(P.paper, { roughness:0.8 }); M.white = mat(P.paper, { roughness:0.5 });
  M.dark = mat(P.outline, { roughness:0.55 }); M.steel = mat(P.steel, { roughness:0.32, metalness:0.85 }); M.wood = mat(P.wood, { roughness:0.88 });
  M.npc = mat(P.npc); M.suit = mat(P.suit);
  M.frame = mat(P.frame, { roughness:0.95 }); M.far = mat(P.far, { roughness:0.6, metalness:0.2 }); M.sil = mat(P.sil, { roughness:0.45, metalness:0.55 }); M.blue = mat(P.blue);
  M.glass = mat('#1C2731', { roughness:0.04, metalness:0.1, envMapIntensity:1.6 });
  M.lamp = mat(P.lamp, { emissive:new THREE.Color(P.lamp), emissiveIntensity:0.25, roughness:0.3 });
  M.headlight = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.lamp).multiplyScalar(GLOW) });
  M.tail = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.red).multiplyScalar(1.6) });
  M.redLight = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.red).multiplyScalar(GLOW * 2), fog:false });
  M.beam = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.lamp), transparent:true, opacity:isNaN(parseFloat(P.beamA)) ? 0.06 : parseFloat(P.beamA), depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide });
  M.dirt = mat(P.ground2, { roughness:1 });
  M.rubber = mat('#1E1F21', { roughness:0.92 }); M.rim = mat('#C9CFD3', { roughness:0.25, metalness:0.9 }); M.plastic = mat('#2A2D31', { roughness:0.55 });
  M.concrete = mat('#B5B0A6', { roughness:0.96 });
}
makeMaterials();
