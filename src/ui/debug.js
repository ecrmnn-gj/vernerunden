// Screenshot and test hook, only installed with ?debug in the URL: lets scripts/shots.mjs set a figure, a creator
// tab, a pose and a fixed camera without clicking through the game.
import { state } from '../game/state.js';
import { char, setChar, buildPlayer, player } from '../characters/player.js';
import { migrateChar } from '../characters/charSchema.js';
import { poseReset, poseRun, poseJump, poseSlide, poseReady } from '../characters/poses.js';
import { dbg } from '../render/frame.js';
import { requestStart, selectTab, syncCreatorUi } from './creator.js';
import { partStats } from '../characters/figure/client.js';

const POSES = {
  reset:f => poseReset(f),
  run:(f, ph) => poseRun(f, ph, 0.95),
  jump:f => poseJump(f),
  slide:f => poseSlide(f),
  ready:f => poseReady(f),
  cheer:f => { poseReset(f); f.shL.rotation.z = -2.5; f.shR.rotation.z = 2.5; f.elL.rotation.x = f.elR.rotation.x = 0.55; },
  sit:f => { poseReset(f); f.body.position.y = 0.56; f.hipL.rotation.x = f.hipR.rotation.x = 1.5; f.knL.rotation.x = f.knR.rotation.x = -1.5; }
};

if (new URLSearchParams(location.search).has('debug')){
  window.__vr3dDebug = {
    state:() => state,
    figStats:() => Object.assign({}, partStats),
    char:() => Object.assign({}, char),
    player:() => player,
    setChar(c){ setChar(migrateChar(Object.assign({}, char, c))); buildPlayer(); syncCreatorUi(); },
    tab:id => selectTab(id, true),
    start:() => requestStart(),
    // pose(name, phase, turn): hold a pose every frame, with the figure turned by `turn` radians; pose(null) releases it
    pose(name, phase = 0, turn = 0){ dbg.pose = name ? (f => { POSES[name](f, phase); f.root.rotation.y = Math.PI + turn; }) : null; },
    // cam([x,y,z], [x,y,z], fov): a fixed camera; cam(null) gives the game's camera back
    cam(pos, look, fov = 30){ dbg.cam = pos ? { pos, look, fov } : null; }
  };
}
