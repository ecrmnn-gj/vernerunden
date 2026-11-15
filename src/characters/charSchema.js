// The character the player makes in the creator: its options, defaults, migration of old saves and random figures.
// Pure data and functions (no three.js, no DOM), so the figure generator and the tests can use it too.

// Creator tabs, in display order. 'head' tabs frame the face and take the helmet off.
export const CHAR_TABS = [['body', 'Kropp'], ['face', 'Ansikt'], ['hair', 'Hår'], ['clothes', 'Klær']];
export const HEAD_TABS = new Set(['face', 'hair']);

// type: chip or swatch. shape: changing it changes the figure's geometry, not just a colour.
// Swatch values are colours, except 'green', which is the theme's Grønn Jobb green.
export const CHAR_OPTS = {
  gender:{ tab:'body', label:'Kjønn', type:'chip', shape:true, opts:[['male', 'Mann'], ['female', 'Kvinne']] },
  build:{ tab:'body', label:'Kroppsbygning', type:'chip', shape:true, opts:[['slim', 'Slank'], ['average', 'Middels'], ['sturdy', 'Kraftig']] },
  skin:{ tab:'body', label:'Hudfarge', type:'swatch', opts:[['#F0CDB2', 'Veldig lys'], ['#E8BE9C', 'Lys'], ['#D9AC88', 'Lys middels'], ['#C99A76', 'Middels'], ['#B9825C', 'Gyllen'], ['#A8714C', 'Brun'], ['#7A4E33', 'Mørk'], ['#55351F', 'Veldig mørk']] },
  face:{ tab:'face', label:'Ansiktsform', type:'chip', shape:true, opts:[['oval', 'Oval'], ['round', 'Rund'], ['square', 'Kantet'], ['long', 'Lang']] },
  eyes:{ tab:'face', label:'Øyenfarge', type:'swatch', opts:[['#5A3A22', 'Brun'], ['#2E1E14', 'Mørkebrun'], ['#8A6A3A', 'Nøttebrun'], ['#4E7A4A', 'Grønn'], ['#4A78B0', 'Blå'], ['#7E8A92', 'Grå']] },
  facial:{ tab:'face', label:'Skjegg', type:'chip', shape:true, opts:[['none', 'Ingen'], ['stubble', 'Skjeggstubb'], ['mustache', 'Bart'], ['goatee', 'Fippskjegg'], ['mustacheGoatee', 'Bart og fippskjegg'], ['boxed', 'Kort skjegg'], ['full', 'Helskjegg'], ['long', 'Langt skjegg']] },
  hairStyle:{ tab:'hair', label:'Hår', type:'chip', shape:true, opts:[['short', 'Kort'], ['buzz', 'Snauklipp'], ['long', 'Langt'], ['ponytail', 'Hestehale'], ['bun', 'Knute'], ['braids', 'Fletter'], ['curly', 'Krøller'], ['afro', 'Afro'], ['bald', 'Skallet']] },
  hair:{ tab:'hair', label:'Hårfarge', type:'swatch', opts:[['#141414', 'Svart'], ['#3A2A1C', 'Mørkebrun'], ['#6B4423', 'Brun'], ['#9C7A4A', 'Mørk blond'], ['#D8B56A', 'Blond'], ['#A0482A', 'Rød'], ['#9A9A96', 'Grå'], ['#E4E2DC', 'Hvit'], ['#D65A9A', 'Rosa'], ['#3E6FD8', 'Blå']] },
  shirt:{ tab:'clothes', label:'Skjorte', type:'swatch', opts:[['#3B4148', 'Koksgrå'], ['#26324A', 'Marineblå'], ['#1C1D20', 'Svart'], ['#7C8188', 'Gråmelert'], ['green', 'Grønn Jobb-grønn'], ['#E9E9E4', 'Hvit']] },
  sleeves:{ tab:'clothes', label:'Ermer', type:'chip', shape:true, opts:[['long', 'Lange ermer'], ['short', 'T-skjorte']] },
  pants:{ tab:'clothes', label:'Bukse', type:'swatch', opts:[['#2E3747', 'Marineblå'], ['#3A3D42', 'Koksgrå'], ['#1A1B1E', 'Svart'], ['#8C7B57', 'Kaki'], ['#F07A12', 'Varselsoransje']] },
  gloves:{ tab:'clothes', label:'Hansker', type:'chip', shape:true, opts:[['on', 'På'], ['off', 'Av']] },
  vest:{ tab:'clothes', label:'Vest', type:'swatch', opts:[['green', 'Grønn'], ['#D4E020', 'Gul'], ['#F07A12', 'Oransje'], ['#D93B2B', 'Rød'], ['#2F6FB5', 'Blå'], ['#E35A9C', 'Rosa']] },
  helmet:{ tab:'clothes', label:'Hjelm', type:'swatch', opts:[['#F2F2EE', 'Hvit'], ['#E2AB22', 'Gul'], ['#E8701E', 'Oransje'], ['#C8281C', 'Rød'], ['#2F6FB5', 'Blå'], ['#2E8B57', 'Grønn'], ['#2A2D31', 'Svart']] }
};
export const CHAR_KEYS = Object.keys(CHAR_OPTS);
// The defaults reproduce the figure from before the redesign, so a migrated save looks the same as it did.
export const CHAR_DEFAULT = Object.freeze({
  gender:'male', build:'average', skin:'#C99A76', face:'oval', eyes:'#5A3A22', facial:'none', hairStyle:'short', hair:'#3A2A1C',
  shirt:'#3B4148', sleeves:'long', pants:'#2E3747', gloves:'on', vest:'green', helmet:'#E2AB22'
});
export const CHAR_VERSION = 2;

