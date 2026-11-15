// Turns generated part records into a posable figure: THREE.Bones in the bind pose, a Skeleton, one SkinnedMesh per
// part, and the same API object makeHuman returns (root, body, head, shL, elL, ...), so poses.js drives it unchanged.
import * as THREE from 'three';
import { BONES, BONE_INDEX, BIND_ROT, rigSpec } from './rig.js';
import { refine } from './refine.js';
import { makeFigureUniforms, makePartMaterial } from './materials.js';

const API_BONES = ['body', 'shL', 'elL', 'hipL', 'knL', 'anL', 'shR', 'elR', 'hipR', 'knR', 'anR'];

// o: the character options; parts: { body, hands, head, boot } records from generate.js.
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
  const add = (kind, rec, anchorBone, boneMap) => {
    const g = partGeometry(rec, anchorBone ? spec.world[anchorBone] : null, boneMap || (n => BONE_INDEX[n]));
    const mat = makePartMaterial(kind, uniforms, { roughness:kind === 'boot' ? 0.6 : 0.82 });
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    root.add(mesh); mesh.bind(skeleton, new THREE.Matrix4());
    mats.push(mat); meshes.push(mesh);
  };
  add('body', parts.body); add('hands', parts.hands); add('head', parts.head, 'headB');
  for (const s of ['L', 'R']) add('boot', parts.boot, 'an' + s, n => BONE_INDEX[n + s]);
  // the head control: poses and the creator turn it, refine() shares the turn between neck and head bones
  const head = new THREE.Object3D(); B.body.add(head);
  for (const b of list) b.rotation.copy(new THREE.Euler()); // runtime rest: the poses set the joints from here
  const fig = { root, head, pony:null, skeleton, bones:B, uniforms, mats, meshes, ready:true,
    update(){ refine(B, head); },
    setColours(c){ setColours(uniforms, c); } };
  for (const n of API_BONES) fig[n] = B[n];
  B.body.position.y = spec.rest.body[1];
  fig.setColours(o);
  if (opts.helmet) attachHelmet(fig, opts.helmet);
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
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(rec.skinWeight, 4, true));
  g.setIndex(new THREE.BufferAttribute(rec.index, 1));
  g.computeBoundingSphere();
  return g;
}

const GLOVE = '#C7B48A';
function setColours(u, c){
  const green = getComputedStyleSafe('--green') || '#2E8B57';
  u.uShirt.value.set(c.shirt === 'green' ? green : c.shirt);
  u.uPants.value.set(c.pants); u.uPocket.value.set(c.pants).multiplyScalar(0.82);
  u.uBelt.value.set('#1C1A18'); u.uPad.value.set('#1A1714');
  u.uSkin.value.set(c.skin); u.uGlove.value.set(GLOVE);
  u.uBoot.value.set('#4A3422'); u.uSole.value.set('#1A1714');
}
function getComputedStyleSafe(v){ try { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); } catch (e){ return ''; } }

// A plain hard hat on the head bone until the sculpted one replaces it.
function attachHelmet(fig, colour){
  const m = new THREE.MeshStandardMaterial({ color:colour, roughness:0.32, metalness:0.05, emissive:new THREE.Color(0), emissiveIntensity:1 });
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.128, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.92, 1.1);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.148, 0.012, 32), m); brim.scale.set(1.04, 1, 1.22); brim.position.z = -0.012;
  g.add(dome, brim); g.position.set(0, 0.07, 0.0);
  for (const x of g.children){ x.castShadow = x.receiveShadow = true; }
  fig.bones.headB.add(g); fig.mats.push(m); fig.helmet = g;
}
