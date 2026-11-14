// Applies the light or dark palette to the scene, materials and textures.
import { P, readPalette } from '../core/palette.js';
import { drawIconCanvases } from '../textures/icons.js';
import { scene, LIGHT_K, hemi, sun } from './renderer.js';
import { buildEnvironment, setSkyColours } from './sky.js';
import { M, GLOW } from './materials.js';
import { TEX } from '../textures/procedural.js';
import { makeGroundTextures, makeDirtTextures } from '../textures/ground.js';
import { groundMesh, dirt } from '../world/ground.js';
import { player, buildPlayer } from '../characters/player.js';

export function applyTheme(){
  readPalette();
  const keep = ['green','greenDark','gold','red','orange','yellow','paper','white','dark','steel','wood','npc','suit','frame','far','sil','blue'];
  const map = { white:'paper', dark:'outline' };
  for (const k of keep) if (M[k]) M[k].color.set(P[map[k] || k]);
  M.yellowGlow.color.set(P.yellow); M.yellowGlow.emissive.set(P.yellow);
  M.lamp.color.set(P.lamp); M.lamp.emissive.set(P.lamp); M.headlight.color.set(P.lamp).multiplyScalar(GLOW);
  M.tail.color.set(P.red).multiplyScalar(1.6); M.redLight.color.set(P.red).multiplyScalar(GLOW * 2);
  M.beam.color.set(P.lamp); M.beam.opacity = isNaN(parseFloat(P.beamA)) ? 0.06 : parseFloat(P.beamA); M.beam.visible = M.beam.opacity > 0.001;
  scene.fog.color.set(P.fog);
  hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGround); hemi.intensity = (parseFloat(P.hemiI) || 0.8) * LIGHT_K * 0.35;
  sun.color.set(P.sunLight); sun.intensity = (parseFloat(P.sunI) || 1) * LIGHT_K * 1.2;
  setSkyColours(); buildEnvironment();
  for (const k of ['ground', 'dirt']) if (TEX[k]) TEX[k].dispose();
  makeGroundTextures(); makeDirtTextures();
  groundMesh.material.map = TEX.ground; groundMesh.material.needsUpdate = true;
  dirt.material.map = TEX.dirt; dirt.material.needsUpdate = true;
  M.pitWall.map = TEX.dirtPit; M.pitWall.needsUpdate = true;
  if (player) buildPlayer();
  drawIconCanvases();
}
