// Building facade textures (colour, height and roughness), drawn procedurally.
import * as THREE from 'three';
import { canvasTex, dataTex } from './canvas.js';
import { gfxTier } from '../core/quality.js';
import { rng, mkCanvas, normalFromHeight, grain, softBlob } from './procedural.js';

/* facades: four by four bays per texture, each bay one floor high and 3.2 m wide.
   Each kind has a colour map, and each layout has a roughness map (glass is mirror-smooth) and a normal map (frames stand out, glass sits back). */
export const FAC = {}, FAC_DATA = {}, FAC_TILE = 12.8, FAC_PX = gfxTier === 'high' ? 512 : 256;
export const FAC_KINDS = {
  apt:{ lay:'win', wall:'#DCD5C6', frame:'#F4F2EC' }, aptGrey:{ lay:'win', wall:'#B9BDBF', frame:'#EDEDEA' }, brick:{ lay:'win', wall:'#9A5642', frame:'#EDE7DD', brick:true },
  glass:{ lay:'glass' }, tower:{ lay:'tower' },
  houseRed:{ lay:'house', wall:'#A63D2A' }, houseWhite:{ lay:'house', wall:'#E8E4D8' }, houseYellow:{ lay:'house', wall:'#D9AE50' }, houseBlue:{ lay:'house', wall:'#5C7A90' }
};
const CURTAINS = ['#C9B79C', '#8E9A7C', '#B5594A', '#E8E2D2', '#5B6B82', '#D9C27A'];
function drawFacade(k, c, mode){
  const K = FAC_KINDS[k], N = FAC_PX, t = N / 4, s = t / 128, r = rng(K.lay.length * 31 + 5);
  const C = (color, height, rough) => mode === 'color' ? color : mode === 'height' ? height : rough;
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (K.lay === 'glass' || K.lay === 'tower'){
    c.fillStyle = C('#253746', '#808080', '#1A1A1A'); c.fillRect(0, 0, N, N);
    const cols = K.lay === 'glass' ? 2 : 3;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4 * cols; i++){
      const x = i * t / cols, y = j * t, pw = t / cols, v = r();
      const g0 = K.lay === 'glass' ? ['#3C5A70', '#22374A'] : ['#4D6A82', '#2B4256'];
      if (mode === 'color'){ const gr = c.createLinearGradient(x, y, x + pw, y + t); gr.addColorStop(0, g0[0]); gr.addColorStop(1, g0[1]); c.fillStyle = gr; c.fillRect(x, y, pw, t); c.fillStyle = `rgba(${v < 0.5 ? '255,255,255' : '0,0,0'},${(Math.abs(v - 0.5) * 0.12).toFixed(3)})`; c.fillRect(x, y, pw, t); }
      else if (mode === 'rough'){ const g = Math.round(8 + v * 26); c.fillStyle = `rgb(${g},${g},${g})`; c.fillRect(x, y, pw, t); }
      else { c.fillStyle = '#5A5A5A'; c.fillRect(x, y, pw, t); }
      // spandrel band at the floor edge
      const sh = (K.lay === 'glass' ? 24 : 16) * s;
      c.fillStyle = C(K.lay === 'glass' ? '#55687A' : '#3A4C5C', '#8A8A8A', '#606060'); c.fillRect(x, y + t - sh, pw, sh);
      c.fillStyle = C(K.lay === 'glass' ? '#3E4F5C' : '#A9BCC9', '#C8C8C8', '#707070');
      c.fillRect(x, y, Math.max(2, 3 * s), t); c.fillRect(x, y + t - sh - 2 * s, pw, Math.max(2, 3 * s));
    }
    return;
  }
  c.fillStyle = C(K.wall, '#808080', '#E6E6E6'); c.fillRect(0, 0, N, N);
  if (mode === 'color'){ const rb = rng(77); for (let i = 0; i < 30; i++) softBlob(c, rb() * N, rb() * N, rb() * N * 0.2 + 10, rb() * N * 0.2 + 10, rb() < 0.5 ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)', 0.04); }
  if (K.lay === 'house'){
    c.strokeStyle = C('rgba(0,0,0,0.16)', '#404040', '#F0F0F0'); c.lineWidth = Math.max(1, 2 * s);
    for (let x = 0; x < N; x += 10 * s){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, N); c.stroke(); }
  }
  if (K.brick){ c.strokeStyle = C('rgba(230,220,205,0.35)', '#505050', '#F8F8F8'); c.lineWidth = Math.max(1, 1.2 * s); for (let y = 0; y < N; y += 6 * s){ c.beginPath(); c.moveTo(0, y); c.lineTo(N, y); c.stroke(); for (let x = ((y / (6 * s)) % 2) * 9 * s; x < N; x += 18 * s){ c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 6 * s); c.stroke(); } } }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++){
    c.setTransform(s, 0, 0, s, i * t, j * t);
    const v = r(), v2 = r(), house = K.lay === 'house';
    const fx = house ? 36 : 26, fy = house ? 30 : 26, fw = house ? 56 : 76, fh = house ? 66 : 76;
    // rain streaks under the sill
    if (mode === 'color'){ const gr = c.createLinearGradient(0, fy + fh, 0, 128); gr.addColorStop(0, 'rgba(40,35,30,0.18)'); gr.addColorStop(1, 'rgba(40,35,30,0)'); c.fillStyle = gr; c.fillRect(fx + 4, fy + fh, fw - 8, 128 - fy - fh); }
    c.fillStyle = C(K.frame || '#F4F2EC', '#B0B0B0', '#707070'); c.fillRect(fx, fy, fw, fh);
    const gx = fx + 5, gy = fy + 5, gw = fw - 10, gh = fh - 10;
    if (mode === 'color'){
      const gr = c.createLinearGradient(gx, gy, gx + gw * 0.6, gy + gh); gr.addColorStop(0, '#3A5163'); gr.addColorStop(1, '#1D2A35'); c.fillStyle = gr; c.fillRect(gx, gy, gw, gh);
      if (v < 0.35){ c.fillStyle = CURTAINS[Math.floor(v2 * CURTAINS.length)]; c.globalAlpha = 0.55; c.fillRect(gx, gy, gw * 0.28, gh); c.fillRect(gx + gw * 0.72, gy, gw * 0.28, gh); c.globalAlpha = 1; }
      else if (v < 0.55){ c.fillStyle = 'rgba(225,220,205,0.45)'; for (let y = gy; y < gy + gh * (0.3 + v2 * 0.6); y += 4) c.fillRect(gx, y, gw, 2.4); }
      else if (v < 0.62){ c.fillStyle = 'rgba(255,214,150,0.35)'; c.fillRect(gx, gy, gw, gh); }
    } else { c.fillStyle = C('', '#4C4C4C', v < 0.55 ? '#0E0E0E' : '#141414'); c.fillRect(gx, gy, gw, gh); }
    c.fillStyle = C(K.frame || '#F4F2EC', '#B0B0B0', '#707070'); c.fillRect(fx + fw / 2 - 2, gy, 4, gh); if (house) c.fillRect(gx, fy + fh * 0.42, gw, 4);
    c.fillStyle = C('#E2DED6', '#D8D8D8', '#808080'); c.fillRect(fx - 4, fy + fh, fw + 8, 6);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (mode === 'color') grain(c, N, N, 8, 13, false);
}
function makeFacades(){
  for (const k in FAC_KINDS){
    const lay = FAC_KINDS[k].lay;
    FAC[k] = canvasTex(FAC_PX, FAC_PX, (c) => drawFacade(k, c, 'color')); FAC[k].wrapS = FAC[k].wrapT = THREE.RepeatWrapping;
    if (!FAC_DATA[lay]){
      const hc = mkCanvas(FAC_PX, FAC_PX); drawFacade(k, hc.getContext('2d'), 'height');
      const rc = mkCanvas(FAC_PX, FAC_PX); drawFacade(k, rc.getContext('2d'), 'rough');
      FAC_DATA[lay] = { n:dataTex(normalFromHeight(hc, FAC_PX / 90, true, true)), r:dataTex(rc) };
      for (const t of [FAC_DATA[lay].n, FAC_DATA[lay].r]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
  }
}
makeFacades();
