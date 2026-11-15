// Starting and clearing a run, and the movement constants.
import { rand } from '../core/utils.js';
import { g, setG } from './state.js';
import { scene, FOG } from '../render/renderer.js';
import { disposeBaked } from '../world/geometry.js';
import { poseReset } from '../characters/poses.js';
import { player } from '../characters/player.js';
import { FX } from '../render/particles.js';
import { updateHud } from '../ui/hud.js';

export const SPEED0 = 11, ACCEL = 0.3, BASE_CAP = Infinity, GRAV = 32, JUMP_V = 11.2, DJUMP_V = 9.4;

function clearWorld(){
  if (!g) return;
  for (const o of g.obstacles){ scene.remove(o.mesh); disposeBaked(o.mesh); }
  for (const p of g.pickups) scene.remove(p.mesh);
  for (const c of g.fx) scene.remove(c.mesh);
  for (const d of (g.dust || [])){ scene.remove(d.sp); d.sp.material.dispose(); }
  FX.dust.clear(); FX.spark.clear();
}
export function newGame(){
  clearWorld();
  setG({
    t:0, dist:0, base:SPEED0, speed:SPEED0, boostF:1, boost:null,
    lane:0, x:0, y:0, vy:0, onGround:true, jumps:0, slideT:0, phase:0, invuln:0, stumble:0,
    tail:[], counts:{}, total:0, closed:0, lastAvvikM:0, streak:0, apps:0,
    briller:0, ore:0, kurs:0, ev:null, evTimer:9, nextEv:'dust', evGearSpawned:false,
    obstacles:[], pickups:[], fx:[], dust:[], extraGap:0, nextRowAt:46,
    hakeTimer:rand(3, 4.5), gearTimer:rand(8, 11), appTimer:rand(20, 28), rivalTimer:rand(9, 13), tilsynTimer:rand(18, 26), kidTimer:rand(14, 22),
    wrongApp:null, rivals:[], caught:false, fell:false, fellGrop:false, endT:0, nextMile:250, recordShown:false,
    shake:0, hitstop:0, cd:0, fov:60, fogNear:FOG.near, fogFar:FOG.far
  });
  player.root.position.set(0, 0, 0); player.root.rotation.set(0, 0, 0); poseReset(player);
  updateHud(true);
}
