// Canvas textures for the generated figure, made on the main thread and cached: eyes, a tileable surface-detail
// texture, the VERNEOMBUD back print, the chest logo and the helmet sticker.
import * as THREE from 'three';
import { canvasTex, dataTex, repaint } from '../../textures/canvas.js';
import { FONT_C } from '../../core/utils.js';
import { mulberry32, valueNoise3 } from './gen/rng.js';

const safe = make => { try { return make(); } catch (e){ return null; } }; // no canvas (tests): no texture
// The Grønn Jobb logo image lives with the sign textures, which paint themselves on import; load it lazily so the
// figure code also runs where there is no canvas (tests). Prints are repainted once it arrives.
let logoImg = null;
import('../../textures/signs.js').then(m => {
  logoImg = m.logoImg;
  if (logoImg.complete) repaintPrints(); else logoImg.addEventListener('load', repaintPrints);
}, () => {});

const irisCache = new Map();
// An eyeball texture for a sphere whose top pole faces forward: pupil, iris with radial fibres and a dark limbal
// ring, then the white. Rows run from the front pole (top) to the back; columns go round the eye.
export function irisTexture(hex){
  if (irisCache.has(hex)) return irisCache.get(hex);
  const tex = safe(() => canvasTex(128, 256, (c, w, h) => {
    const base = new THREE.Color(hex), rnd = mulberry32(7), fib = Array.from({ length:w }, () => 0.75 + rnd() * 0.5);
    const img = c.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++){
      const th = y / h * Math.PI;
      for (let x = 0; x < w; x++){
        let r, g, b;
        if (th < 0.2){ r = g = b = 14; }
        else if (th < 0.56){
          // iris: darker towards the pupil and at the rim, with fibres
          const t = (th - 0.2) / 0.36, k = fib[x] * (0.75 + 0.45 * Math.sin(t * Math.PI)) * (t > 0.86 ? 0.45 : 1);
          r = base.r * 255 * k; g = base.g * 255 * k; b = base.b * 255 * k;
        } else { const k = th > 1.4 ? 0.9 : 1; r = 244 * k; g = 238 * k; b = 232 * k; }
        const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  }));
  irisCache.set(hex, tex);
  return tex;
}

// Tileable surface detail, one kind per channel, centred on 0.5: R a woven fabric, G fine skin variation, B hair
// strands running along v, A scuffs. Sampled triplanar by the figure's materials.
let detail;
export function detailTexture(){
  if (detail !== undefined) return detail;
  detail = safe(() => {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d'), img = c.createImageData(N, N), d = img.data, n1 = valueNoise3(31), n2 = valueNoise3(32);
    // tileable noise: sample on a torus
    const tile = (n, x, y, f) => { const a = x / N * Math.PI * 2, b = y / N * Math.PI * 2; return n(Math.cos(a) * f, Math.sin(a) * f, Math.cos(b) * f + Math.sin(b) * f * 0.7 + Math.sin(b) * 3.1); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
      const i = (y * N + x) * 4;
      // twill: diagonal ribs with a little noise
      const weave = 0.5 + 0.28 * Math.sin((x + y) * Math.PI * 2 / 8) * Math.sin(x * Math.PI * 2 / 4) + 0.12 * tile(n1, x, y, 6);
      const skin = 0.5 + 0.3 * tile(n1, x, y, 3) + 0.15 * tile(n2, x, y, 12);
      const strand = 0.5 + 0.35 * Math.sin(x * Math.PI * 2 / 6 + 2.5 * tile(n2, x, y, 2)) * (0.6 + 0.4 * tile(n1, x, y, 4));
      const scuff = 0.5 + 0.45 * Math.max(-1, Math.min(1, tile(n2, x, y, 5) * 1.6));
      d[i] = clamp255(weave); d[i + 1] = clamp255(skin); d[i + 2] = clamp255(strand); d[i + 3] = clamp255(scuff);
    }
    c.putImageData(img, 0, 0);
    const t = dataTex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.premultiplyAlpha = false;
    return t;
  });
  return detail;
}
const clamp255 = v => Math.max(0, Math.min(255, Math.round(v * 255)));

// White prints (only the alpha is used): the back text and the chest logo. Repainted when fonts or the logo load.
const prints = [];
export function backPrintTexture(text){
  let t = prints.find(p => p.text === text);
  if (t) return t.tex;
  const tex = safe(() => canvasTex(512, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    let fs = 78; c.font = `800 ${fs}px ${FONT_C}`;
    const tw = c.measureText(text).width; if (tw > w - 12){ fs = Math.floor(fs * (w - 12) / tw); c.font = `800 ${fs}px ${FONT_C}`; }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 3);
  }));
  prints.push({ text, tex });
  return tex;
}
export function logoTexture(){
  let t = prints.find(p => p.text === '#logo');
  if (t) return t.tex;
  const tex = safe(() => canvasTex(256, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    if (!logoImg || !logoImg.complete || !logoImg.naturalWidth) return;
    // the logo as a white silhouette, fitted to the canvas
    const s = Math.min(w / logoImg.naturalWidth, h / logoImg.naturalHeight), lw = logoImg.naturalWidth * s, lh = logoImg.naturalHeight * s;
    c.drawImage(logoImg, (w - lw) / 2, (h - lh) / 2, lw, lh);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
  }));
  prints.push({ text:'#logo', tex });
  return tex;
}
// The helmet sticker: the logo in its own colours on a white rounded label.
let sticker;
export function stickerTexture(){
  if (sticker !== undefined) return sticker;
  sticker = safe(() => canvasTex(256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#F4F4F0'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 26); c.fill();
    if (logoImg && logoImg.complete && logoImg.naturalWidth){
      const s = Math.min((w - 40) / logoImg.naturalWidth, (h - 34) / logoImg.naturalHeight), lw = logoImg.naturalWidth * s, lh = logoImg.naturalHeight * s;
      c.drawImage(logoImg, (w - lw) / 2, (h - lh) / 2, lw, lh);
    }
  }));
  if (sticker) prints.push({ text:'#sticker', tex:sticker });
  return sticker;
}
// Fonts and the logo image arrive after the first paint.
export function repaintPrints(){ for (const p of prints) if (p.tex) repaint(p.tex); }
