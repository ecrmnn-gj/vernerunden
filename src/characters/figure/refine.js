// Derived bones, run every frame after the poses: poses.js only sets the joints makeHuman had, and this spreads that
// motion over the extra bones so the body bends like a body. It only reads posed joints and only writes bones the
// poses never touch, so it can run any number of times per frame with the same result.
import * as THREE from 'three';

const I = new THREE.Quaternion(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const HALF = [['shL', 'shL_h'], ['elL', 'elL_h'], ['shR', 'shR_h'], ['elR', 'elR_h'], ['hipL', 'hipL_h'], ['knL', 'knL_h'], ['hipR', 'hipR_h'], ['knR', 'knR_h']];

export function refine(B, headCtl){
  // torso twist: the hips turn less than the body, the chest more
  const t = B.body.rotation.y;
  B.pelvis.rotation.set(0, -0.45 * t, 0); B.spine.rotation.set(0, 0.2 * t, 0); B.chest.rotation.set(0, 0.25 * t, 0);
  // shoulders shrug as the arms go up past horizontal
  for (const [s, sign] of [['L', -1], ['R', 1]]){
    _v.set(0, -1, 0).applyEuler(B['sh' + s].rotation);
    const elev = Math.acos(Math.max(-1, Math.min(1, -_v.y)));
    B['clav' + s].rotation.set(0, 0, sign * 0.28 * sm(1.3, 2.6, elev));
  }
  // half-joint helpers carry the volume at shoulders, elbows, hips and knees
  for (const [j, h] of HALF) B[h].quaternion.slerpQuaternions(I, B[j].quaternion, 0.5);
  // the head turn is shared by the neck and the head, minus the chest's extra twist so the gaze stays put
  _q.setFromEuler(headCtl.rotation);
  _q2.setFromEuler(_e.set(0, -0.45 * t, 0));
  B.neckB.quaternion.slerpQuaternions(I, _q, 0.35).premultiply(_q2);
  B.headB.quaternion.slerpQuaternions(I, _q, 0.65);
}
