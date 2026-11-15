// Materials for the generated figure. Each part is one draw call: the base colour is picked per pixel from the
// part's region distances (aRegion, aRegion2), antialiased with fwidth, so hems, the belt, knee pads, the lip border
// and eyebrows are crisp lines however coarse the triangles are. Colours are uniforms, so a creator change is instant.
//
// On top, a tileable detail texture is sampled triplanar in the bind pose (so it moves with the body, with no UVs):
// woven fabric on clothes, fine variation on skin, strands in hair, scuffs on boots. The vest lays its reflective
// tape out from the bind-pose position too, and projects the back print and chest logo onto itself.
import * as THREE from 'three';
import { detailTexture, backPrintTexture, logoTexture } from './textures.js';
import { VEST } from './gen/vest.js';

// Per part kind: the base colour, then layers painted where a region distance is negative (later layers on top).
// [attribute, channel, colour uniform, soft, strength uniform]: soft layers fade over 2 cm (a blush).
// detail: [channel, strength, scale (repeats per metre)].
const LAYOUT = {
  body:{ base:'uPants', layers:[['aRegion', 0, 'uShirt'], ['aRegion', 1, 'uBelt'], ['aRegion', 2, 'uPad'], ['aRegion', 3, 'uPocket']], detail:['r', 0.16, 70] },
  hands:{ base:'uSkin', layers:[['aRegion', 0, 'uGlove']], detail:['g', 0.07, 40] },
  head:{ base:'uSkin', layers:[['aRegion2', 2, 'uBlush', true], ['aRegion2', 0, 'uStubble', false, 'uStubbleK'], ['aRegion2', 1, 'uScalp', false, 'uScalpK'],
    ['aRegion', 0, 'uLip'], ['aRegion', 1, 'uMouth'], ['aRegion', 2, 'uHair']], detail:['g', 0.05, 45] },
  hair:{ base:'uHair', layers:[], detail:['b', 0.35, 30] },
  boot:{ base:'uBoot', layers:[['aRegion', 0, 'uSole']], detail:['a', 0.2, 18] },
  vest:{ base:'uVest', layers:[], detail:['r', 0.1, 90], vest:true }
};
const COLOR_UNIFORMS = ['uShirt', 'uPants', 'uBelt', 'uPad', 'uPocket', 'uSkin', 'uGlove', 'uBoot', 'uSole', 'uLip', 'uMouth', 'uHair', 'uBlush', 'uStubble', 'uScalp', 'uVest', 'uTape'];
// Strengths for layers that come and go with options (stubble, a buzz cut), the tape's glow and the strap offset.
const FLOAT_UNIFORMS = ['uStubbleK', 'uScalpK', 'uTapeGlow', 'uStrapX'];
const TEX_UNIFORMS = ['uDetail', 'uPrint', 'uLogo'];

// Shared uniforms: every part material reads the same objects, so one write recolours the whole figure.
export function makeFigureUniforms(){
  const u = {};
  for (const n of COLOR_UNIFORMS) u[n] = { value:new THREE.Color() };
  for (const n of FLOAT_UNIFORMS) u[n] = { value:0 };
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 0]), 1, 1); blank.needsUpdate = true;
  u.uDetail = { value:detailTexture() || blank };
  u.uPrint = { value:backPrintTexture('VERNEOMBUD') || blank };
  u.uLogo = { value:logoTexture() || blank };
  return u;
}

