// Ground, dirt, fence and lattice textures.
import * as THREE from 'three';
import { P } from '../core/palette.js';
import { canvasTex, dataTex } from './canvas.js';
import { gfxTier } from '../core/quality.js';
import { MAX_ANISO } from '../render/renderer.js';
import { LOOP } from '../world/layout.js';
import { TEX, rng, mkCanvas, normalFromHeight, grain, softBlob } from './procedural.js';

// The walkway: concrete slabs with joints, cracks, oil, tyre marks, puddles, worn lane paint and hazard edges.
// One tile is the full road width (7.6 m) and 32 m long; it scrolls with the run.
export const ROAD_W = 7.6, GROUND_TILE = 32, DIRT_TILE = 6;
const GROUND_PX = gfxTier === 'high' ? [1024, 2048] : [512, 1024];
const GL = (() => {
  const r = rng(7), L = { blotch:[], crack:[], oil:[], tire:[], puddle:[], wear:[] };
  for (let i = 0; i < 90; i++) L.blotch.push({ x:(r() - 0.5) * ROAD_W, y:r() * GROUND_TILE, rx:r() * 1.2 + 0.25, ry:r() * 2.4 + 0.4, dark:r() < 0.55, a:r() * 0.09 + 0.03 });
  for (let i = 0; i < 18; i++){ const pts = []; let x = (r() - 0.5) * ROAD_W * 0.9, y = Math.round(r() * 8) * 4 + (r() - 0.5) * 0.4, ang = r() * Math.PI * 2; const n = 8 + Math.floor(r() * 16); for (let k = 0; k < n; k++){ pts.push([x, y]); ang += (r() - 0.5) * 1.2; x += Math.cos(ang) * 0.09; y += Math.sin(ang) * 0.09; } L.crack.push(pts); }
  for (let i = 0; i < 7; i++) L.oil.push({ x:(Math.floor(r() * 3) - 1) * 2.1 + (r() - 0.5) * 1.2, y:r() * GROUND_TILE, s:r() * 0.25 + 0.12, a:r() * 0.05 + 0.04, n:4 + Math.floor(r() * 4), seed:Math.floor(r() * 1e6) });
  for (let i = 0; i < 2; i++) L.tire.push({ x:(r() - 0.5) * 3, y:r() * GROUND_TILE, len:r() * 10 + 8, a:r() * 0.05 + 0.05, bend:(r() - 0.5) * 0.8 });
  for (let i = 0; i < 0; i++) L.puddle.push({ x:(r() - 0.5) * ROAD_W * 0.75, y:r() * GROUND_TILE, blobs:Array.from({ length:5 }, () => [(r() - 0.5) * 0.6, (r() - 0.5) * 0.9, r() * 0.22 + 0.12, r() * 0.35 + 0.2]) });
  for (let i = 0; i < 900; i++) L.wear.push([r(), r(), r() * 0.05 + 0.015, r()]);
  return L;
})();
function drawGround(c, W, H, mode){
  const sx = W / ROAD_W, sy = H / GROUND_TILE, X = m => (m / ROAD_W + 0.5) * W, Y = m => m * sy;
  const wraps = fn => { for (const o of [-H, 0, H]) fn(o); };
  const col = (color, height, rough) => mode === 'color' ? color : mode === 'height' ? height : rough;
  c.fillStyle = col(P.ground, '#808080', '#E0E0E0'); c.fillRect(0, 0, W, H);
  if (mode === 'color') for (const b of GL.blotch) wraps(o => softBlob(c, X(b.x), Y(b.y) + o, b.rx * sx, b.ry * sy, b.dark ? P.ground2 : P.puff, b.a));
  if (mode === 'rough') for (const b of GL.blotch) wraps(o => softBlob(c, X(b.x), Y(b.y) + o, b.rx * sx, b.ry * sy, b.dark ? '#C8C8C8' : '#F0F0F0', b.a * 3));
  if (mode === 'height') grain(c, W, H, 26, 11, true);
  // tyre marks
  if (mode !== 'height') for (const t of GL.tire) for (const dx of [-0.85, 0.85]) wraps(o => {
    c.save(); c.globalAlpha = t.a * (mode === 'rough' ? 2.5 : 1); c.strokeStyle = col('#2A2622', '', '#B4B4B4'); c.lineWidth = 0.22 * sx; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(t.x + dx), Y(t.y) + o); c.quadraticCurveTo(X(t.x + dx + t.bend), Y(t.y + t.len / 2) + o, X(t.x + dx), Y(t.y + t.len) + o); c.stroke(); c.restore();
  });
  // oil stains
  if (mode !== 'height') for (const s of GL.oil){ const r = rng(s.seed); for (let k = 0; k < s.n; k++){ const ox = (r() - 0.5) * s.s * 1.6, oy = (r() - 0.5) * s.s * 1.6, rr2 = s.s * (r() * 0.6 + 0.5); wraps(o => softBlob(c, X(s.x + ox), Y(s.y + oy) + o, rr2 * sx * 0.8, rr2 * sy * 1.6, col('#2A241E', '', '#9A9A9A'), s.a * (mode === 'rough' ? 4 : 1))); } }
  // slab joints every four metres
  c.fillStyle = col('rgba(70,64,56,0.55)', '#303030', '#FFFFFF');
  for (let k = 0; k <= GROUND_TILE / 4; k++) c.fillRect(0, Y(k * 4) - Math.max(1, 0.012 * sy), W, Math.max(2, 0.024 * sy));
  // cracks
  c.lineJoin = c.lineCap = 'round'; c.strokeStyle = col('rgba(52,47,41,0.6)', '#484848', '#FFFFFF'); c.lineWidth = Math.max(1.2, 0.012 * sx);
  for (const pts of GL.crack) wraps(o => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y) + o) : c.moveTo(X(x), Y(y) + o)); c.stroke(); });
  // lane paint: 2.5 m dashes every 4 m, worn at the edges
  c.fillStyle = col(P.yellow, '#9A9A9A', '#8C8C8C');
  for (const lx of [-1.05, 1.05]) for (let k = 0; k < GROUND_TILE / 4; k++) c.fillRect(X(lx - 0.07), Y(k * 4 + 0.75), 0.14 * sx, 2.5 * sy);
  // hazard edges
  const ew = 0.28 * sx;
  for (const x0 of [0, W - ew]){
    c.save(); c.beginPath(); c.rect(x0, 0, ew, H); c.clip();
    c.fillStyle = col(P.yellow, '#9A9A9A', '#8C8C8C'); c.fillRect(x0, 0, ew, H);
    if (mode === 'color'){ c.fillStyle = P.outline; const step = 0.5 * sy; for (let y = -step; y < H + step; y += step){ c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + ew, y - step / 2); c.lineTo(x0 + ew, y); c.lineTo(x0, y + step / 2); c.closePath(); c.fill(); } }
    c.restore();
  }
  // wear: specks of bare concrete over the paint
  if (mode === 'color'){ c.fillStyle = P.ground; for (const [u, v, s, a] of GL.wear){ c.globalAlpha = 0.25 + a * 0.6; const x = u < 0.5 ? (u < 0.25 ? X(-1.05) : X(1.05)) + (a - 0.5) * 0.14 * sx : (u < 0.75 ? ew * a : W - ew * a); c.beginPath(); c.ellipse(x, v * H, s * sx * 0.6, s * sy * 1.4, 0, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; }
  // puddles last: dark and wet in colour, flat in height, mirror-smooth in roughness
  for (const p of GL.puddle) wraps(o => {
    c.save(); c.fillStyle = col('rgba(60,62,66,0.22)', '#7A7A7A', '#101010');
    for (const [bx, by, rx, ry] of p.blobs){ c.beginPath(); c.ellipse(X(p.x + bx), Y(p.y + by) + o, rx * sx, ry * sy * 1.6, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
  });
  if (mode === 'color') grain(c, W, H, 16, 5, false);
}
export function makeGroundTextures(){
  const [W, H] = GROUND_PX;
  const color = canvasTex(W, H, (c, w, h) => drawGround(c, w, h, 'color'));
  if (!TEX.groundN){
    const hc = mkCanvas(W, H); drawGround(hc.getContext('2d'), W, H, 'height');
    TEX.groundN = dataTex(normalFromHeight(hc, W / 300, false, true));
    const rc = mkCanvas(W, H); drawGround(rc.getContext('2d'), W, H, 'rough'); grain(rc.getContext('2d'), W, H, 30, 3, true);
    TEX.groundR = dataTex(rc);
  }
  TEX.ground = color;
  for (const t of [TEX.ground, TEX.groundN, TEX.groundR]){ t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, LOOP / GROUND_TILE); t.anisotropy = MAX_ANISO; }
}
// Gravel and packed soil outside the fence.
function drawDirt(c, W, H, mode){
  const r = rng(21);
  c.fillStyle = mode === 'color' ? P.ground2 : mode === 'height' ? '#707070' : '#F2F2F2'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++){ const x = r() * W, y = r() * H, s = r() * 60 + 30, dark = r() < 0.5, a = r() * 0.12 + 0.04; for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) if (mode === 'color') softBlob(c, x + ox, y + oy, s, s * 0.8, dark ? '#4A4035' : P.puff, a); }
  for (let i = 0; i < 2600; i++){
    const x = r() * W, y = r() * H, s = r() * r() * 5 + 1.2, t = r(), rot = r() * 3;
    for (const ox of (x < 8 ? [0, W] : x > W - 8 ? [0, -W] : [0])) for (const oy of (y < 8 ? [0, H] : y > H - 8 ? [0, -H] : [0])){
      c.beginPath(); c.ellipse(x + ox, y + oy, s, s * 0.75, rot, 0, Math.PI * 2);
      if (mode === 'color'){ c.fillStyle = t < 0.4 ? '#6B6258' : t < 0.75 ? '#9A9186' : t < 0.9 ? '#B8AFA2' : '#5A5047'; c.globalAlpha = 0.85; c.fill(); }
      else if (mode === 'height'){ const gr = c.createRadialGradient(x + ox - s * 0.2, y + oy - s * 0.2, 0, x + ox, y + oy, s); gr.addColorStop(0, '#E0E0E0'); gr.addColorStop(1, '#707070'); c.fillStyle = gr; c.fill(); }
      else { c.fillStyle = t < 0.9 ? '#C8C8C8' : '#909090'; c.fill(); }
    }
  }
  c.globalAlpha = 1;
  if (mode === 'color') grain(c, W, H, 18, 9, false);
}
export function makeDirtTextures(){
  const color = canvasTex(512, 512, (c, w, h) => drawDirt(c, w, h, 'color'));
  if (!TEX.dirtN){
    const hc = mkCanvas(512, 512); drawDirt(hc.getContext('2d'), 512, 512, 'height'); TEX.dirtN = dataTex(normalFromHeight(hc, 2.2, true, true));
    const rc = mkCanvas(512, 512); drawDirt(rc.getContext('2d'), 512, 512, 'rough'); TEX.dirtR = dataTex(rc);
  }
  TEX.dirt = color;
  for (const t of [TEX.dirt, TEX.dirtN, TEX.dirtR]){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220 / DIRT_TILE, (LOOP + 200) / DIRT_TILE); t.anisotropy = MAX_ANISO; }
  // The pit walls reuse the gravel, unscaled.
  for (const k of ['dirt', 'dirtN']){ const p = TEX[k + 'Pit'] = TEX[k].clone(); p.repeat.set(1, 1); p.needsUpdate = true; }
}
// Heras fence panel, 3 m by 2.05 m: galvanised tube frame and welded mesh. Transparent between the wires.
function drawFence(c, w, h){
  c.clearRect(0, 0, w, h);
  const pm = w / 3, tube = 0.045 * pm;
  c.strokeStyle = '#A9B0B5'; c.lineWidth = 2.2;
  for (let x = tube; x < w - tube; x += 0.1 * pm){ c.beginPath(); c.moveTo(x, tube); c.lineTo(x, h - tube); c.stroke(); }
  for (let y = tube + 0.06 * pm; y < h - tube; y += 0.25 * pm){ c.beginPath(); c.moveTo(tube, y); c.lineTo(w - tube, y); c.stroke(); }
  const tubeFill = (x, y, tw, th, vertical) => {
    const gr = vertical ? c.createLinearGradient(x, 0, x + tw, 0) : c.createLinearGradient(0, y, 0, y + th);
    gr.addColorStop(0, '#7E868C'); gr.addColorStop(0.35, '#E4E8EA'); gr.addColorStop(1, '#6A7278'); c.fillStyle = gr; c.fillRect(x, y, tw, th);
  };
  tubeFill(0, 0, tube, h, true); tubeFill(w - tube, 0, tube, h, true); tubeFill(0, 0, w, tube, false); tubeFill(0, h - tube, w, tube, false);
}
export function makeFenceTextures(){
  TEX.fence = canvasTex(512, 352, drawFence); TEX.fence.anisotropy = MAX_ANISO;
  // The shadow copy skips mipmaps so the mesh pattern stays crisp in the sun's shadow map.
  TEX.fenceShadow = canvasTex(512, 352, drawFence); TEX.fenceShadow.generateMipmaps = false; TEX.fenceShadow.minFilter = THREE.LinearFilter;
}
// Lattice for the tower cranes.
TEX.lattice = (() => {
  const t = canvasTex(64, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = '#FFFFFF'; c.lineWidth = 5; c.strokeRect(2.5, -4, w - 5, h + 8);
    c.lineWidth = 3; for (let y = 0; y < h; y += 64){ c.beginPath(); c.moveTo(2, y); c.lineTo(w - 2, y + 32); c.lineTo(2, y + 64); c.stroke(); }
  });
  t.wrapT = THREE.RepeatWrapping; return t;
})();
