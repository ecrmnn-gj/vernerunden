// Builds pickup meshes with their glow.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from '../core/palette.js';
import { canvasTex, labelSprite } from '../textures/canvas.js';
import { getIconTex } from '../textures/icons.js';
import { M } from '../render/materials.js';
import { GEO, addMesh } from '../world/geometry.js';
import { PICK_GLOW } from './content.js';

const glowTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
const blobTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
const ringTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 30, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
export function buildPickup(kind, name){
  const grp = new THREE.Group(), spin = new THREE.Group(); grp.add(spin);
  if (kind === 'app' || kind === 'rival'){
    addMesh(spin, new RoundedBoxGeometry(0.42, 0.76, 0.08, 3, 0.05), M.dark, 0, 0, 0);
    const scrM = new THREE.MeshBasicMaterial({ map:getIconTex(kind), transparent:true });
    if (kind === 'app') scrM.color.setScalar(1.6);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), scrM);
    scr.scale.set(1.5, 1.5, 1); scr.position.z = 0.045; spin.add(scr);
    const back = scr.clone(); back.rotation.y = Math.PI; back.position.z = -0.045; spin.add(back);
    if (kind === 'app'){ const lab = labelSprite('Grønn Jobb-appen', { height:0.3 }); lab.position.y = 0.75; grp.add(lab); }
  } else {
    const mats = [M.gold, new THREE.MeshBasicMaterial({ map:getIconTex(kind) }), new THREE.MeshBasicMaterial({ map:getIconTex(kind) })];
    const d = new THREE.Mesh(GEO.disc, mats); d.rotation.x = Math.PI / 2; d.castShadow = true; spin.add(d);
    const rim = new THREE.Mesh(GEO.pickRim, M.gold); spin.add(rim);
  }
  // halo and a pool of light on the ground; both feed the bloom pass
  const gc = PICK_GLOW[kind];
  if (gc){
    const col = new THREE.Color(P[gc]).multiplyScalar(1.8);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:col, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending, fog:false }));
    glow.scale.setScalar(kind === 'app' ? 2.0 : 1.5); glow.userData.base = 0.55; grp.add(glow); grp.userData.glow = glow;
    const ring = new THREE.Mesh(GEO.ground1, new THREE.MeshBasicMaterial({ map:ringTex, color:col, transparent:true, opacity:0.5, depthWrite:false, blending:THREE.AdditiveBlending }));
    ring.renderOrder = 2; grp.add(ring); grp.userData.ring = ring;
  }
  const shadow = new THREE.Mesh(GEO.ground1, new THREE.MeshBasicMaterial({ map:blobTex, transparent:true, depthWrite:false }));
  shadow.scale.setScalar(0.9); grp.add(shadow); grp.userData.shadow = shadow;
  grp.userData.spin = spin;
  return grp;
}
