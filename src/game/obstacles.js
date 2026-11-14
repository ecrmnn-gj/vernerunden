// Builds the mesh for each obstacle type.
import * as THREE from 'three';
import { FONT_C, rand, pick } from '../core/utils.js';
import { P } from '../core/palette.js';
import { canvasTex, labelSprite } from '../textures/canvas.js';
import { LANE } from '../world/layout.js';
import { M } from '../render/materials.js';
import { GEO_PIT } from '../world/ground.js';
import { box, GEO, vanPaint, PIT_DEPTH, addMesh, bake, regroupBox } from '../world/geometry.js';
import { SIGNS, signPlane } from '../textures/signs.js';
import { smat, makeHuman } from '../characters/human.js';
import { poseReset } from '../characters/poses.js';
import { OBS, SIGN_TEXTS, signTexCache } from './content.js';

export function buildObstacle(type){
  const grp = new THREE.Group();
  if (type === 'gass'){
    const body = addMesh(grp, new THREE.CylinderGeometry(0.16, 0.16, 0.62, 20), smat('#5E7F66', 0.45, 0.25), 0, 0.17, 0); body.rotation.z = Math.PI / 2;
    for (const x of [-0.31, 0.31]){ const e = addMesh(grp, new THREE.SphereGeometry(0.16, 18, 12), smat('#5E7F66', 0.45, 0.25), x, 0.17, 0, 0.35, 1, 1); }
    const band = addMesh(grp, new THREE.CylinderGeometry(0.163, 0.163, 0.1, 20), M.red, 0.08, 0.17, 0); band.rotation.z = Math.PI / 2;
    const neck = addMesh(grp, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), smat('#C9CFD3', 0.3, 0.7), -0.4, 0.17, 0); neck.rotation.z = Math.PI / 2;
    const valve = addMesh(grp, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 14), M.dark, -0.46, 0.17, 0); valve.rotation.z = Math.PI / 2;
    const foot = addMesh(grp, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20), M.dark, 0.36, 0.17, 0); foot.rotation.z = Math.PI / 2;
    grp.rotation.y = rand(-0.4, 0.4);
  }
  else if (type === 'sement'){
    const sack = smat('#D9CDB2', 0.95), print = smat('#5A7A9A', 0.8), geo = new THREE.BoxGeometry(0.46, 0.13, 0.3);
    const put = (x, y, z, ry) => { const m = addMesh(grp, geo, sack, x, y, z); m.rotation.y = ry; const b = addMesh(grp, box(0.3, 0.004, 0.18), print, x, y + 0.066, z); b.rotation.y = ry; };
    put(-0.22, 0.065, 0, 0.05); put(0.24, 0.065, 0.02, -0.08); put(0.0, 0.195, 0.01, 0.12); put(0.02, 0.325, -0.01, -0.06);
    addMesh(grp, new THREE.ConeGeometry(0.2, 0.12, 16), smat('#A39E96', 1), 0.42, 0.06, 0.2);
  }
  else if (type === 'drill'){ addMesh(grp, GEO.unit, M.dark, 0, 0.06, 0, 0.3, 0.12, 0.2); addMesh(grp, GEO.unit, M.orange, 0, 0.24, 0, 0.12, 0.28, 0.14); addMesh(grp, GEO.unit, M.orange, 0.06, 0.42, 0, 0.44, 0.15, 0.16); addMesh(grp, GEO.unit, M.steel, -0.22, 0.42, 0, 0.1, 0.08, 0.08); addMesh(grp, GEO.unit, M.steel, -0.34, 0.42, 0, 0.16, 0.02, 0.02); }
  else if (type === 'kjegle'){ addMesh(grp, GEO.unit, M.dark, 0, 0.03, 0, 0.5, 0.06, 0.5); addMesh(grp, GEO.cone, M.orange, 0, 0.42, 0); addMesh(grp, new THREE.CylinderGeometry(0.145, 0.17, 0.1, 18), M.paper, 0, 0.36, 0); addMesh(grp, new THREE.CylinderGeometry(0.075, 0.095, 0.08, 18), M.paper, 0, 0.6, 0); }
  else if (type === 'skilt'){
    const lines = pick(SIGN_TEXTS), key = lines.join(' ');
    const tex = signTexCache[key] || (signTexCache[key] = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = P.yellow; c.fillRect(0, 0, w, h); c.strokeStyle = P.outline; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
      c.save(); c.beginPath(); c.rect(14, 14, w - 28, 44); c.clip(); for (let x = -40; x < w; x += 36){ c.fillStyle = P.red; c.beginPath(); c.moveTo(x, 58); c.lineTo(x + 18, 14); c.lineTo(x + 36, 14); c.lineTo(x + 18, 58); c.closePath(); c.fill(); } c.restore();
      c.fillStyle = P.outline; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((l, i) => { let fs = 60; c.font = `900 ${fs}px ${FONT_C}`; const tw = c.measureText(l).width; if (tw > w - 40){ fs = Math.floor(fs * (w - 40) / tw); c.font = `900 ${fs}px ${FONT_C}`; } c.fillText(l, w / 2, 118 + i * 70); });
    }));
    const board = new THREE.Mesh(regroupBox(box(1.3, 1.15, 0.05), [0, 0, 0, 0, 1, 0]), [M.dark, new THREE.MeshStandardMaterial({ map:tex, roughness:0.4 })]);
    board.position.y = 1.2; board.castShadow = board.receiveShadow = true; grp.add(board);
    for (const x of [-0.5, 0.5]){ addMesh(grp, GEO.post, M.steel, x, 0.35, -0.04, 1.2, 0.7, 1.2); addMesh(grp, GEO.unit, M.dark, x, 0.04, -0.04, 0.22, 0.08, 0.5); }
  }
  else if (type === 'tralle'){ const tray = addMesh(grp, new THREE.CylinderGeometry(0.62, 0.38, 0.38, 4, 1), M.yellow, 0, 0.62, 0.05); tray.rotation.y = Math.PI / 4; tray.scale.set(0.95, 1, 1.45); const wh = addMesh(grp, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14), M.dark, 0, 0.2, 0.6); wh.rotation.z = Math.PI / 2; for (const x of [-0.25, 0.25]) addMesh(grp, GEO.unit, M.dark, x, 0.25, -0.35, 0.05, 0.5, 0.05); for (const x of [-0.28, 0.28]) addMesh(grp, GEO.unit, M.dark, x, 0.72, -0.85, 0.05, 0.05, 0.7); }
  else if (type === 'barn'){
    const f = makeHuman({ shirt:smat(pick(['#E8443A', '#2F7FD6', '#F2C230', '#3FAE5A', '#B25BD6']), 0.8), pants:smat(pick(['#2E3747', '#5A6B7A', '#3B2E28']), 0.9), boots:smat(pick(['#F2F2F2', '#E8443A', '#2F7FD6']), 0.6) });
    f.root.scale.setScalar(0.62); grp.add(f.root); grp.userData.fig = f;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), new THREE.MeshStandardMaterial({ map:ballTex, roughness:0.45 }));
    ball.position.set(0, 0.12, -1.1); ball.castShadow = true; grp.add(ball); grp.userData.ball = ball;
  }
  else if (type === 'laerling'){
    const f = makeHuman({ shirt:smat('#5A4A3E', 0.85), pants:smat('#3B3F45', 0.9), vest:smat('#F4D21F', 0.7), stripe:smat('#DADDE0', 0.3, 0.5), helmet:smat('#2F6FB5', 0.35), kneepads:true });
    const phone = new THREE.Group(); phone.position.set(0, -0.32, -0.04); f.elR.add(phone);
    addMesh(phone, box(0.075, 0.14, 0.012), M.dark, 0, 0, 0);
    const scr = addMesh(phone, box(0.064, 0.12, 0.002), new THREE.MeshBasicMaterial({ color:new THREE.Color('#7FC4FF') }), 0, 0, 0.008); scr.castShadow = false;
    f.root.rotation.y = Math.PI; grp.add(f.root); grp.userData.fig = f;
  } else if (type === 'bil' || type === 'kjor'){
    const vanM = vanPaint(pick(['#F2F2EF', '#C8302A', '#2F5E9E', '#B7BDC2', '#2E5A3C', '#E3B521', '#26292D', '#E36F1E']));
    addMesh(grp, GEO.vanBox, vanM, 0, 1.27, -0.55);
    addMesh(grp, GEO.vanNose, vanM, 0, 0.86, 1.52);
    const wind = addMesh(grp, GEO.vanWind, M.glass, 0, 1.62, 1.1); wind.rotation.x = -0.5; wind.castShadow = false;
    for (const x of [-1, 1]){
      const sw = addMesh(grp, GEO.unit, M.glass, x * 0.985, 1.68, 0.78, 0.02, 0.52, 0.72); sw.castShadow = false;
      addMesh(grp, GEO.unit, M.plastic, x * 1.08, 1.5, 1.05, 0.18, 0.2, 0.06);
      addMesh(grp, GEO.unit, M.green, x * 0.99, 0.95, -0.3, 0.02, 0.18, 3.6);
      const s = signPlane(SIGNS.hansen, 2.6, 0.5); s.position.set(x * 0.992, 1.55, -0.6); s.rotation.y = x * Math.PI / 2; grp.add(s);
      addMesh(grp, GEO.unit, M.plastic, x * 0.99, 0.62, -0.6, 0.03, 0.12, 3.2);
    }
    addMesh(grp, GEO.vanBumper, M.plastic, 0, 0.42, 2.08);
    addMesh(grp, GEO.vanBumper, M.plastic, 0, 0.42, -2.22);
    addMesh(grp, GEO.unit, M.dark, 0, 0.78, 2.1, 1.0, 0.22, 0.02).castShadow = false;
    for (const x of [-0.72, 0.72]){
      const hl = addMesh(grp, GEO.vanLamp, M.headlight, x, 0.84, 2.09); hl.castShadow = false;
      const tl = addMesh(grp, GEO.unit, M.tail, x * 1.17, 1.05, -2.21, 0.16, 0.5, 0.03); tl.castShadow = false;
    }
    for (const x of [-0.9, 0.9]) for (const z of [-1.5, 1.4]){
      const w = new THREE.Group(); w.position.set(x, 0.36, z); grp.add(w);
      const tyre = addMesh(w, GEO.tyre, M.rubber, 0, 0, 0); tyre.rotation.z = Math.PI / 2;
      const rim = addMesh(w, GEO.rim, M.rim, Math.sign(x) * 0.08, 0, 0); rim.rotation.z = Math.PI / 2;
    }
    bake(grp);
  } else if (type === 'stillas'){
    for (const x of [-1.0, 1.0]) for (const z of [-0.6, 0.6]) addMesh(grp, GEO.post, M.steel, x, 1.1, z, 1, 2.2, 1);
    addMesh(grp, GEO.unit, M.wood, 0, 1.4, 0, 2.2, 0.16, 1.3);
    addMesh(grp, GEO.unit, M.steel, -0.3, 2.15, 0.6, 1.4, 0.05, 0.05);
    for (const s of [-1, 1]){ const br = addMesh(grp, GEO.unit, M.steel, 0, 1.78, s * 0.6, 2.2, 0.04, 0.04); br.rotation.z = 0.32; }
    const tag = signPlane(SIGNS.tag, 0.5, 0.28); tag.position.set(-1.0, 1.05, 0.68); grp.add(tag);
    bake(grp);
  } else if (type === 'hull' || type === 'grop'){
    const d = OBS[type];
    const hole = new THREE.Group(); grp.add(hole); grp.userData.hole = hole;
    const punch = new THREE.Mesh(GEO_PIT.punch, M.pitPunch); punch.renderOrder = -2; punch.castShadow = punch.receiveShadow = false; hole.add(punch);
    const walls = new THREE.Mesh(GEO_PIT.walls, M.pitWall); walls.scale.y = PIT_DEPTH; walls.receiveShadow = true; hole.add(walls);
    // a lip of broken concrete around the opening
    grp.userData.lip = [];
    for (let i = 0; i < 4; i++){ const lp = addMesh(grp, GEO.unit, M.concrete, 0, 0.02, 0, 1, 0.05, 1); lp.castShadow = false; grp.userData.lip.push(lp); }
    grp.userData.edge = [];
    if (type === 'hull'){ const sign = signPlane(SIGNS.passpa, 0.5, 0.28); sign.position.set(0.95, 0.75, 0.6); grp.add(sign); grp.userData.edge.push(sign, addMesh(grp, GEO.post, M.wood, 0.95, 0.3, 0.6, 1, 0.6, 1)); }
    else { for (const x of [-3.9, 3.9]){ const s = signPlane(SIGNS.byggegrop, 1.4, 0.52); s.position.set(x, 1.15, d.len / 2 + 0.3); grp.add(s); grp.userData.edge.push(s, addMesh(grp, GEO.post, M.wood, x, 0.45, d.len / 2 + 0.3, 1, 0.9, 1)); } }
  } else if (type === 'kappsag'){
    const span = 2 * LANE + 0.6, conc = smat('#9C9890', 0.95);
    for (const x of [-span / 2 + 0.5, span / 2 - 0.5]){
      addMesh(grp, GEO.unit, M.wood, x, 0.86, 0, 0.14, 0.08, 1.0);
      for (const z of [-0.35, 0.35]){ const l = addMesh(grp, GEO.unit, M.wood, x, 0.43, z, 0.08, 0.9, 0.08); l.rotation.x = z < 0 ? 0.25 : -0.25; }
    }
    addMesh(grp, GEO.unit, conc, 0, 0.98, 0.05, span, 0.16, 0.75);
    const f = makeHuman({ shirt:smat('#4A5058', 0.85), pants:smat('#3B3F45', 0.9), vest:M.orange, stripe:smat('#DADDE0', 0.3, 0.5), helmet:smat('#F2F2EE', 0.32), kneepads:true, glasses:true });
    poseReset(f); f.body.rotation.x = -0.45; f.shL.rotation.x = f.shR.rotation.x = 1.25; f.elL.rotation.x = f.elR.rotation.x = 0.5; f.hipL.rotation.x = f.hipR.rotation.x = 0.25; f.knL.rotation.x = f.knR.rotation.x = -0.35;
    for (const x of [-0.11, 0.11]){ const cup = addMesh(f.head, new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), M.red, x, 0, 0.005); cup.rotation.z = Math.PI / 2; }
    f.root.rotation.y = Math.PI; f.root.position.z = -0.95; grp.add(f.root);
    const saw = new THREE.Group(); saw.position.set(0.15, 1.18, -0.05); grp.add(saw);
    addMesh(saw, GEO.unit, M.orange, 0.12, 0.06, 0, 0.3, 0.16, 0.16);
    addMesh(saw, GEO.unit, M.dark, -0.06, 0.12, 0, 0.18, 0.05, 0.05);
    const blade = addMesh(saw, new THREE.CylinderGeometry(0.17, 0.17, 0.012, 24), smat('#B9BEC2', 0.3, 0.8), -0.12, -0.04, 0); blade.rotation.x = Math.PI / 2;
    grp.userData.blade = blade;
  } else if (type === 'tilsyn'){
    const suitM = smat('#252C3B', 0.6);

    const f = makeHuman({ shirt:suitM, pants:suitM, boots:smat('#111111', 0.35), suit:{ tie:smat('#C8281C', 0.5) }, helmet:smat('#F2F2EE', 0.32), glasses:true, hair:pick(['#9A9A96', '#2B1E16', '#4E3220']) }); grp.add(f.root); f.root.rotation.y = Math.PI;
    const binder = new THREE.Group(); binder.position.set(0.06, 0.42, -0.26); f.body.add(binder);
    addMesh(binder, GEO.unit, M.red, 0, 0, 0, 0.38, 0.48, 0.1);
    const lab = signPlane(SIGNS.avvik, 0.26, 0.13); lab.position.set(0, 0.04, -0.052); lab.rotation.y = Math.PI; binder.add(lab);
    for (let i = 0; i < 3; i++) addMesh(binder, GEO.unit, M.paper, -0.19, 0.14 - i * 0.12, 0, 0.04, 0.06, 0.08);
    const bub = labelSprite('Stopp der!', { bubble:true, height:0.42 }); bub.position.set(0, 2.45, 0); grp.add(bub);
    grp.userData.fig = f; grp.userData.binder = binder; grp.userData.bubble = bub;
  }
  return grp;
}
const ballTex = canvasTex(128, 64, (c, w, h) => {
  c.fillStyle = '#F7F7F5'; c.fillRect(0, 0, w, h); c.fillStyle = '#1A1A1A';
  for (const [x, y] of [[16, 16], [48, 40], [80, 14], [112, 38], [32, 56], [96, 58], [64, 4]]){ c.beginPath(); for (let k = 0; k < 5; k++){ const a = k * Math.PI * 2 / 5 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } c.closePath(); c.fill(); }
});
