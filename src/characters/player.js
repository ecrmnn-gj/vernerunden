// The player's character: made in the creator and saved on this device.
import * as THREE from 'three';
import { store } from '../core/utils.js';
import { scene } from '../render/renderer.js';
import { M, mat } from '../render/materials.js';
import { box, disposeBaked } from '../world/geometry.js';
import { P } from '../core/palette.js';
import { CHAR_DEFAULT, migrateChar } from './charSchema.js';
import { smat, makeHuman } from './human.js';
import { assembleFigure } from './figure/assemble.js';
import { requestPart } from './figure/client.js';
import { PARTS, partKey } from './figure/keys.js';
import { gfxTier } from '../core/quality.js';

// The player is the generated figure (figure/). The old makeHuman figure remains as a fallback if generation fails,
// and with ?fig=old for comparison.
let legacy = (() => { try { return new URLSearchParams(location.search).get('fig') === 'old'; } catch (e){ return false; } })();

// The schema (options, defaults, migration, random figures) lives in charSchema.js; re-exported for the UI.
export { CHAR_OPTS, CHAR_TABS, HEAD_TABS, CHAR_DEFAULT, sameChar, randomChar, isShapeKey } from './charSchema.js';
// A save from an older version is migrated instead of discarded.
export let charSaved = migrateChar(store.get('vr3d:char', null));
export let char = Object.assign({}, charSaved || CHAR_DEFAULT);
export function setChar(c){ char = c; }
export function saveChar(){ charSaved = Object.assign({}, char); store.set('vr3d:char', charSaved); }
const stripeSilver = mat('#DADDE0', { roughness:0.3, metalness:0.5, emissive:new THREE.Color('#FFFFFF'), emissiveIntensity:0.06 });
const vestMats = {};
// Hi-vis fabric glows a little, like fluorescent cloth does in daylight.
const vestMat = hex => vestMats[hex] || (vestMats[hex] = mat(hex, { roughness:0.65, emissive:new THREE.Color(hex), emissiveIntensity:0.12 }));
// The legacy figure has fewer styles, so new ones map to the closest it can draw.
const LEGACY_HAIR = { buzz:'short', afro:'curly', braids:'ponytail' }, LEGACY_FACIAL = { boxed:'full', long:'full', mustacheGoatee:'goatee' };
function charToHuman(c){
  const green = c.vest === 'green';
  return { female:c.gender === 'female', skin:c.skin, hair:c.hair, hairStyle:LEGACY_HAIR[c.hairStyle] || c.hairStyle, facial:LEGACY_FACIAL[c.facial] || c.facial,
    shirt:smat(c.shirt === 'green' ? P.green : c.shirt, 0.85), pants:smat(c.pants, 0.9),
    vest:green ? M.green : vestMat(c.vest), stripe:green ? M.yellowGlow : stripeSilver, helmet:helmetOn ? smat(c.helmet, 0.32, 0.05) : null,
    gloves:c.gloves === 'on' ? smat('#C7B48A', 0.8) : null, kneepads:true, backText:'VERNEOMBUD' };
}
// The helmet comes off while the creator shows the face or hair.
let helmetOn = true;
export function setHelmet(on){
  if (on === helmetOn) return; helmetOn = on;
  if (!legacy){ if (player && player.setHelmet) player.setHelmet(on); return; }
  buildPlayer();
}
export let player = null, playerMats = [], playerRainbow = false;
export function setPlayerRainbow(on){ playerRainbow = on; }
// (Re)build the player from `char`, keeping where it stands. Returns a promise that resolves once the new figure is
// showing (true), or was superseded by a newer request (false).
export function buildPlayer(){
  if (!legacy) return buildFigure();
  buildLegacy();
  return Promise.resolve(true);
}
// The old figure. Each mesh gets its own material so super speed can tint them.
function buildLegacy(){
  const keep = player && { p:player.root.position.clone(), r:player.root.rotation.clone() };
  if (player){ scene.remove(player.root); disposeBaked(player.root); player.root.traverse(m => { if (m.isMesh) m.material.dispose(); }); }
  player = makeHuman(charToHuman(char)); player.ready = true; playerMats = []; playerRainbow = false;
  player.root.traverse(m => { if (m.isMesh){ m.material = m.material.clone(); if (m.material.emissive){ m.material.userData.e0 = m.material.emissive.clone(); m.material.userData.i0 = m.material.emissiveIntensity; playerMats.push(m.material); } } });
  if (keep){ player.root.position.copy(keep.p); player.root.rotation.copy(keep.r); }
  scene.add(player.root);
}

