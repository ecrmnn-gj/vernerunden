// Turns generated part records into a posable figure: THREE.Bones in the bind pose, a Skeleton, one SkinnedMesh per
// part, and the same API object makeHuman returns (root, body, head, shL, elL, ...), so poses.js drives it unchanged.
import * as THREE from 'three';
import { BONES, BONE_INDEX, BIND_ROT, rigSpec } from './rig.js';
import { refine, hairChains } from './refine.js';
import { makeHelmet } from './analytic.js';
import { makeFigureUniforms, makePartMaterial, setFigureColours } from './materials.js';
import { headLandmarks } from './gen/head.js';
import { irisTexture } from './textures.js';

const API_BONES = ['body', 'shL', 'elL', 'hipL', 'knL', 'anL', 'shR', 'elR', 'hipR', 'knR', 'anR'];

// o: the character options; parts: { body, hands, head, boot, hair, hairU, beard } records from generate.js (hair and
// beard records may be empty).
export function assembleFigure(o, parts, opts = {}){
  const spec = rigSpec(o), root = new THREE.Group(), B = {}, list = [];
  for (const [n, parent] of BONES){
    const b = new THREE.Bone(); b.name = n;
    b.position.fromArray(spec.rest[n]);
    const r = BIND_ROT[n]; if (r) b.rotation.set(r[0], r[1], r[2]);
    (parent ? B[parent] : root).add(b);
    B[n] = b; list.push(b);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list); // inverses from the bind pose
  const uniforms = makeFigureUniforms(), mats = [], meshes = [];
  const ROUGH = { boot:0.6, hair:0.55 };
  const add = (kind, rec, anchorBone, boneMap) => {
    if (!rec || !rec.index.length) return null;
    const g = partGeometry(rec, anchorBone ? spec.world[anchorBone] : null, boneMap || (n => BONE_INDEX[n]));
    const mat = makePartMaterial(kind, uniforms, { roughness:ROUGH[kind] ?? 0.82 });
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    root.add(mesh); mesh.bind(skeleton, new THREE.Matrix4());
    mats.push(mat); meshes.push(mesh);
    return mesh;
  };
  add('body', parts.body); add('hands', parts.hands); add('head', parts.head, 'headB');
  for (const s of ['L', 'R']) add('boot', parts.boot, 'an' + s, n => BONE_INDEX[n + s]);
  // hair in two versions, with and without the helmet on, and the beard
  const hairOpen = add('hair', parts.hair, 'headB'), hairUnder = add('hair', parts.hairU, 'headB');
  add('hair', parts.beard, 'headB');
  // the head control: poses and the creator turn it, refine() shares the turn between neck and head bones
  const head = new THREE.Object3D(); B.body.add(head);
  for (const b of list) b.rotation.copy(new THREE.Euler()); // runtime rest: the poses set the joints from here
  // a control for swinging hair, like makeHuman's ponytail: frame.js sets its rotation, refine() springs the chain
  const chains = hairChains(B, o.hairStyle), pony = chains.length ? new THREE.Object3D() : null;
  if (pony) B.headB.add(pony);
  const fig = { root, head, pony, chains, skeleton, bones:B, uniforms, mats, meshes, ready:true, lids:[], blink:{ next:1.5, t:-1 }, hairOpen, hairUnder,
    update(dt, time){ refine(B, head, pony, chains, dt || 0); if (dt) blink(fig, dt); },
    // with the helmet off the full hair shows; with it on, the version cut away under the dome
    setHelmet(on){
      if (fig.helmet) fig.helmet.visible = on;
      if (hairOpen) hairOpen.visible = !on || !hairUnder;
      if (hairUnder) hairUnder.visible = on;
    },
    setColours(c){
      setFigureColours(uniforms, c, cssGreen());
      if (fig.helmetMat) fig.helmetMat.color.set(c.helmet);
      if (fig.eyeMat){ const t = irisTexture(c.eyes); fig.eyeMat.map = t; fig.eyeMat.color.set(t ? '#ffffff' : c.eyes); fig.eyeMat.needsUpdate = true; }
    } };
  for (const n of API_BONES) fig[n] = B[n];
  B.body.position.y = spec.rest.body[1];
  addEyes(fig, o);
  attachHelmet(fig, o);
  fig.setColours(o);
  fig.setHelmet(opts.helmet !== false);
  return fig;
}

