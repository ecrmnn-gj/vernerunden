// The player's character: made in the creator and saved on this device.
import * as THREE from 'three';
import { pick, store } from '../core/utils.js';
import { scene } from '../render/renderer.js';
import { M, mat } from '../render/materials.js';
import { box, disposeBaked } from '../world/geometry.js';
import { pickWeighted } from '../world/buildings.js';
import { smat, makeHuman } from './human.js';

export const CHAR_OPTS = {
  gender:{ label:'Kjønn', type:'chip', opts:[['male', 'Mann'], ['female', 'Kvinne']] },
  skin:{ label:'Hudfarge', type:'swatch', opts:[['#F0CDB2', 'Veldig lys'], ['#E8BE9C', 'Lys'], ['#D9AC88', 'Lys middels'], ['#C99A76', 'Middels'], ['#B9825C', 'Gyllen'], ['#A8714C', 'Brun'], ['#7A4E33', 'Mørk'], ['#55351F', 'Veldig mørk']] },
  hairStyle:{ label:'Hår', type:'chip', opts:[['short', 'Kort'], ['long', 'Langt'], ['ponytail', 'Hestehale'], ['bun', 'Knute'], ['curly', 'Krøller'], ['bald', 'Skallet']] },
  hair:{ label:'Hårfarge', type:'swatch', opts:[['#141414', 'Svart'], ['#3A2A1C', 'Mørkebrun'], ['#6B4423', 'Brun'], ['#9C7A4A', 'Mørk blond'], ['#D8B56A', 'Blond'], ['#A0482A', 'Rød'], ['#9A9A96', 'Grå'], ['#E4E2DC', 'Hvit'], ['#D65A9A', 'Rosa'], ['#3E6FD8', 'Blå']] },
  facial:{ label:'Skjegg', type:'chip', opts:[['none', 'Ingen'], ['stubble', 'Skjeggstubb'], ['mustache', 'Bart'], ['goatee', 'Fippskjegg'], ['full', 'Helskjegg']] },
  helmet:{ label:'Hjelm', type:'swatch', opts:[['#F2F2EE', 'Hvit'], ['#E2AB22', 'Gul'], ['#E8701E', 'Oransje'], ['#C8281C', 'Rød'], ['#2F6FB5', 'Blå'], ['#2E8B57', 'Grønn'], ['#2A2D31', 'Svart']] },
  vest:{ label:'Vest', type:'swatch', opts:[['green', 'Grønn'], ['#D4E020', 'Gul'], ['#F07A12', 'Oransje'], ['#D93B2B', 'Rød'], ['#2F6FB5', 'Blå'], ['#E35A9C', 'Rosa']] }
};
export const CHAR_DEFAULT = { gender:'male', skin:'#C99A76', hairStyle:'short', hair:'#3A2A1C', facial:'none', helmet:'#E2AB22', vest:'green' };
// A stored character is only used if every field is still one of the options.
function validChar(c){
  if (!c || typeof c !== 'object') return null;
  const out = {};
  for (const k in CHAR_OPTS){ if (!CHAR_OPTS[k].opts.some(([v]) => v === c[k])) return null; out[k] = c[k]; }
  return out;
}
export let charSaved = validChar(store.get('vr3d:char', null));
export let char = Object.assign({}, charSaved || CHAR_DEFAULT);
export function setChar(c){ char = c; }
export function saveChar(){ charSaved = Object.assign({}, char); store.set('vr3d:char', charSaved); }
export const sameChar = (a, b) => Object.keys(CHAR_OPTS).every(k => a[k] === b[k]);
export function randomChar(){
  const female = Math.random() < 0.5, opt = k => pick(CHAR_OPTS[k].opts)[0];
  return {
    gender:female ? 'female' : 'male', skin:opt('skin'),
    hairStyle:pickWeighted(female ? [['long', 3], ['ponytail', 3], ['bun', 2], ['curly', 1.5], ['short', 1.2], ['bald', 0.2]] : [['short', 4], ['bald', 1.4], ['curly', 1.4], ['long', 0.8], ['ponytail', 0.5], ['bun', 0.5]]),
    hair:pickWeighted([['#141414', 3], ['#3A2A1C', 3], ['#6B4423', 3], ['#9C7A4A', 2], ['#D8B56A', 2], ['#A0482A', 1.2], ['#9A9A96', 1], ['#E4E2DC', 0.4], ['#D65A9A', 0.4], ['#3E6FD8', 0.4]]),
    facial:female ? 'none' : pickWeighted([['none', 3], ['stubble', 2], ['mustache', 1], ['goatee', 1], ['full', 1.6]]),
    helmet:opt('helmet'), vest:pickWeighted([['green', 3], ['#D4E020', 1], ['#F07A12', 1], ['#D93B2B', 1], ['#2F6FB5', 1], ['#E35A9C', 1]])
  };
}
const stripeSilver = mat('#DADDE0', { roughness:0.3, metalness:0.5, emissive:new THREE.Color('#FFFFFF'), emissiveIntensity:0.06 });
const vestMats = {};
// Hi-vis fabric glows a little, like fluorescent cloth does in daylight.
const vestMat = hex => vestMats[hex] || (vestMats[hex] = mat(hex, { roughness:0.65, emissive:new THREE.Color(hex), emissiveIntensity:0.12 }));
function charToHuman(c){
  const green = c.vest === 'green';
  return { female:c.gender === 'female', skin:c.skin, hair:c.hair, hairStyle:c.hairStyle, facial:c.facial, shirt:smat('#3B4148', 0.85), pants:smat('#2E3747', 0.9),
    vest:green ? M.green : vestMat(c.vest), stripe:green ? M.yellowGlow : stripeSilver, helmet:smat(c.helmet, 0.32, 0.05), gloves:smat('#C7B48A', 0.8), kneepads:true, backText:'VERNEOMBUD' };
}
export let player = null, playerMats = [], playerRainbow = false;
export function setPlayerRainbow(on){ playerRainbow = on; }
// (Re)build the player from `char`, keeping where it stands. Each mesh gets its own material so super speed can tint them.
export function buildPlayer(){
  const keep = player && { p:player.root.position.clone(), r:player.root.rotation.clone() };
  if (player){ scene.remove(player.root); disposeBaked(player.root); player.root.traverse(m => { if (m.isMesh) m.material.dispose(); }); }
  player = makeHuman(charToHuman(char)); playerMats = []; playerRainbow = false;
  player.root.traverse(m => { if (m.isMesh){ m.material = m.material.clone(); if (m.material.emissive){ m.material.userData.e0 = m.material.emissive.clone(); m.material.userData.i0 = m.material.emissiveIntensity; playerMats.push(m.material); } } });
  if (keep){ player.root.position.copy(keep.p); player.root.rotation.copy(keep.r); }
  scene.add(player.root);
}
buildPlayer();
export const tagGeo = box(0.16, 0.13, 0.03), tags = [];
