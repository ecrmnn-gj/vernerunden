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
// One smooth limb segment hanging from its joint (y = 0) down to the next joint (y = -len). st lists [t, radius] from the top
// (t = 0) to the bottom (t = 1), shaped like the muscle under the cloth. Both ends are round caps centred on the joints, so the
// segments on either side of a joint meet in the same sphere and a bent knee or elbow stays filled in.
function limb(len, st, seg){
  const pts = [], rt = st[0][1], rb = st[st.length - 1][1], CAP = 5;
  for (let i = 0; i <= CAP; i++){ const a = -Math.PI / 2 + (i / CAP) * Math.PI / 2; pts.push(V2(rb * Math.cos(a), -len + rb * Math.sin(a))); }
  for (let i = st.length - 2; i >= 1; i--) pts.push(V2(st[i][1], -st[i][0] * len));
  for (let i = 0; i <= CAP; i++){ const a = (i / CAP) * Math.PI / 2; pts.push(V2(rt * Math.cos(a), rt * Math.sin(a))); }
  return new THREE.LatheGeometry(pts, seg || 16);
}
// Segment lengths, joint to joint. Shoulder to fingertip is about 45 % of standing height, as on a real adult.
const UPPER = 0.33, FORE = 0.27, THIGH = 0.44, SHIN = 0.41;
const HG = {
  torso:lathe([[0, 0.02], [0.15, 0.04], [0.165, 0.12], [0.158, 0.22], [0.165, 0.32], [0.186, 0.44], [0.2, 0.53], [0.196, 0.6], [0.15, 0.655], [0.07, 0.69], [0, 0.7]]),
  hips:lathe([[0, -0.1], [0.125, -0.1], [0.165, -0.04], [0.172, 0.04], [0.155, 0.1], [0, 0.1]]),
  vest:lathe([[0.173, 0.14], [0.168, 0.22], [0.174, 0.32], [0.194, 0.44], [0.208, 0.53], [0.203, 0.6], [0.162, 0.652]]),
  band1:new THREE.CylinderGeometry(0.177, 0.176, 0.042, 24, 1, true), band2:new THREE.CylinderGeometry(0.2, 0.197, 0.042, 24, 1, true),
  belt:new THREE.CylinderGeometry(0.168, 0.168, 0.042, 24, 1, true), strap:box(0.034, 0.2, 0.008), zip:box(0.008, 0.42, 0.006),
  shirtFront:box(0.075, 0.2, 0.006), lapel:box(0.04, 0.2, 0.008), tie:box(0.034, 0.24, 0.008), collar:box(0.12, 0.05, 0.03),
  neck:new THREE.CylinderGeometry(0.054, 0.064, 0.12, 16),
  // shoulder line from deltoid to deltoid, so the arms grow out of the body instead of hanging off it
  yoke:new THREE.CapsuleGeometry(0.06, 0.27, 5, 14), delt:new THREE.SphereGeometry(0.068, 16, 12), trap:new THREE.CapsuleGeometry(0.042, 0.1, 4, 12),
  glute:new THREE.SphereGeometry(0.09, 16, 12),
  cranium:new THREE.SphereGeometry(0.105, 26, 20), jaw:new THREE.SphereGeometry(0.085, 22, 16), nose:new THREE.ConeGeometry(0.018, 0.046, 10),
  eyeW:new THREE.SphereGeometry(0.016, 12, 10), pupil:new THREE.SphereGeometry(0.0085, 8, 6), brow:box(0.036, 0.008, 0.01), mouth:box(0.04, 0.007, 0.01),
  ear:new THREE.SphereGeometry(0.022, 10, 8), hairTop:new THREE.SphereGeometry(0.112, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hairBack:new THREE.SphereGeometry(0.1, 20, 14),
  beard:new THREE.SphereGeometry(0.089, 22, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
  dome:new THREE.SphereGeometry(0.136, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), brim:new THREE.CylinderGeometry(0.15, 0.156, 0.014, 32), ridge:new THREE.TorusGeometry(0.136, 0.015, 6, 24, Math.PI),
  glasses:box(0.15, 0.022, 0.012), lens:box(0.05, 0.03, 0.004),
  // arms: deltoid and biceps, then a forearm that is full below the elbow and slim at the wrist
  upper:limb(UPPER, [[0, 0.066], [0.12, 0.07], [0.35, 0.06], [0.6, 0.058], [0.85, 0.05], [1, 0.048]]),
  fore:limb(FORE, [[0, 0.048], [0.15, 0.053], [0.4, 0.048], [0.75, 0.038], [1, 0.033]]),
  // hands: a flat palm, four fingers in a relaxed curl and a thumb, about as long as the face is tall
  palm:new THREE.SphereGeometry(1, 16, 12), finger:new THREE.CapsuleGeometry(0.0105, 0.04, 3, 8), thumb:new THREE.CapsuleGeometry(0.011, 0.036, 3, 8), cuff:new THREE.CylinderGeometry(0.039, 0.036, 0.05, 14),
  // legs in work trousers: full thighs that meet at the crotch, a calf, and a hem that sits over the boot
  thigh:limb(THIGH, [[0, 0.086], [0.1, 0.09], [0.4, 0.083], [0.75, 0.07], [1, 0.062]]),
  shin:limb(SHIN, [[0, 0.062], [0.25, 0.065], [0.6, 0.059], [0.9, 0.061], [1, 0.054]]), pad:box(0.1, 0.11, 0.03),
  bootUp:new THREE.CylinderGeometry(0.056, 0.064, 0.12, 14), foot:box(0.106, 0.075, 0.22), toe:new THREE.SphereGeometry(0.054, 14, 10), sole:box(0.116, 0.024, 0.285),
  // hair styles and facial hair
  hairLong:new THREE.CapsuleGeometry(0.075, 0.2, 6, 16), lock:new THREE.CapsuleGeometry(0.026, 0.1, 4, 10), pony:new THREE.CapsuleGeometry(0.032, 0.16, 4, 12),
  ptie:new THREE.SphereGeometry(0.026, 12, 8), bun:new THREE.SphereGeometry(0.05, 16, 12), curl:new THREE.SphereGeometry(0.03, 10, 8),
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
  addMesh(body, HG.yoke, shirt, 0, 0.605, 0.004, 0.8, bx, 1.2).rotation.z = Math.PI / 2;
  // trapezius sloping from the neck down to each shoulder, and a seat in the trousers
  for (const s of [-1, 1]){
    addMesh(body, HG.trap, shirt, s * 0.11 * bx, 0.66, 0.008, 0.85, 1, 1.1).rotation.z = s * Math.atan2(0.13 * bx, 0.07);
    addMesh(body, HG.glute, pants, s * 0.072 * hx, -0.04, 0.05, hx, 1, 0.95);
  }
  addMesh(body, HG.neck, skin, 0, 0.72, 0, o.female ? 0.86 : 1, 1, o.female ? 0.86 : 1);
  // a slightly smaller head than before, about an eighth of standing height
  const head = new THREE.Group(); head.position.set(0, 0.855, 0); head.scale.setScalar(0.94); body.add(head);
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
    addMesh(pv, HG.ptie, hair, 0, 0, 0); addMesh(pv, HG.pony, hair, 0, -0.11, 0, 1, 1, 0.85);
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
  if (o.helmet){ addMesh(head, HG.dome, o.helmet, 0, 0.038, 0, 1, 0.95, 1.08); addMesh(head, HG.brim, o.helmet, 0, 0.038, -0.014, 1.05, 1, 1.2); const rg = addMesh(head, HG.ridge, o.helmet, 0, 0.038, 0, 1.08, 0.95, 1); rg.rotation.y = Math.PI / 2; }
  const lw = o.female ? 0.9 : 1; // limb girth
  const mk = (x) => {
    const s = Math.sign(x); // +1 on the right; the body's centre line is towards -s
    const sh = new THREE.Group(); sh.position.set(x, 0.6, 0); body.add(sh);
    addMesh(sh, HG.delt, shirt, -s * 0.008, -0.03, 0, lw, 1.12 * lw, 1.05 * lw);
    addMesh(sh, HG.upper, shirt, 0, 0, 0, lw, 1, lw);
    const el = new THREE.Group(); el.position.y = -UPPER; sh.add(el);
    addMesh(el, HG.fore, shirt, 0, 0, 0, lw, 1, lw * 0.94);
    // The hand hangs palm-in. Its meshes sit straight in the forearm group so they bake with it.
    const handM = o.gloves || skin, w = -FORE, hs = o.female ? 0.92 : 1;
    if (o.gloves) addMesh(el, HG.cuff, handM, 0, w + 0.012, 0, lw, 1, lw);
    addMesh(el, HG.palm, handM, -s * 0.004, w - 0.05 * hs, -0.004, 0.021 * hs, 0.052 * hs, 0.043 * hs);
    // fingers, index (front) to little finger, curled a little towards the thigh
    [[-0.022, 0.95], [-0.0075, 1.1], [0.0075, 1.04], [0.021, 0.8]].forEach(([z, len]) => {
      const f = addMesh(el, HG.finger, handM, 0, 0, z * hs, hs, len * hs, hs), half = (0.02 * len + 0.0105) * hs, a = -s * 0.5;
      f.rotation.z = a; f.position.x = -s * 0.004 + Math.sin(a) * half; f.position.y = w - 0.094 * hs - Math.cos(a) * half;
    });
    { const t = addMesh(el, HG.thumb, handM, 0, 0, 0, hs, hs, hs), ax = 0.55, az = -s * 0.42, half = 0.029 * hs;
      t.rotation.set(ax, 0, az);
      t.position.set(-s * 0.012 + Math.sin(az) * half, w - 0.03 * hs - Math.cos(az) * Math.cos(ax) * half, -0.034 * hs - Math.cos(az) * Math.sin(ax) * half); }
    const hp = new THREE.Group(); hp.position.set(s * 0.09 * hx, -0.02, 0); body.add(hp);
    addMesh(hp, HG.thigh, pants, 0, 0, 0, lw, 1, lw * 0.95);
    const kn = new THREE.Group(); kn.position.y = -THIGH; hp.add(kn);
    if (o.kneepads) addMesh(kn, HG.pad, dark, 0, -0.02, -0.06);
    addMesh(kn, HG.shin, pants, 0, 0, 0, lw, 1, lw);
    const an = new THREE.Group(); an.position.y = -SHIN; kn.add(an);
    addMesh(an, HG.bootUp, boots, 0, 0.01, 0); addMesh(an, HG.foot, boots, 0, -0.052, -0.05); addMesh(an, HG.toe, boots, 0, -0.058, -0.155, 1, 0.68, 1); addMesh(an, HG.sole, soleM, 0, -0.087, -0.06);
    return { sh, el, hp, kn, an };
  };
  const L = mk(-0.205 * bx), Rr = mk(0.205 * bx);
  for (const grp of [body, head, L.sh, L.el, L.hp, L.kn, L.an, Rr.sh, Rr.el, Rr.hp, Rr.kn, Rr.an, pony].filter(Boolean)) bake(grp, true);
  return { root, body, head, pony, shL:L.sh, elL:L.el, hipL:L.hp, knL:L.kn, anL:L.an, shR:Rr.sh, elR:Rr.el, hipR:Rr.hp, knR:Rr.kn, anR:Rr.an };
}
