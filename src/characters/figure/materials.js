// Materials for the generated figure. Each part is one draw call: the base colour is picked per pixel from the
// part's region distances (aRegion, aRegion2), antialiased with fwidth, so hems, the belt, knee pads, the lip border
// and eyebrows are crisp lines however coarse the triangles are. Colours are uniforms, so a creator change is instant.
import * as THREE from 'three';

// Per part kind: the base colour, then layers painted where a region distance is negative (later layers on top).
// [attribute, channel, colour uniform, soft]: soft layers fade over 2 cm (a blush), hard ones are a crisp edge.
const LAYOUT = {
  body:{ base:'uPants', layers:[['aRegion', 0, 'uShirt'], ['aRegion', 1, 'uBelt'], ['aRegion', 2, 'uPad'], ['aRegion', 3, 'uPocket']] },
  hands:{ base:'uSkin', layers:[['aRegion', 0, 'uGlove']] },
  head:{ base:'uSkin', layers:[['aRegion2', 2, 'uBlush', true], ['aRegion2', 0, 'uStubble', false, 'uStubbleK'], ['aRegion2', 1, 'uScalp', false, 'uScalpK'],
    ['aRegion', 0, 'uLip'], ['aRegion', 1, 'uMouth'], ['aRegion', 2, 'uHair']] },
  hair:{ base:'uHair', layers:[] },
  boot:{ base:'uBoot', layers:[['aRegion', 0, 'uSole']] }
};
const COLOR_UNIFORMS = ['uShirt', 'uPants', 'uBelt', 'uPad', 'uPocket', 'uSkin', 'uGlove', 'uBoot', 'uSole', 'uLip', 'uMouth', 'uHair', 'uBlush', 'uStubble', 'uScalp'];
// Strengths for layers that come and go with options: stubble, and a buzz cut on the scalp.
const FLOAT_UNIFORMS = ['uStubbleK', 'uScalpK'];

// Shared colour uniforms: every part material reads the same objects, so one write recolours the whole figure.
export function makeFigureUniforms(){
  const u = {};
  for (const n of COLOR_UNIFORMS) u[n] = { value:new THREE.Color() };
  for (const n of FLOAT_UNIFORMS) u[n] = { value:0 };
  return u;
}

export function makePartMaterial(kind, uniforms, opts = {}){
  const L = LAYOUT[kind], attrs = [...new Set(L.layers.map(l => l[0]))];
  const m = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:opts.roughness ?? 0.8, metalness:0, emissive:new THREE.Color(0), emissiveIntensity:1 });
  m.onBeforeCompile = sh => {
    for (const n of [...COLOR_UNIFORMS, ...FLOAT_UNIFORMS]) sh.uniforms[n] = uniforms[n];
    const vary = a => 'v' + a.slice(1);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + attrs.map(a => `attribute vec4 ${a};\nvarying vec4 ${vary(a)};`).join('\n'))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + attrs.map(a => `${vary(a)} = ${a};`).join('\n'));
    let pick = `vec3 baseCol = ${L.base};\n`;
    for (const [a, i, u, soft, k] of L.layers){
      const amt = k ? ' * ' + k : '';
      pick += soft
        ? `baseCol = mix(baseCol, ${u}, 0.7 * smoothstep(0.012, -0.015, ${vary(a)}[${i}])${amt});\n`
        : `{ float r = ${vary(a)}[${i}]; float w = max(fwidth(r), 1e-5); baseCol = mix(baseCol, ${u}, clamp(0.5 - r / w, 0.0, 1.0)${amt}); }\n`;
    }
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + attrs.map(a => `varying vec4 ${vary(a)};`).join('\n') + '\n' + COLOR_UNIFORMS.map(n => `uniform vec3 ${n};`).join('\n') + '\n' + FLOAT_UNIFORMS.map(n => `uniform float ${n};`).join('\n'))
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', pick + 'vec4 diffuseColor = vec4( diffuse * baseCol, opacity );');
  };
  m.customProgramCacheKey = () => 'figure-' + kind;
  return m;
}

// Colours derived from the character: lips, mouth and blush from the skin, brows from the hair.
const _c = new THREE.Color();
export function setFigureColours(u, c, green){
  u.uShirt.value.set(c.shirt === 'green' ? green : c.shirt);
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
}
