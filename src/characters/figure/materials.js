// Materials for the generated figure. Each part is one draw call: the base colour is picked per pixel from the
// part's region distances (aRegion), antialiased with fwidth, so hems, the belt and knee pads are crisp lines however
// coarse the triangles are. Colours are uniforms, so changing one in the creator is instant.
import * as THREE from 'three';

// Region layouts per part kind: for each of aRegion's four channels, the colour uniform used where it is negative.
// Later channels win. base is the colour where no channel is negative.
const LAYOUT = {
  body:{ base:'uPants', ch:['uShirt', 'uBelt', 'uPad', 'uPocket'] },
  hands:{ base:'uSkin', ch:['uGlove', null, null, null] },
  head:{ base:'uSkin', ch:[null, null, null, null] },
  boot:{ base:'uBoot', ch:['uSole', null, null, null] }
};
const COLOR_UNIFORMS = ['uShirt', 'uPants', 'uBelt', 'uPad', 'uPocket', 'uSkin', 'uGlove', 'uBoot', 'uSole'];

// Shared colour uniforms: every part material reads the same objects, so one write recolours the whole figure.
export function makeFigureUniforms(){
  const u = {};
  for (const n of COLOR_UNIFORMS) u[n] = { value:new THREE.Color() };
  return u;
}

export function makePartMaterial(kind, uniforms, opts = {}){
  const L = LAYOUT[kind];
  const m = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:opts.roughness ?? 0.8, metalness:0, emissive:new THREE.Color(0), emissiveIntensity:1 });
  m.onBeforeCompile = sh => {
    for (const n of COLOR_UNIFORMS) sh.uniforms[n] = uniforms[n];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRegion;\nvarying vec4 vRegion;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegion = aRegion;');
    let pick = `vec3 baseCol = ${L.base};\n`;
    L.ch.forEach((u, i) => { if (u) pick += `{ float r = vRegion[${i}]; float w = max(fwidth(r), 1e-5); baseCol = mix(baseCol, ${u}, clamp(0.5 - r / w, 0.0, 1.0)); }\n`; });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vRegion;\n' + COLOR_UNIFORMS.map(n => `uniform vec3 ${n};`).join('\n'))
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', pick + 'vec4 diffuseColor = vec4( diffuse * baseCol, opacity );');
  };
  m.customProgramCacheKey = () => 'figure-' + kind;
  return m;
}