export const validValue = (k, v) => !!CHAR_OPTS[k] && CHAR_OPTS[k].opts.some(([o]) => o === v);
export const sameChar = (a, b) => CHAR_KEYS.every(k => a[k] === b[k]);
export const isShapeKey = k => !!(CHAR_OPTS[k] && CHAR_OPTS[k].shape);

// A stored figure from any version: keep every field that is still an option, fill the rest with defaults.
// Only something that is not an object at all is rejected.
export function migrateChar(raw){
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = { v:CHAR_VERSION };
  for (const k of CHAR_KEYS) out[k] = validValue(k, raw[k]) ? raw[k] : CHAR_DEFAULT[k];
  if (out.gender === 'female' && !validValue('facial', raw.facial)) out.facial = 'none';
  return out;
}

// Which generated parts each shape option affects. A part is rebuilt only when its key changes.
export function shapeKeys(c){
  return {
    body:`${c.gender}|${c.build}|${c.sleeves}|${c.gloves}`,
    head:`${c.gender}|${c.face}`,
    hair:`${c.gender}|${c.face}|${c.hairStyle}`,
    beard:`${c.gender}|${c.face}|${c.facial}`,
    vest:`${c.gender}|${c.build}`
  };
}

export function pickWeighted(list, rand = Math.random){
  let t = 0; for (const [, w] of list) t += w;
  let r = rand() * t;
  for (const [k, w] of list){ r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}
const DARK_SKINS = new Set(['#A8714C', '#7A4E33', '#55351F']);
// A plausible random figure. rand can be seeded for tests.
export function randomChar(rand = Math.random){
  const pick = k => { const o = CHAR_OPTS[k].opts; return o[Math.min(o.length - 1, Math.floor(rand() * o.length))][0]; };
  const female = rand() < 0.5, skin = pick('skin'), dark = DARK_SKINS.has(skin);
  const eyes = dark ? [['#5A3A22', 6], ['#2E1E14', 6], ['#8A6A3A', 0.4], ['#4E7A4A', 0.4], ['#4A78B0', 0.4], ['#7E8A92', 0.4]]
    : [['#5A3A22', 3], ['#2E1E14', 2], ['#8A6A3A', 1.5], ['#4A78B0', 1.5], ['#4E7A4A', 1], ['#7E8A92', 0.6]];
  const hairStyle = female
    ? [['long', 3], ['ponytail', 3], ['bun', 2], ['braids', 1.5], ['curly', 1.5], ['afro', dark ? 2 : 0.8], ['short', 1.2], ['buzz', 0.4], ['bald', 0.2]]
    : [['short', 4], ['buzz', 2], ['bald', 1.4], ['curly', 1.4], ['afro', dark ? 1.6 : 0.6], ['long', 0.8], ['ponytail', 0.5], ['bun', 0.5], ['braids', 0.4]];
  return {
    v:CHAR_VERSION, gender:female ? 'female' : 'male', build:pickWeighted([['slim', 1], ['average', 2], ['sturdy', 1]], rand), skin,
    face:pick('face'), eyes:pickWeighted(eyes, rand),
    facial:female ? 'none' : pickWeighted([['none', 3], ['stubble', 2], ['mustache', 1], ['goatee', 1], ['mustacheGoatee', 0.8], ['boxed', 1.6], ['full', 1.6], ['long', 0.5]], rand),
    hairStyle:pickWeighted(hairStyle, rand),
    hair:pickWeighted([['#141414', 3], ['#3A2A1C', 3], ['#6B4423', 3], ['#9C7A4A', 2], ['#D8B56A', 2], ['#A0482A', 1.2], ['#9A9A96', 1], ['#E4E2DC', 0.4], ['#D65A9A', 0.4], ['#3E6FD8', 0.4]], rand),
    shirt:pickWeighted([['#3B4148', 3], ['#26324A', 2], ['#1C1D20', 1.5], ['#7C8188', 1.5], ['green', 1], ['#E9E9E4', 0.6]], rand),
    sleeves:pickWeighted([['long', 1.6], ['short', 1]], rand),
    pants:pickWeighted([['#2E3747', 3], ['#3A3D42', 2], ['#1A1B1E', 1.5], ['#8C7B57', 1], ['#F07A12', 0.5]], rand),
    gloves:pickWeighted([['on', 2], ['off', 1]], rand),
    vest:pickWeighted([['green', 3], ['#D4E020', 1], ['#F07A12', 1], ['#D93B2B', 1], ['#2F6FB5', 1], ['#E35A9C', 1]], rand),
    helmet:pick('helmet')
  };
}