// Typed arrays to a BufferGeometry. Parts built in a bone's space are moved into the bind pose with that bone's
// bind-pose matrix; part-local bone names are mapped to skeleton indices.
function partGeometry(rec, anchor, boneOf){
  const nv = rec.positions.length / 3, pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3);
  if (anchor){
    const M = anchor;
    for (let v = 0; v < nv; v++){
      const x = rec.positions[v * 3], y = rec.positions[v * 3 + 1], z = rec.positions[v * 3 + 2], a = rec.normals[v * 3], b = rec.normals[v * 3 + 1], c = rec.normals[v * 3 + 2];
      pos[v * 3] = M[0] * x + M[4] * y + M[8] * z + M[12]; pos[v * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; pos[v * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      nrm[v * 3] = M[0] * a + M[4] * b + M[8] * c; nrm[v * 3 + 1] = M[1] * a + M[5] * b + M[9] * c; nrm[v * 3 + 2] = M[2] * a + M[6] * b + M[10] * c;
    }
  } else { pos.set(rec.positions); nrm.set(rec.normals); }
  const map = rec.bones.map(boneOf), si = new Uint8Array(rec.skinIndex.length);
  for (let i = 0; i < si.length; i++) si[i] = map[rec.skinIndex[i]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('aRegion', new THREE.BufferAttribute(rec.region, 4));
  if (rec.region2) g.setAttribute('aRegion2', new THREE.BufferAttribute(rec.region2, 4));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(rec.skinWeight, 4, true));
  g.setIndex(new THREE.BufferAttribute(rec.index, 1));
  g.computeBoundingSphere();
  return g;
}

function cssGreen(){ try { return getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#2E8B57'; } catch (e){ return '#2E8B57'; } }

// Eyes: spheres with an iris texture in the sockets the head sculpt leaves for them, and upper and lower lids that
// are thin shells just in front of the eyeball. A blink rotates the upper lid down over the eye.
const LID_UP = 1.33, LID_DOWN = 1.15, BLINK_SHUT = -1.0;
function addEyes(fig, o){
  const L = headLandmarks(o), r = L.eye.r;
  const eyeMat = new THREE.MeshPhysicalMaterial({ roughness:0.18, clearcoat:1, clearcoatRoughness:0.05, emissive:new THREE.Color(0), emissiveIntensity:1 });
  const lidMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.75, emissive:new THREE.Color(0), emissiveIntensity:1 });
  lidMat.color = fig.uniforms.uSkin.value; // shares the skin colour
  const eyeGeo = new THREE.SphereGeometry(r, 28, 18).rotateX(-Math.PI / 2); // the texture's top pole faces forward
  const upGeo = lidGeometry(r + 0.0009, 0, LID_UP, true), downGeo = lidGeometry(r + 0.0008, Math.PI - LID_DOWN, LID_DOWN, false);
  for (const side of ['L', 'R']){
    const g = new THREE.Group(); g.position.fromArray(L.eye[side]);
    const eye = new THREE.Mesh(eyeGeo, eyeMat), up = new THREE.Mesh(upGeo, lidMat), down = new THREE.Mesh(downGeo, lidMat);
    g.add(eye, up, down); fig.bones.headB.add(g); fig.lids.push(up);
  }
  fig.eyeMat = eyeMat; fig.mats.push(eyeMat, lidMat); fig.eyeGeos = [eyeGeo, upGeo, downGeo];
}
// A spherical cap around +y (thetaStart..thetaStart+len), darkened along the lid's edge for the lash line.
function lidGeometry(r, start, len, upper){
  const g = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, start, len), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++){
    const th = Math.acos(Math.max(-1, Math.min(1, pos.getY(i) / r))), edge = upper ? start + len - th : th - start;
    const k = edge < 0.12 ? 0.22 + edge / 0.12 * 0.5 : 1;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// Every few seconds, sometimes twice: shut in 70 ms, open in 110 ms.
function blink(fig, dt){
  const b = fig.blink;
  b.next -= dt;
  if (b.t < 0 && b.next <= 0){ b.t = 0; b.next = 2 + ((b.n = ((b.n || 1) * 16807) % 2147483647) % 4000) / 1000; b.double = b.n % 7 === 0; }
  let a = 0;
  if (b.t >= 0){
    b.t += dt;
    a = b.t < 0.07 ? b.t / 0.07 : Math.max(0, 1 - (b.t - 0.07) / 0.11);
    if (b.t > 0.18){ if (b.double){ b.double = false; b.t = 0; } else b.t = -1; }
  }
  for (const lid of fig.lids) lid.rotation.x = BLINK_SHUT * a;
}

// The hard hat, fitted to the hair style.
function attachHelmet(fig, o){
  const m = new THREE.MeshStandardMaterial({ color:o.helmet, roughness:0.32, metalness:0.05, side:THREE.DoubleSide, emissive:new THREE.Color(0), emissiveIntensity:1 });
  const g = makeHelmet(o, m);
  fig.bones.headB.add(g); fig.mats.push(m); fig.helmet = g; fig.helmetMat = m;
}
