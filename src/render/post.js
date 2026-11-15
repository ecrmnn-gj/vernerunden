// Post-processing: HDR target, bloom, lens effects and colour grade.
import * as THREE from 'three';
import { reduceMotion } from '../core/utils.js';
import { Q } from '../core/quality.js';
import { renderer, scene, camera } from './renderer.js';

const FSQ = new THREE.Mesh(new THREE.BufferGeometry(), null); FSQ.frustumCulled = false;
FSQ.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
FSQ.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
const FSQ_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
function fsMat(fragmentShader, uniforms, extra){ return new THREE.ShaderMaterial(Object.assign({ uniforms, vertexShader:FS_VERT, fragmentShader, depthTest:false, depthWrite:false, toneMapped:false }, extra || {})); }
function fsDraw(material, target){ FSQ.material = material; renderer.setRenderTarget(target); renderer.render(FSQ, FSQ_CAM); }
export const post = {
  on:false, rt:null, mips:[], w:1, h:1, hdr:THREE.HalfFloatType,
  bloom:0.55, aberr:0, zoom:0, vignette:0.32,
  pre:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
    vec3 tap(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
    float w(vec3 c){ return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
    void main(){
      vec3 a = tap(vec2(-1.0, -1.0)), b = tap(vec2(1.0, -1.0)), c = tap(vec2(-1.0, 1.0)), d = tap(vec2(1.0, 1.0));
      float wa = w(a), wb = w(b), wc = w(c), wd = w(d);
      vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
      float br = max(col.r, max(col.g, col.b)), knee = uThreshold * 0.5;
      float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-4);
      col *= max(soft, br - uThreshold) / max(br, 1e-4);
      gl_FragColor = vec4(min(col, vec3(60.0)), 1.0);
    }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() }, uThreshold:{ value:1.05 } }),
  down:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0); }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() } }),
  up:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uWeight; varying vec2 vUv;
    void main(){ vec2 t = uTexel;
      vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += (texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb) * 2.0;
      c += texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + t).rgb + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb + texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb;
      gl_FragColor = vec4(c / 16.0 * uWeight, 1.0); }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() }, uWeight:{ value:1 } }, { blending:THREE.AdditiveBlending, transparent:true }),
  comp:fsMat(`uniform sampler2D tScene, tBloom; uniform float uBloom, uAberr, uZoom, uVignette, uTime, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 scene3(vec2 uv, vec2 dir){
      if (uAberr < 0.0005) return texture2D(tScene, uv).rgb;
      return vec3(texture2D(tScene, uv + dir * uAberr).r, texture2D(tScene, uv).g, texture2D(tScene, uv - dir * uAberr).b);
    }
    void main(){
      vec2 d = vUv - 0.5; float r = length(d * vec2(uAspect, 1.0));
      vec2 dir = d * r;
      vec3 col;
      if (uZoom > 0.001){
        col = vec3(0.0); float jit = hash(gl_FragCoord.xy + uTime);
        for (int i = 0; i < 8; i++){ float s = 1.0 - uZoom * (float(i) + jit) / 8.0 * smoothstep(0.08, 0.6, r); col += scene3(0.5 + d * s, dir); }
        col /= 8.0;
      } else col = scene3(vUv, dir);
      col += texture2D(tBloom, vUv).rgb * uBloom;
      col *= 1.0 - uVignette * smoothstep(0.35, 1.05, r);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      // a gentle lift in contrast and saturation after tone mapping
      vec3 c = gl_FragColor.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.1); c = max(c, 0.0);
      gl_FragColor.rgb = c;
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(gl_FragCoord.xy * 0.73 + fract(uTime)) - 0.5) / 255.0;
    }`, { tScene:{ value:null }, tBloom:{ value:null }, uBloom:{ value:0.5 }, uAberr:{ value:0 }, uZoom:{ value:0 }, uVignette:{ value:0.3 }, uTime:{ value:0 }, uAspect:{ value:1 }, toneMappingExposure:{ value:1 } }, { toneMapped:true }),
  setup(){
    for (const t of [this.rt, ...this.mips]) if (t) t.dispose();
    this.rt = null; this.mips = [];
    this.on = Q().post && !!(renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    if (!this.on) return;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type:this.hdr, samples:Q().msaa, depthBuffer:true });
    for (let i = 0; i < 6; i++){ const m = new THREE.WebGLRenderTarget(1, 1, { type:this.hdr, depthBuffer:false }); m.texture.minFilter = m.texture.magFilter = THREE.LinearFilter; this.mips.push(m); }
    this.resize();
  },
  resize(){
    if (!this.on) return;
    const v = renderer.getDrawingBufferSize(new THREE.Vector2()); this.w = v.x; this.h = v.y;
    this.rt.setSize(v.x, v.y);
    let w = Math.max(1, v.x >> 1), h = Math.max(1, v.y >> 1);
    for (const m of this.mips){ m.setSize(w, h); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
  },
  render(time){
    if (!this.on){ renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(this.rt); renderer.render(scene, camera);
    // bloom: bright-pass at half resolution, then a downsample chain and a tent-filtered upsample back
    const u = this.pre.uniforms; u.tSrc.value = this.rt.texture; u.uTexel.value.set(1 / this.w, 1 / this.h); fsDraw(this.pre, this.mips[0]);
    for (let i = 1; i < this.mips.length; i++){ const s = this.mips[i - 1]; this.down.uniforms.tSrc.value = s.texture; this.down.uniforms.uTexel.value.set(1 / s.width, 1 / s.height); fsDraw(this.down, this.mips[i]); }
    for (let i = this.mips.length - 1; i > 0; i--){ const s = this.mips[i]; this.up.uniforms.tSrc.value = s.texture; this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height); this.up.uniforms.uWeight.value = 0.85; fsDraw(this.up, this.mips[i - 1]); }
    const c = this.comp.uniforms;
    c.tScene.value = this.rt.texture; c.tBloom.value = this.mips[0].texture; c.uBloom.value = this.bloom / this.mips.length * 1.6;
    c.uAberr.value = reduceMotion ? 0 : this.aberr; c.uZoom.value = reduceMotion ? 0 : this.zoom; c.uVignette.value = this.vignette;
    c.uTime.value = time % 100; c.uAspect.value = this.w / Math.max(1, this.h); c.toneMappingExposure.value = renderer.toneMappingExposure;
    fsDraw(this.comp, null);
  }
};