// The generated figure. Its parts come from a worker, so until the first one is ready the player is an invisible
// stub with the same joints: everything that poses or moves the player works from the first frame.
// Colour-only changes (and theme changes, for the Grønn Jobb green) recolour the generated figure in place; the
// legacy figure has to be rebuilt.
export function applyCharColours(){ if (!legacy && player && player.setColours) player.setColours(char); else buildPlayer(); }
export function refreshPlayerTheme(){ applyCharColours(); }
function stubRig(){
  const root = new THREE.Group(), f = { root, pony:null, ready:false };
  f.body = new THREE.Object3D(); root.add(f.body); f.head = new THREE.Object3D(); f.body.add(f.head);
  for (const s of ['L', 'R']){
    const sh = new THREE.Object3D(), el = new THREE.Object3D(), hip = new THREE.Object3D(), kn = new THREE.Object3D(), an = new THREE.Object3D();
    f.body.add(sh, hip); sh.add(el); hip.add(kn); kn.add(an);
    Object.assign(f, { ['sh' + s]:sh, ['el' + s]:el, ['hip' + s]:hip, ['kn' + s]:kn, ['an' + s]:an });
  }
  root.visible = false;
  return f;
}
// The creator shows when a new figure is on its way (busy) and whether one has ever been ready.
let onFigureState = null;
export function setFigureListener(fn){ onFigureState = fn; }
export const figureBusy = () => figReq !== figDone;
let figReq = 0, figDone = 0;
function buildFigure(){
  if (!player){ player = stubRig(); scene.add(player.root); }
  const o = Object.assign({}, char), id = ++figReq, tier = gfxTier;
  if (onFigureState) onFigureState();
  return Promise.all(PARTS.map(k => requestPart(k, o, tier, partKey(k, o)))).then(recs => {
    if (id !== figReq) return false; // a newer request superseded this one
    const parts = {}; PARTS.forEach((k, i) => { parts[k] = recs[i]; });
    const fig = assembleFigure(o, parts, { helmet:helmetOn, detail:tier !== 'low' });
    fig.tier = tier; fig.char = o;
    swapPlayer(fig); figDone = id;
    if (onFigureState) onFigureState();
    return true;
  }, err => {
    // the generated figure failed: fall back to the old one rather than show nothing
    console.error('figure generation failed; using the simple figure', err);
    legacy = true; figDone = figReq;
    if (player && !player.ready) { scene.remove(player.root); player = null; }
    buildLegacy();
    if (onFigureState) onFigureState();
    return true;
  });
}
// The quality tier can drop during a run; the figure follows at the next opportunity that isn't gameplay.
export function refreshTier(){ if (!legacy && player && player.tier && player.tier !== gfxTier) buildPlayer(); }
function swapPlayer(fig){
  const old = player;
  if (old){ fig.root.position.copy(old.root.position); fig.root.rotation.copy(old.root.rotation); scene.remove(old.root); disposeFigure(old); }
  if (fig.setHelmet) fig.setHelmet(helmetOn);
  player = fig; playerRainbow = false;
  playerMats = fig.mats.filter(m => m.emissive);
  for (const m of playerMats){ m.userData.e0 = m.emissive.clone(); m.userData.i0 = m.emissiveIntensity; }
  scene.add(fig.root);
}
function disposeFigure(f){
  if (!f.meshes){ disposeBaked(f.root); return; }
  for (const m of f.meshes) m.geometry.dispose();
  for (const m of f.mats) m.dispose();
  if (f.helmet) f.helmet.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  if (f.eyeGeos) for (const g of f.eyeGeos) g.dispose();
}
buildPlayer();
export const tagGeo = box(0.16, 0.13, 0.03), tags = [];
