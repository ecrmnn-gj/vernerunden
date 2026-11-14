// Low-poly people: the player, workers, inspectors and kids are all built here.
import * as THREE from 'three';
import { FONT_C, pick } from '../core/utils.js';
import { canvasTex } from '../textures/canvas.js';
import { mat } from '../render/materials.js';
import { box, addMesh, bake } from '../world/geometry.js';

const matCache = {};
const matC = hex => matCache[hex] || (matCache[hex] = mat(hex));
const smatCache = {};
export function smat(hex, rough, metal){ const k = hex + '|' + rough + '|' + (metal || 0); return smatCache[k] || (smatCache[k] = new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), roughness:rough, metalness:metal || 0 })); }
const SKINS = ['#E8BE9C', '#C99A76', '#A8714C', '#7A4E33', '#F0CDB2', '#B9825C'], HAIRS = ['#2B1E16', '#4E3220', '#141414', '#8A6A3E', '#9A9A96', '#6B3A1E'];
const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg, open) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg || 24);
const HG = {
  torso:lathe([[0, 0.02], [0.15, 0.04], [0.165, 0.12], [0.158, 0.22], [0.165, 0.32], [0.186, 0.44], [0.2, 0.53], [0.196, 0.6], [0.15, 0.655], [0.07, 0.69], [0, 0.7]]),
  hips:lathe([[0, -0.1], [0.12, -0.1], [0.158, -0.04], [0.165, 0.04], [0.152, 0.1], [0, 0.1]]),
  vest:lathe([[0.173, 0.14], [0.168, 0.22], [0.174, 0.32], [0.194, 0.44], [0.208, 0.53], [0.203, 0.6], [0.162, 0.652]]),
  band1:new THREE.CylinderGeometry(0.177, 0.176, 0.042, 24, 1, true), band2:new THREE.CylinderGeometry(0.2, 0.197, 0.042, 24, 1, true),
  belt:new THREE.CylinderGeometry(0.168, 0.168, 0.042, 24, 1, true), strap:box(0.034, 0.2, 0.008), zip:box(0.008, 0.42, 0.006),
  shirtFront:box(0.075, 0.2, 0.006), lapel:box(0.04, 0.2, 0.008), tie:box(0.034, 0.24, 0.008), collar:box(0.12, 0.05, 0.03),
  neck:new THREE.CylinderGeometry(0.048, 0.055, 0.11, 14),
  cranium:new THREE.SphereGeometry(0.105, 26, 20), jaw:new THREE.SphereGeometry(0.085, 22, 16), nose:new THREE.ConeGeometry(0.018, 0.046, 10),
  eyeW:new THREE.SphereGeometry(0.016, 12, 10), pupil:new THREE.SphereGeometry(0.0085, 8, 6), brow:box(0.036, 0.008, 0.01), mouth:box(0.04, 0.007, 0.01),
  ear:new THREE.SphereGeometry(0.022, 10, 8), hairTop:new THREE.SphereGeometry(0.112, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hairBack:new THREE.SphereGeometry(0.1, 20, 14),
  beard:new THREE.SphereGeometry(0.089, 22, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
  dome:new THREE.SphereGeometry(0.136, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), brim:new THREE.CylinderGeometry(0.15, 0.156, 0.014, 32), ridge:box(0.03, 0.026, 0.25),
  glasses:box(0.15, 0.022, 0.012), lens:box(0.05, 0.03, 0.004),
  joint:new THREE.SphereGeometry(0.06, 14, 10), upper:new THREE.CylinderGeometry(0.054, 0.046, 0.28, 14), fore:new THREE.CylinderGeometry(0.045, 0.037, 0.25, 14), elbow:new THREE.SphereGeometry(0.047, 12, 10),
  palm:new THREE.SphereGeometry(0.045, 14, 10), thumb:new THREE.CylinderGeometry(0.014, 0.012, 0.055, 8),
  thigh:new THREE.CylinderGeometry(0.08, 0.062, 0.44, 16), knee:new THREE.SphereGeometry(0.062, 14, 10), pad:box(0.1, 0.11, 0.03), shin:new THREE.CylinderGeometry(0.06, 0.047, 0.4, 16),
  bootUp:new THREE.CylinderGeometry(0.056, 0.062, 0.1, 14), foot:box(0.1, 0.07, 0.2), toe:new THREE.SphereGeometry(0.052, 14, 10), sole:box(0.112, 0.022, 0.235),
  // hair styles and facial hair
  hairLong:new THREE.CapsuleGeometry(0.075, 0.2, 6, 16), lock:new THREE.CapsuleGeometry(0.026, 0.1, 4, 10), pony:new THREE.CapsuleGeometry(0.032, 0.16, 4, 12),
  tie:new THREE.SphereGeometry(0.026, 12, 8), bun:new THREE.SphereGeometry(0.05, 16, 12), curl:new THREE.SphereGeometry(0.03, 10, 8),
  stache:new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), chin:new THREE.SphereGeometry(0.03, 12, 10), lash:box(0.032, 0.006, 0.006)
};
const HAIR_STYLES = ['short', 'long', 'ponytail', 'bun', 'curly', 'bald'], FACIALS = ['none', 'stubble', 'mustache', 'goatee', 'full'];
export let backTex = null;
// o.female narrows the shoulders and widens the hips; o.hairStyle and o.facial pick from HAIR_STYLES and FACIALS.
export function makeHuman(o){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.97;
  const skinC = o.skin || pick(SKINS), skin = smat(skinC, 0.62), hairC = o.hair || pick(HAIRS), hair = smat(hairC, 0.85);
  const shirt = o.shirt, pants = o.pants, boots = o.boots || smat('#4A3422', 0.7), soleM = smat('#1A1714', 0.9), dark = smat('#1A1714', 0.6);
  const bx = o.female ? 0.92 : 1, hx = o.female ? 1.07 : 1;
  addMesh(body, HG.hips, pants, 0, 0, 0, hx, 1, 0.74 * (o.female ? 1.06 : 1));
  addMesh(body, HG.torso, shirt, 0, 0, 0, bx, 1, 0.63);
  addMesh(body, HG.belt, smat('#1C1A18', 0.5), 0, 0.075, 0, hx * 0.98, 1, 0.75).material.side = THREE.DoubleSide;
  if (o.vest){
    const v = addMesh(body, HG.vest, o.vest, 0, 0, 0, bx, 1, 0.67); v.material.side = THREE.DoubleSide;
    addMesh(body, HG.band1, o.stripe, 0, 0.29, 0, bx, 1, 0.69); addMesh(body, HG.band2, o.stripe, 0, 0.46, 0, bx, 1, 0.68);
    for (const x of [-0.085, 0.085]) for (const z of [-0.137, 0.137]){ const st = addMesh(body, HG.strap, o.stripe, x * bx, 0.56, z); st.rotation.x = z < 0 ? 0.18 : -0.18; }
    addMesh(body, HG.zip, dark, 0, 0.4, -0.123);
    if (o.backText){
      if (!backTex) backTex = canvasTex(256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); let fs = 46; c.font = `800 ${fs}px ${FONT_C}`; const tw = c.measureText(o.backText).width; if (tw > w - 16){ fs = Math.floor(fs * (w - 16) / tw); c.font = `800 ${fs}px ${FONT_C}`; } c.fillStyle = '#F2F2F0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.backText, w / 2, h / 2 + 2); });
      const bt = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065), new THREE.MeshStandardMaterial({ map:backTex, transparent:true, roughness:0.4, emissive:new THREE.Color('#FFFFFF'), emissiveMap:backTex, emissiveIntensity:0.25 })); bt.position.set(0, 0.38, 0.131); body.add(bt);
    }
  }
  if (o.suit){
    addMesh(body, HG.shirtFront, smat('#F4F4F2', 0.6), 0, 0.53, -0.124);
    addMesh(body, HG.tie, o.suit.tie, 0, 0.5, -0.128);
    for (const x of [-1, 1]){ const l = addMesh(body, HG.lapel, shirt, x * 0.05, 0.54, -0.127); l.rotation.z = x * 0.32; }
    addMesh(body, HG.collar, smat('#F4F4F2', 0.6), 0, 0.665, -0.07);
  }
  addMesh(body, HG.neck, skin, 0, 0.72, 0, o.female ? 0.88 : 1, 1, o.female ? 0.88 : 1);
  const head = new THREE.Group(); head.position.set(0, 0.855, 0); body.add(head);
  addMesh(head, HG.cranium, skin, 0, 0, 0, 0.93, 1.08, 1.02);
  if (o.female) addMesh(head, HG.jaw, skin, 0, -0.05, -0.014, 0.86, 0.76, 0.9);
  else addMesh(head, HG.jaw, skin, 0, -0.055, -0.016, 0.95, 0.8, 0.95);
  const nose = addMesh(head, HG.nose, skin, 0, -0.012, -0.106); nose.rotation.x = -Math.PI / 2 - 0.25;
  for (const x of [-0.037, 0.037]){
    addMesh(head, HG.eyeW, smat('#F2EFEA', 0.4), x, 0.018, -0.086); addMesh(head, HG.pupil, smat('#2A2018', 0.3), x, 0.018, -0.1); addMesh(head, HG.brow, hair, x, 0.043, -0.096);
    if (o.female) addMesh(head, HG.lash, dark, x, 0.031, -0.1);
  }
  const facial = o.facial || (o.beard ? 'full' : 'none'), style = o.hairStyle || (o.bald ? 'bald' : 'short'); let pony = null;
  addMesh(head, HG.mouth, smat(o.female ? '#9A4A48' : '#7A3E35', 0.55), 0, -0.06, facial === 'full' ? -0.107 : facial === 'stubble' ? -0.103 : -0.088, o.female ? 1.05 : 1, o.female ? 1.6 : 1, 1);
  for (const x of [-0.098, 0.098]) addMesh(head, HG.ear, skin, x, -0.002, 0.006, 0.5, 1, 0.8);
  // hair: most of it shows below the helmet brim, at the back and sides
  if (style !== 'bald'){
    addMesh(head, HG.hairTop, hair, 0, 0.024, 0.01, 0.97, 1.08, 1.06); addMesh(head, HG.hairBack, hair, 0, -0.02, 0.034, 0.93, 0.86, 0.8);
    for (const x of [-0.093, 0.093]) addMesh(head, HG.lock, hair, x, -0.008, -0.022, 0.55, 0.42, 0.6); // sideburns, so the hair shows from the front too
  }
  if (style === 'long'){
    addMesh(head, HG.hairLong, hair, 0, -0.13, 0.06, 1.18, 1, 0.78);
    for (const x of [-0.085, 0.085]) addMesh(head, HG.lock, hair, x, -0.075, 0.005, 1, 1, 0.9);
  } else if (style === 'ponytail'){
    const pv = new THREE.Group(); pv.position.set(0, -0.005, 0.105); pv.rotation.x = -0.45; head.add(pv);
    addMesh(pv, HG.tie, hair, 0, 0, 0); addMesh(pv, HG.pony, hair, 0, -0.11, 0, 1, 1, 0.85);
    pony = pv;
  } else if (style === 'bun') addMesh(head, HG.bun, hair, 0, -0.025, 0.112);
  else if (style === 'curly'){
    // a ring of curls around the back half of the head, from ear to ear
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++){
      const a = Math.PI * (0.02 + i * 0.12) + (row % 2) * 0.17, r = 0.1 - row * 0.008;
      addMesh(head, HG.curl, hair, Math.cos(a) * r, 0.0 - row * 0.042, Math.sin(a) * r * 1.05 + 0.02);
    }
  }
  // facial hair
  if (facial === 'stubble') addMesh(head, HG.beard, smat('#' + new THREE.Color(skinC).lerp(new THREE.Color(hairC), 0.45).getHexString(), 0.9), 0, -0.05, -0.016, 0.95, 0.85, 0.95);
  if (facial === 'full') addMesh(head, HG.beard, hair, 0, -0.05, -0.016, 1, 0.92, 1);
  if (facial === 'mustache' || facial === 'goatee' || facial === 'full') for (const s of [-1, 1]){ const st = addMesh(head, HG.stache, hair, s * 0.021, -0.041, facial === 'full' ? -0.106 : -0.098, 1, 1, 0.7); st.rotation.z = s * (Math.PI / 2 - 0.28); }
  if (facial === 'goatee') addMesh(head, HG.chin, hair, 0, -0.118, -0.074, 0.9, 1.25, 0.7);
  if (o.glasses){ addMesh(head, HG.glasses, dark, 0, 0.02, -0.104); for (const x of [-0.037, 0.037]) addMesh(head, HG.lens, smat('#9CC3D8', 0.1, 0.2), x, 0.018, -0.106); }
  if (o.helmet){ addMesh(head, HG.dome, o.helmet, 0, 0.038, 0, 1, 0.95, 1.08); addMesh(head, HG.brim, o.helmet, 0, 0.038, -0.014, 1.05, 1, 1.2); addMesh(head, HG.ridge, o.helmet, 0, 0.165, 0); }
  const mk = (x) => {
    const sh = new THREE.Group(); sh.position.set(x, 0.6, 0); body.add(sh);
    addMesh(sh, HG.joint, shirt, 0, -0.01, 0);
    addMesh(sh, HG.upper, shirt, 0, -0.14, 0);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    addMesh(el, HG.elbow, shirt, 0, 0, 0); addMesh(el, HG.fore, shirt, 0, -0.125, 0);
    const handM = o.gloves || skin;
    addMesh(el, HG.palm, handM, 0, -0.29, 0, 0.75, 1.15, 0.55);
    const th = addMesh(el, HG.thumb, handM, -Math.sign(x) * 0.03, -0.27, -0.02); th.rotation.z = Math.sign(x) * 0.6;
    const hp = new THREE.Group(); hp.position.set(Math.sign(x) * 0.095 * hx, -0.02, 0); body.add(hp);
    addMesh(hp, HG.thigh, pants, 0, -0.22, 0);
    const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
    addMesh(kn, HG.knee, pants, 0, 0, 0);
    if (o.kneepads) addMesh(kn, HG.pad, dark, 0, -0.02, -0.058);
    addMesh(kn, HG.shin, pants, 0, -0.2, 0);
    const an = new THREE.Group(); an.position.y = -0.41; kn.add(an);
    addMesh(an, HG.bootUp, boots, 0, 0.0, 0); addMesh(an, HG.foot, boots, 0, -0.05, -0.045); addMesh(an, HG.toe, boots, 0, -0.055, -0.13, 1, 0.68, 1); addMesh(an, HG.sole, soleM, 0, -0.088, -0.05);
    return { sh, el, hp, kn, an };
  };
  const L = mk(-0.205 * bx), Rr = mk(0.205 * bx);
  for (const grp of [body, head, L.sh, L.el, L.hp, L.kn, L.an, Rr.sh, Rr.el, Rr.hp, Rr.kn, Rr.an, pony].filter(Boolean)) bake(grp, true);
  return { root, body, head, pony, shL:L.sh, elL:L.el, hipL:L.hp, knL:L.kn, anL:L.an, shR:Rr.sh, elR:Rr.el, hipR:Rr.hp, knR:Rr.kn, anR:Rr.an };
}
