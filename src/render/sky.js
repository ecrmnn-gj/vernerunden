// Sky: gradient, sun and drifting clouds in one shader. It also lights the scene through an environment map.
import * as THREE from 'three';
import { P } from '../core/palette.js';
import { renderer, scene, SUN_DIR } from './renderer.js';

const NOISE_GLSL = `
float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 17.17; a *= 0.5; } return v; }`;
export const skyU = {
  uZenith:{ value:new THREE.Color() }, uMid:{ value:new THREE.Color() }, uHorizon:{ value:new THREE.Color() }, uGround:{ value:new THREE.Color() },
  uSunColor:{ value:new THREE.Color() }, uSunDir:{ value:SUN_DIR }, uView:{ value:new THREE.Vector3(0, 0.12, -1).normalize() },
  uCloud:{ value:new THREE.Vector2() }, uEnv:{ value:0 }
};
const skyMat = new THREE.ShaderMaterial({
  uniforms:skyU, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader:`
uniform vec3 uZenith, uMid, uHorizon, uGround, uSunColor, uSunDir, uView; uniform vec2 uCloud; uniform float uEnv;
varying vec3 vDir;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.16, h));
  sky = mix(sky, uZenith, smoothstep(0.1, 0.75, h));
  float sd = max(dot(d, uSunDir), 0.0);
  sky += uSunColor * (pow(sd, 5.0) * 0.18 + pow(sd, 48.0) * 0.45);
  if (h > 0.0){
    // clouds live on a plane far overhead; uCloud slides them as the player moves forward
    vec2 cp = d.xz / (h + 0.09) * 0.9 + uCloud;
    float c = fbm(cp * 1.1);
    float cov = smoothstep(0.5, 0.78, c) * smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.55, 0.95, h) * 0.6);
    float lit = clamp(0.62 + (c - fbm(cp * 1.1 + uSunDir.xz * 0.12)) * 3.2, 0.0, 1.0);
    vec3 cloud = mix(mix(uHorizon, uMid, 0.35) * 0.82, vec3(1.08, 1.06, 1.02), lit);
    cloud += uSunColor * pow(sd, 6.0) * 0.6 * lit;
    sky = mix(sky, cloud, cov * 0.92);
  }
  if (uEnv < 0.5) sky += uSunColor * smoothstep(0.99935, 0.99965, sd) * 40.0;
  else sky = mix(sky, uGround, smoothstep(0.0, -0.18, h));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
});
export const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(390, 48, 24), skyMat);
skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
export function buildEnvironment(){
  const envScene = new THREE.Scene(), m = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMat);
  envScene.add(m); skyU.uEnv.value = 1;
  const rt = pmrem.fromScene(envScene, 0.02, 0.1, 200);
  skyU.uEnv.value = 0; m.geometry.dispose();
  if (envRT) envRT.dispose(); envRT = rt;
  scene.environment = rt.texture; scene.environmentIntensity = 1.0;
}
export function setSkyColours(){
  skyU.uZenith.value.set(P.sky1); skyU.uMid.value.set(P.sky2); skyU.uHorizon.value.set(P.fog);
  skyU.uGround.value.set(P.hemiGround).multiplyScalar(0.7); skyU.uSunColor.value.set(P.sun);
}
