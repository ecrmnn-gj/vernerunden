// Canvas-backed textures: generic canvas textures, signs and text labels.
import * as THREE from 'three';
import { FONT_C } from '../core/utils.js';
import { P } from '../core/palette.js';

export function rr(c, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export function canvasTex(w, h, draw){
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.drawFn = draw;
  return t;
}
// Non-colour data (normal and roughness maps) must stay linear.
export function dataTex(cv){ const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t; }
export function repaint(t){ const cv = t.image, c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); t.drawFn(c, cv.width, cv.height); t.needsUpdate = true; }
export function signTex(w, h, bg, fg, lines, size, border){
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (border){ c.strokeStyle = border; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); }
    c.fillStyle = fg; c.font = `800 ${size}px ${FONT_C}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.08));
  });
}
export function labelSprite(text, opts = {}){
  const size = opts.size || 44, padX = 18;
  const meas = document.createElement('canvas').getContext('2d'); meas.font = `italic 800 ${size}px ${FONT_C}`;
  const w = Math.ceil(meas.measureText(text).width + padX * 2), h = Math.ceil(size * 1.5);
  const tex = canvasTex(w, h, (c) => {
    c.font = `italic 800 ${size}px ${FONT_C}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (opts.bubble){ c.fillStyle = P.paper; c.strokeStyle = P.outline; c.lineWidth = 5; rr(c, 4, 4, w - 8, h - 8, 18); c.fill(); c.stroke(); c.fillStyle = P.outline; c.fillText(text, w / 2, h / 2 + 2); }
    else { c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = P.outline; c.strokeText(text, w / 2, h / 2); c.fillStyle = P.halo; c.fillText(text, w / 2, h / 2); }
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false, fog:false }));
  const hh = opts.height || 0.34; sp.scale.set(hh * w / h, hh, 1);
  return sp;
}