// opts.detail: false on the lowest quality tier, which skips the detail texture.
export function makePartMaterial(kind, uniforms, opts = {}){
  const L = LAYOUT[kind], attrs = [...new Set(L.layers.map(l => l[0]))], detail = opts.detail !== false && L.detail;
  const m = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:opts.roughness ?? 0.8, metalness:0, emissive:new THREE.Color(0), emissiveIntensity:1 });
  m.onBeforeCompile = sh => {
    for (const n of [...COLOR_UNIFORMS, ...FLOAT_UNIFORMS, ...TEX_UNIFORMS]) sh.uniforms[n] = uniforms[n];
    const vary = a => 'v' + a.slice(1);
    // the bind-pose position and normal: the attributes before skinning
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' + attrs.map(a => `attribute vec4 ${a};\nvarying vec4 ${vary(a)};`).join('\n'))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;\nvRestN = normal;\n' + attrs.map(a => `${vary(a)} = ${a};`).join('\n'));
    let pick = `vec3 baseCol = ${L.base};\n`;
    for (const [a, i, u, soft, k] of L.layers){
      const amt = k ? ' * ' + k : '';
      pick += soft
        ? `baseCol = mix(baseCol, ${u}, 0.7 * smoothstep(0.012, -0.015, ${vary(a)}[${i}])${amt});\n`
        : `{ float r = ${vary(a)}[${i}]; float w = max(fwidth(r), 1e-5); baseCol = mix(baseCol, ${u}, clamp(0.5 - r / w, 0.0, 1.0)${amt}); }\n`;
    }
    let emit = '';
    if (L.vest){
      // reflective tape: two bands round the body and braces over the shoulders, from the bind-pose position
      pick += `{
        vec3 p = vRest; float hw = ${(VEST.tape / 2).toFixed(4)};
        float hb = min(abs(p.y - ${VEST.bandLow.toFixed(4)}), abs(p.y - ${VEST.bandHigh.toFixed(4)}));
        float fb = max(fwidth(hb), 1e-5), band = clamp(0.5 - (hb - hw) / fb, 0.0, 1.0);
        float vs = abs(abs(p.x) - uStrapX), fs = max(fwidth(vs), 1e-5);
        float strap = clamp(0.5 - (vs - hw) / fs, 0.0, 1.0) * step(${(VEST.bandLow - VEST.tape / 2).toFixed(4)}, p.y);
        tape = max(band, strap);
        baseCol = mix(baseCol, uTape, tape);
        // the zip down the front
        float zf = max(fwidth(p.x), 1e-5); baseCol *= 1.0 - 0.6 * clamp(0.5 - (abs(p.x) - 0.0025) / zf, 0.0, 1.0) * step(p.z, 0.0);
        // VERNEOMBUD across the back between the bands, and the logo on the left of the chest
        vec2 tuv = vec2(p.x / 0.25 + 0.5, (p.y - ${((VEST.bandLow + VEST.bandHigh) / 2).toFixed(4)}) / 0.05 + 0.5);
        if (p.z > 0.0 && tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) baseCol = mix(baseCol, vec3(0.95), texture2D(uPrint, tuv).a);
        vec2 luv = vec2(-(p.x + 0.042) / 0.064 + 0.5, (p.y - ${(VEST.bandLow + 0.06).toFixed(4)}) / 0.024 + 0.5);
        if (p.z < 0.0 && luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) baseCol = mix(baseCol, vec3(0.95), texture2D(uLogo, luv).a);
      }\n`;
      emit = 'totalEmissiveRadiance += uTape * tape * uTapeGlow;\n';
    }
    if (detail){
      const [ch, k, sc] = detail;
      pick += `{
        vec3 bw = abs(normalize(vRestN)); bw /= bw.x + bw.y + bw.z + 1e-5;
        vec3 q = vRest * ${sc.toFixed(1)};
        float dt = texture2D(uDetail, q.yz).${ch} * bw.x + texture2D(uDetail, q.xz).${ch} * bw.y + texture2D(uDetail, q.xy).${ch} * bw.z;
        baseCol *= 1.0 + (dt - 0.5) * ${k.toFixed(3)};
      }\n`;
    }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' + attrs.map(a => `varying vec4 ${vary(a)};`).join('\n') + '\n'
        + COLOR_UNIFORMS.map(n => `uniform vec3 ${n};`).join('\n') + '\n' + FLOAT_UNIFORMS.map(n => `uniform float ${n};`).join('\n') + '\n'
        + TEX_UNIFORMS.map(n => `uniform sampler2D ${n};`).join('\n'))
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float tape = 0.0;\n' + pick + 'vec4 diffuseColor = vec4( diffuse * baseCol, opacity );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + emit);
  };
  m.customProgramCacheKey = () => 'figure-' + kind + (detail ? '-d' : '');
  return m;
}

// Colours derived from the character: lips, mouth and blush from the skin, brows from the hair, tape from the vest.
const _c = new THREE.Color();
export function setFigureColours(u, c, theme){
  u.uShirt.value.set(c.shirt === 'green' ? theme.green : c.shirt);
  u.uPants.value.set(c.pants); u.uPocket.value.set(c.pants).multiplyScalar(0.82);
  u.uBelt.value.set('#1C1A18'); u.uPad.value.set('#1A1714');
  u.uSkin.value.set(c.skin); u.uGlove.value.set('#C7B48A');
  u.uBoot.value.set('#4A3422'); u.uSole.value.set('#1A1714');
  u.uLip.value.set(c.skin).lerp(_c.set('#A2474A'), 0.32).multiplyScalar(0.86);
  u.uMouth.value.set(c.skin).multiplyScalar(0.3);
  u.uBlush.value.set(c.skin).lerp(_c.set('#D9666A'), 0.12);
  u.uHair.value.set(c.hair);
  // stubble on its own, and a light shadow around a real beard's edge; a buzz cut tints the scalp
  u.uStubble.value.set(c.skin).lerp(_c.set(c.hair), 0.55);
  u.uStubbleK.value = c.facial === 'stubble' ? 0.6 : c.facial === 'boxed' || c.facial === 'full' || c.facial === 'long' ? 0.3 : 0;
  u.uScalp.value.set(c.skin).lerp(_c.set(c.hair), 0.78);
  u.uScalpK.value = c.hairStyle === 'buzz' ? 0.85 : c.hairStyle === 'bald' ? 0 : 0.5;
  // the green vest has glowing yellow tape, like the old figure; other colours get silver
  const green = c.vest === 'green';
  u.uVest.value.set(green ? theme.green : c.vest);
  u.uTape.value.set(green ? theme.yellow : '#DADDE0');
  u.uTapeGlow.value = green ? 0.32 : 0.08;
}
