// Poses for the human rig: run, jump, slide, ready and sit.
import { clamp } from '../core/utils.js';

const JOINTS = ['shL', 'elL', 'hipL', 'knL', 'anL', 'shR', 'elR', 'hipR', 'knR', 'anR'];
export function poseReset(f){ f.body.rotation.set(0, 0, 0); f.body.position.y = 0.97; f.head.rotation.set(0, 0, 0); for (const k of JOINTS) f[k].rotation.set(0, 0, 0); f.elL.rotation.x = f.elR.rotation.x = 0.15; f.shL.rotation.z = -0.06; f.shR.rotation.z = 0.06; }
function feet(f){ f.anL.rotation.x = clamp(-(f.hipL.rotation.x + f.knL.rotation.x) * 0.7, -0.7, 0.9); f.anR.rotation.x = clamp(-(f.hipR.rotation.x + f.knR.rotation.x) * 0.7, -0.7, 0.9); }
export function poseRun(f, ph, amp){
  const s = Math.sin(ph), c = Math.cos(ph);
  f.hipL.rotation.x = s * amp * 0.9; f.hipR.rotation.x = -s * amp * 0.9;
  f.knL.rotation.x = -amp * (0.2 + 1.4 * Math.max(0, c)); f.knR.rotation.x = -amp * (0.2 + 1.4 * Math.max(0, -c));
  feet(f);
  f.shL.rotation.x = -s * amp * 0.8; f.shR.rotation.x = s * amp * 0.8; f.elL.rotation.x = f.elR.rotation.x = 0.25 + amp * 1.2;
  f.shL.rotation.z = -0.1; f.shR.rotation.z = 0.1;
  f.body.rotation.set(-0.17 * amp, s * 0.12 * amp, 0);
  f.body.position.y = 0.97 - amp * 0.04 + Math.abs(s) * 0.05 * amp;
  f.head.rotation.set(0.12 * amp, -s * 0.1 * amp, 0);
}
export function poseJump(f){ poseReset(f); f.body.rotation.x = -0.1; f.hipL.rotation.x = 1.15; f.knL.rotation.x = -1.5; f.hipR.rotation.x = -0.25; f.knR.rotation.x = -0.9; feet(f); f.shL.rotation.x = 2.5; f.elL.rotation.x = 0.4; f.shR.rotation.x = -0.5; f.elR.rotation.x = 1.0; f.head.rotation.x = 0.1; }
export function poseSlide(f){ poseReset(f); f.body.rotation.x = 1.15; f.body.position.y = 0.44; f.hipL.rotation.x = f.hipR.rotation.x = 1.45; f.knL.rotation.x = f.knR.rotation.x = -0.15; f.anL.rotation.x = f.anR.rotation.x = 0.3; f.shL.rotation.x = f.shR.rotation.x = -0.4; f.elL.rotation.x = f.elR.rotation.x = 0.5; f.head.rotation.x = -0.6; }
export function poseReady(f){ poseReset(f); f.body.rotation.x = -0.35; f.body.position.y = 0.88; f.hipL.rotation.x = 0.6; f.knL.rotation.x = -0.6; f.hipR.rotation.x = -0.35; f.knR.rotation.x = -0.5; feet(f); f.shL.rotation.x = -0.6; f.shR.rotation.x = 0.7; f.elL.rotation.x = f.elR.rotation.x = 1.3; f.head.rotation.x = 0.3; }
function poseSit(f){ poseReset(f); f.body.position.y = 0.56; f.hipL.rotation.x = f.hipR.rotation.x = 1.5; f.knL.rotation.x = f.knR.rotation.x = -1.5; f.shR.rotation.x = 0.55; f.elR.rotation.x = 1.5; f.shL.rotation.x = 0.25; f.elL.rotation.x = 0.7; f.head.rotation.x = -0.08; }
