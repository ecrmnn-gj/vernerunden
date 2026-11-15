// Particles (one draw call per kind, sized in world units) and speed lines.
import * as THREE from 'three';
import { reduceMotion, rand } from '../core/utils.js';
import { g } from '../game/state.js';
import { canvasTex } from '../textures/canvas.js';
import { Q } from '../core/quality.js';
import { scene, camera } from './renderer.js';
import { _m4, _q, _s3, _v3 } from '../core/scratch.js';
import { rng } from '../textures/procedural.js';

class Particles {
  constructor(max, tex, additive){
    this.max = max; this.n = 0;
    const f = k => new Float32Array(max * k);
    this.pos = f(3); this.col = f(3); this.alpha = f(1); this.size = f(1); this.rot = f(1);
    this.vel = f(3); this.age = f(1); this.life = f(1); this.a0 = f(1); this.s0 = f(1); this.grow = f(1); this.grav = f(1); this.drag = f(1); this.spin = f(1); this.scroll = f(1);
    const geo = new THREE.BufferGeometry();
    for (const [name, arr, k] of [['position', this.pos, 3], ['aColor', this.col, 3], ['aAlpha', this.alpha, 1], ['aSize', this.size, 1], ['aRot', this.rot, 1]]){ const at = new THREE.BufferAttribute(arr, k); at.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, at); }
    this.mat = new THREE.ShaderMaterial({
      uniforms:{ map:{ value:tex }, uScale:{ value:400 } }, transparent:true, depthWrite:false, fog:false,
      blending:additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader:`attribute vec3 aColor; attribute float aAlpha, aSize, aRot; uniform float uScale; varying vec3 vColor; varying float vAlpha, vRot;
        void main(){ vColor = aColor; vAlpha = aAlpha; vRot = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader:`uniform sampler2D map; varying vec3 vColor; varying float vAlpha, vRot;
        void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); vec4 t = texture2D(map, vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5);
          gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha); ${additive ? 'gl_FragColor.rgb *= gl_FragColor.a;' : ''}
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    geo.setDrawRange(0, 0);
  }
  emit(x, y, z, vx, vy, vz, o){
    const i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    const c = o.color; this.col.set([c.r, c.g, c.b], i * 3);
    this.age[i] = 0; this.life[i] = o.life || 1; this.a0[i] = o.alpha == null ? 1 : o.alpha; this.s0[i] = o.size || 0.3; this.grow[i] = o.grow || 0;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag || 0; this.rot[i] = Math.random() * 6.28; this.spin[i] = o.spin || 0; this.scroll[i] = o.scroll == null ? 1 : o.scroll;
    this.alpha[i] = 0; this.size[i] = this.s0[i];
  }
  update(dt, dz){
    let i = 0;
    while (i < this.n){
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]){ this.kill(i); continue; }
      const k = i * 3, t = this.age[i] / this.life[i], dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[k + 1] -= this.grav[i] * dt; this.vel[k] *= dr; this.vel[k + 1] *= dr; this.vel[k + 2] *= dr;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt + dz * this.scroll[i];
      if (this.pos[k + 1] < 0.02 && this.grav[i] > 0){ this.pos[k + 1] = 0.02; this.vel[k + 1] *= -0.3; this.vel[k] *= 0.6; this.vel[k + 2] *= 0.6; }
      this.alpha[i] = this.a0[i] * Math.min(1, t * 8) * (1 - t) * (1 - t * 0.3);
      this.size[i] = this.s0[i] + this.grow[i] * this.age[i]; this.rot[i] += this.spin[i] * dt;
      i++;
    }
    const geo = this.points.geometry; geo.setDrawRange(0, this.n);
    for (const a of ['position', 'aColor', 'aAlpha', 'aSize', 'aRot']) geo.attributes[a].needsUpdate = true;
  }
  kill(i){
    const j = --this.n; if (i === j) return;
    for (const [arr, k] of [[this.pos, 3], [this.vel, 3], [this.col, 3]]) for (let q = 0; q < k; q++) arr[i * k + q] = arr[j * k + q];
    for (const arr of [this.alpha, this.size, this.rot, this.age, this.life, this.a0, this.s0, this.grow, this.grav, this.drag, this.spin, this.scroll]) arr[i] = arr[j];
  }
  clear(){ this.n = 0; this.points.geometry.setDrawRange(0, 0); }
}
const puffTex = canvasTex(128, 128, (c) => {
  const r = rng(5);
  for (let i = 0; i < 14; i++){ const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, s = r() * 22 + 18, gr = c.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }
});
const sparkTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
export const FX = { dust:new Particles(500, puffTex, false), spark:new Particles(500, sparkTex, true) };
export const fxCol = (hex, k) => new THREE.Color(hex).multiplyScalar(k || 1);
export const COL = { dust:fxCol('#C9BCA6'), dustDark:fxCol('#8F8474'), spark:fxCol('#FFB347', 6), white:fxCol('#FFFFFF', 3) };
export const fxN = n => Math.max(1, Math.round(n * Q().fx));
export function puff(x, y, z, n, spread, size, alpha, up){
  for (let i = 0; i < fxN(n); i++) FX.dust.emit(x + rand(-spread, spread), y + rand(0, 0.1), z + rand(-spread, spread), rand(-0.8, 0.8), rand(0.2, up || 0.9), rand(-0.3, 1.2), { color:Math.random() < 0.3 ? COL.dustDark : COL.dust, life:rand(0.5, 0.9), alpha:alpha || 0.35, size:size || 0.4, grow:1.4, drag:2.2, spin:rand(-1, 1) });
}
export function sparkle(x, y, z, n, color, speed){
  for (let i = 0; i < fxN(n); i++){ const a = rand(0, 6.28), e = rand(-0.6, 1.2), v = rand(0.5, 1) * (speed || 4); FX.spark.emit(x, y, z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 1, Math.sin(a) * Math.cos(e) * v, { color, life:rand(0.35, 0.7), size:rand(0.06, 0.14), drag:2.5, grav:3, scroll:0.6 }); }
}
// speed lines while the super speed is on
const speedLines = (() => {
  const n = 70, m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.018, 1), new THREE.MeshBasicMaterial({ color:new THREE.Color('#FFFFFF').multiplyScalar(2.2), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }), n);
  m.frustumCulled = false; m.renderOrder = 6; scene.add(m);
  const L = Array.from({ length:n }, () => ({ a:rand(0, 6.28), r:rand(1.6, 6), z:rand(-50, 8), len:rand(3, 8) }));
  return { m, L };
})();
export function updateSpeedLines(dt, k){
  const { m, L } = speedLines; if (reduceMotion) k = 0; m.visible = k > 0.01; m.material.opacity = k * 0.55; if (!m.visible) return;
  for (let i = 0; i < L.length; i++){
    const l = L[i]; l.z += g.speed * 2.2 * dt; if (l.z > 8){ l.z = rand(-60, -30); l.a = rand(0, 6.28); l.r = rand(1.6, 6); }
    _v3.set(camera.position.x + Math.cos(l.a) * l.r, Math.max(0.15, 1.5 + Math.sin(l.a) * l.r * 0.6), l.z); _s3.set(1, 1, l.len);
    m.setMatrixAt(i, _m4.compose(_v3, _q.identity(), _s3));
  }
  _s3.set(1, 1, 1); m.instanceMatrix.needsUpdate = true;
}
