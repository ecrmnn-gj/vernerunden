import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
window.__vr3d = true;
(() => {
'use strict';
const $ = id => document.getElementById(id);
const stage = $('stage'), canvas = $('game');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT_C = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nf = new Intl.NumberFormat('nb-NO');
const fmtM = v => nf.format(Math.floor(v)) + ' m';
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- Palette ---------- */
let P = {};
const TOKENS = ['sky1','sky2','fog','sun','sun-light','sun-i','hemi-sky','hemi-ground','hemi-i','star','ground','ground2','frame','far','sil','lamp','beam-a',
  'outline','halo','steel','wood','puff','paper','green','green-ink','green-dark','yellow','orange','red','blue','gold','npc','suit','dust','hud-bg','hud-ink'];
function readPalette(){
  const cs = getComputedStyle(document.documentElement);
  P = {};
  for (const t of TOKENS) P[t.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cs.getPropertyValue('--' + t).trim();
}
readPalette();

/* ---------- 2D drawing helpers (icons, textures) ---------- */
function rr(c, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function badge(c, fill){ c.beginPath(); c.arc(20, 20, 18, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.lineWidth = 2.5; c.strokeStyle = P.outline; c.stroke(); }
function drawIcon(c, k){
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (k === 'lukk'){ badge(c, P.green); c.strokeStyle = P.greenInk; c.lineWidth = 4; c.beginPath(); c.moveTo(12, 21); c.lineTo(18, 27); c.lineTo(29, 14); c.stroke(); }
  else if (k === 'briller'){ badge(c, P.paper); c.strokeStyle = P.outline; c.lineWidth = 2; c.beginPath(); c.moveTo(3, 19); c.lineTo(37, 19); c.stroke(); c.fillStyle = P.blue; c.globalAlpha = 0.35; rr(c, 7, 13, 26, 13, 6); c.fill(); c.globalAlpha = 1; rr(c, 7, 13, 26, 13, 6); c.stroke(); c.beginPath(); c.moveTo(20, 14); c.lineTo(20, 25); c.stroke(); }
  else if (k === 'ore'){ badge(c, P.yellow); c.strokeStyle = P.outline; c.lineWidth = 3; c.beginPath(); c.arc(20, 22, 10, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.fillStyle = P.red; c.lineWidth = 2; rr(c, 6, 18, 7, 12, 3); c.fill(); c.stroke(); rr(c, 27, 18, 7, 12, 3); c.fill(); c.stroke(); }
  else if (k === 'kurs'){ badge(c, P.blue); c.fillStyle = P.paper; c.strokeStyle = P.outline; c.lineWidth = 1.8; rr(c, 10, 11, 20, 15, 2); c.fill(); c.stroke(); c.strokeStyle = P.npc; c.lineWidth = 1.6; c.beginPath(); c.moveTo(14, 16); c.lineTo(26, 16); c.moveTo(14, 20); c.lineTo(22, 20); c.stroke(); c.fillStyle = P.gold; c.beginPath(); c.arc(26, 26, 4.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = P.outline; c.lineWidth = 1.2; c.stroke(); }
  else if (k === 'app' || k === 'rival'){ c.translate(20, 20); c.rotate(k === 'app' ? -0.14 : 0.12); c.fillStyle = P.outline; rr(c, -11, -18, 22, 36, 5); c.fill(); c.fillStyle = k === 'app' ? P.green : P.npc; rr(c, -8, -14, 16, 26, 2); c.fill(); c.strokeStyle = k === 'app' ? P.greenInk : P.outline; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 2); c.moveTo(-4, -2); c.lineTo(0, 2); c.lineTo(4, -2); c.moveTo(-5, 7); c.lineTo(5, 7); c.stroke(); }
  else if (k === 'hindring'){ c.fillStyle = '#5E7F66'; c.strokeStyle = P.outline; c.lineWidth = 1.5; rr(c, 2, 25, 21, 11, 5); c.fill(); c.stroke(); c.fillStyle = P.red; c.fillRect(13, 25, 4, 11); c.fillStyle = P.outline; c.fillRect(0, 28, 3, 5); c.fillRect(24, 34, 15, 3); c.fillStyle = P.orange; c.beginPath(); c.moveTo(26, 34); c.lineTo(37, 34); c.lineTo(33, 14); c.lineTo(30, 14); c.closePath(); c.fill(); c.stroke(); c.fillStyle = P.paper; c.fillRect(28, 24, 7, 3); }
  else if (k === 'barn'){ c.strokeStyle = '#2E3747'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(14, 26); c.lineTo(9, 37); c.moveTo(14, 26); c.lineTo(20, 36); c.stroke(); c.fillStyle = '#E8443A'; rr(c, 9, 14, 10, 13, 3); c.fill(); c.fillStyle = '#C99A76'; c.beginPath(); c.arc(14, 10, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4E3220'; c.beginPath(); c.arc(14, 8.5, 4.6, Math.PI, 0); c.fill(); c.fillStyle = '#F7F7F5'; c.strokeStyle = P.outline; c.lineWidth = 1.5; c.beginPath(); c.arc(31, 33, 5.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = P.outline; c.beginPath(); c.arc(31, 33, 2, 0, Math.PI * 2); c.fill(); }
  else if (k === 'kappsag'){ c.fillStyle = '#9C9890'; c.strokeStyle = P.outline; c.lineWidth = 1.5; c.fillRect(2, 24, 36, 5); c.strokeRect(2, 24, 36, 5); c.fillStyle = P.wood; c.fillRect(5, 29, 3, 9); c.fillRect(32, 29, 3, 9); c.fillStyle = P.orange; rr(c, 15, 11, 10, 13, 2); c.fill(); c.fillStyle = '#F2F2EE'; c.beginPath(); c.arc(20, 8, 4.5, Math.PI, 0); c.fill(); c.fillStyle = '#B9BEC2'; c.beginPath(); c.arc(28, 22, 4, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = 'rgba(160,145,125,0.55)'; c.beginPath(); c.arc(33, 15, 6, 0, Math.PI * 2); c.fill(); }
  else if (k === 'skilt'){ c.fillStyle = P.steel; c.fillRect(11, 26, 3, 12); c.fillRect(26, 26, 3, 12); c.fillStyle = P.yellow; c.strokeStyle = P.outline; c.lineWidth = 2; c.fillRect(5, 4, 30, 24); c.strokeRect(5, 4, 30, 24); c.fillStyle = P.red; c.fillRect(7, 6, 26, 4); c.fillStyle = P.outline; c.font = `900 8px ${FONT_C}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SE DEG', 20, 15); c.fillText('FOR', 20, 23); }
  else if (k === 'laerling'){ c.strokeStyle = '#3B3F45'; c.lineWidth = 4; c.beginPath(); c.moveTo(18, 27); c.lineTo(14, 38); c.moveTo(18, 27); c.lineTo(23, 38); c.stroke(); c.fillStyle = '#F4D21F'; rr(c, 13, 13, 11, 15, 3); c.fill(); c.fillStyle = '#C99A76'; c.beginPath(); c.arc(18, 9, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2F6FB5'; c.beginPath(); c.arc(18, 7.5, 5, Math.PI, 0); c.fill(); c.strokeStyle = '#5A4A3E'; c.lineWidth = 3; c.beginPath(); c.moveTo(23, 16); c.lineTo(28, 20); c.lineTo(26, 13); c.stroke(); c.fillStyle = P.outline; c.fillRect(24, 8, 5, 8); c.fillStyle = '#7FC4FF'; c.fillRect(25, 9, 3, 6); }
  else if (k === 'bil'){ c.fillStyle = P.paper; c.strokeStyle = P.outline; c.lineWidth = 1.5; c.beginPath(); c.moveTo(3, 30); c.lineTo(3, 18); c.lineTo(10, 18); c.lineTo(14, 10); c.lineTo(37, 10); c.lineTo(37, 30); c.closePath(); c.fill(); c.stroke(); c.fillStyle = P.blue; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(11, 18); c.lineTo(15, 12); c.lineTo(20, 12); c.lineTo(20, 18); c.closePath(); c.fill(); c.globalAlpha = 1; c.fillStyle = P.green; c.fillRect(21, 21, 16, 3); c.fillStyle = P.outline; c.beginPath(); c.arc(11, 31, 4, 0, Math.PI * 2); c.arc(30, 31, 4, 0, Math.PI * 2); c.fill(); }
  else if (k === 'stillas'){ c.strokeStyle = P.steel; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 38); c.lineTo(6, 6); c.moveTo(34, 38); c.lineTo(34, 6); c.stroke(); c.fillStyle = P.wood; c.strokeStyle = P.outline; c.lineWidth = 1.5; c.fillRect(2, 14, 36, 6); c.strokeRect(2, 14, 36, 6); c.strokeStyle = P.green; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 24); c.lineTo(20, 35); c.moveTo(15, 30); c.lineTo(20, 35); c.lineTo(25, 30); c.stroke(); }
  else if (k === 'grop'){ c.fillStyle = P.ground; c.fillRect(0, 22, 14, 18); c.fillRect(26, 18, 14, 22); c.fillStyle = P.yellow; c.fillRect(0, 19, 14, 4); c.fillRect(26, 15, 14, 4); c.fillStyle = P.outline; c.fillRect(14, 22, 12, 18); }
  else if (k === 'tilsyn'){ c.strokeStyle = P.suit; c.lineWidth = 4; c.beginPath(); c.moveTo(21, 15); c.lineTo(21, 28); c.moveTo(21, 28); c.lineTo(15, 38); c.moveTo(21, 28); c.lineTo(28, 38); c.stroke(); c.fillStyle = P.suit; c.beginPath(); c.arc(21, 9, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = P.red; c.strokeStyle = P.outline; c.lineWidth = 1.5; rr(c, 6, 15, 11, 15, 1.5); c.fill(); c.stroke(); c.fillStyle = P.paper; c.fillRect(8, 19, 7, 4); }
  c.restore();
}
function drawIconCanvases(){
  document.querySelectorAll('canvas[data-icon]').forEach(cv => {
    const r = window.devicePixelRatio || 1; cv.width = 40 * r; cv.height = 40 * r;
    const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, 40, 40); drawIcon(c, cv.dataset.icon);
  });
}
function canvasTex(w, h, draw){
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.drawFn = draw;
  return t;
}
// Non-colour data (normal and roughness maps) must stay linear.
function dataTex(cv){ const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t; }
function repaint(t){ const cv = t.image, c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); t.drawFn(c, cv.width, cv.height); t.needsUpdate = true; }
function signTex(w, h, bg, fg, lines, size, border){
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (border){ c.strokeStyle = border; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); }
    c.fillStyle = fg; c.font = `800 ${size}px ${FONT_C}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.08));
  });
}
function labelSprite(text, opts = {}){
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

/* ---------- Audio ---------- */
let actx = null, master = null, noiseBuf = null, soundOn = store.get('vr3d:sound', true);
function ensureAudio(){
  if (!actx){
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = 0.55; master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.5), actx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
}
function tone(freq, dur, type, vol, slideTo, at){
  if (!soundOn || !actx) return;
  const t = at || actx.currentTime, o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noiseHit(t, dur, type, freq, vol){
  if (!soundOn || !actx) return;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const gn = actx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(gn).connect(master); s.start(t); s.stop(t + dur + 0.02);
}
function kick(t){ const o = actx.createOscillator(), gn = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); gn.gain.setValueAtTime(0.6, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); o.connect(gn).connect(master); o.start(t); o.stop(t + 0.26); }
function bass(t, f, dur){ const o = actx.createOscillator(), fl = actx.createBiquadFilter(), gn = actx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); fl.type = 'lowpass'; fl.frequency.value = 480; gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.14, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(fl).connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.02); }
const BASS = { 0:55, 3:55, 6:65.41, 8:55, 10:55, 11:73.42, 14:49 };
const music = { on:false, next:0, step:0 };
function startMusic(){ if (!soundOn || !actx) return; music.on = true; music.next = actx.currentTime + 0.06; music.step = 0; }
function stopMusic(){ music.on = false; }
setInterval(() => {
  if (!music.on || !actx || !soundOn) return;
  const intensity = g ? clamp((g.speed - 10) / 12, 0, 1.6) : 0;
  const sd = 60 / (128 + intensity * 40) / 4;
  while (music.next < actx.currentTime + 0.12){
    const t = music.next, s = music.step % 16;
    if (s % 4 === 0) kick(t);
    if (s % 4 === 2) noiseHit(t, 0.05, 'highpass', 7000, 0.12);
    else if (s % 2 === 1 && intensity > 0.3) noiseHit(t, 0.025, 'highpass', 9000, 0.05);
    if (s === 4 || s === 12) noiseHit(t, 0.14, 'bandpass', 1800, 0.22);
    if (BASS[s]) bass(t, g && g.tail.length >= 4 ? BASS[s] * 1.06 : BASS[s], sd * 1.6);
    music.next += sd; music.step++;
  }
}, 25);
const sfxPickup = () => tone(760, 0.12, 'sine', 0.14, 1320);
const sfxClose = () => { tone(660, 0.1, 'sine', 0.14, 990); setTimeout(() => tone(990, 0.14, 'sine', 0.14, 1320), 90); };
const sfxHit = () => { tone(170, 0.3, 'triangle', 0.3, 50); if (actx) noiseHit(actx.currentTime, 0.18, 'lowpass', 900, 0.35); };
const sfxJump = () => tone(320, 0.16, 'square', 0.04, 640);
const sfxSwish = () => { if (actx) noiseHit(actx.currentTime, 0.12, 'bandpass', 2400, 0.08); };
const sfxBeep = hi => tone(hi ? 880 : 440, hi ? 0.3 : 0.14, 'square', 0.08);
const sfxMult = () => { tone(520, 0.08, 'square', 0.07); setTimeout(() => tone(780, 0.12, 'square', 0.07), 70); };
const sfxJack = () => tone(70 + Math.random() * 30, 0.05, 'sawtooth', 0.06);
function note(freq, t, dur, type, vol, attack){
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + (attack || 0.02)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function sfxCheer(){
  if (!soundOn || !actx) return;
  const t0 = actx.currentTime + 0.02;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(master);
  const run = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
  run.forEach((f, i) => {
    const o = actx.createOscillator(), gn = actx.createGain(), t = t0 + i * 0.045;
    o.type = 'square'; o.frequency.setValueAtTime(f, t);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.045, t + 0.005); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(gn).connect(lp); o.start(t); o.stop(t + 0.15);
  });
  const tb = t0 + run.length * 0.045 + 0.02;
  for (const [ratio, vol, dur] of [[1, 0.13, 1.4], [2.76, 0.04, 0.8], [5.4, 0.02, 0.5]]) note(1046.5 * ratio, tb, dur, 'sine', vol, 0.004);
  note(1568, tb + 0.12, 1.1, 'sine', 0.07, 0.004);
}
function sfxWhoosh(){
  if (!soundOn || !actx) return;
  const t = actx.currentTime + 0.02;
  const o = actx.createOscillator(), gn = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.45);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.1, t + 0.05); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(gn).connect(master); o.start(t); o.stop(t + 0.6);
  for (const f of [392, 493.88, 587.33, 783.99]) note(f, t + 0.42, 0.7, 'triangle', 0.07, 0.02);
}
function sfxHonk(){ if (!soundOn || !actx) return; const t = actx.currentTime; [0, 0.2].forEach(d => { tone(370, 0.14, 'square', 0.07, null, t + d); tone(466, 0.14, 'square', 0.05, null, t + d); }); }
function sfxWhistle(){ if (!soundOn || !actx) return; const t = actx.currentTime; [0, 0.24].forEach(d => { tone(2300, 0.18, 'sine', 0.1, 2050, t + d); tone(2420, 0.18, 'sine', 0.05, 2150, t + d); }); }
function sfxSad(){ if (!soundOn || !actx) return; const t = actx.currentTime; [392, 370, 349.2].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, f * 0.97, t + i * 0.32)); tone(330, 0.9, 'triangle', 0.16, 300, t + 0.96); }
const soundBtn = $('soundBtn');
function syncSoundBtn(){ soundBtn.textContent = soundOn ? 'Lyd og musikk på' : 'Lyd og musikk av'; soundBtn.setAttribute('aria-pressed', String(soundOn)); }
soundBtn.addEventListener('click', () => { soundOn = !soundOn; store.set('vr3d:sound', soundOn); syncSoundBtn(); if (soundOn){ ensureAudio(); if (state === 'playing') startMusic(); } else stopMusic(); });
syncSoundBtn();

/* ---------- Graphics quality ---------- */
// auto picks a tier from the device and steps down if the frame rate drops. The choice is remembered per device.
const GFX_TIERS = {
  high:   { dpr:2,    post:true,  msaa:4, shadow:[2048, 4096], fx:1 },
  medium: { dpr:1.5,  post:true,  msaa:2, shadow:[1024, 2048], fx:0.7 },
  low:    { dpr:1,    post:false, msaa:0, shadow:[1024, 2048], fx:0.4 }
};
const GFX_LABEL = { auto:'auto', high:'høy', medium:'middels', low:'lav' };
const coarse = matchMedia('(pointer: coarse)').matches;
let gfxPref = store.get('vr3d:gfx', 'auto'); if (!GFX_LABEL[gfxPref]) gfxPref = 'auto';
let gfxTier = gfxPref === 'auto' ? (coarse ? 'medium' : 'high') : gfxPref;
const Q = () => GFX_TIERS[gfxTier];

/* ---------- Three.js scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance', stencil:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().dpr));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Neutral tone mapping keeps the brand green and the hazard yellow true to their hex values.
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 650);
const FOG = { near:30, far:128 };
scene.fog = new THREE.Fog(0xffffff, FOG.near, FOG.far);
// Light intensities in the palette are in the old (legacy) units. Physically based lighting needs them times pi.
const LIGHT_K = Math.PI;
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); scene.add(hemi);
// Late-morning sun from behind and to the right: it lights the faces the player runs towards and throws shadows forward-left.
const SUN_DIR = new THREE.Vector3(0.6, 0.62, 0.5).normalize();
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.camera.up.set(0, 0, -1); // align the shadow map with the track so its texels are spent along the road
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035;
scene.add(sun); scene.add(sun.target);
const SHADOW_Z = [-64, 10]; // the stretch of track the shadow map covers, from far ahead to just behind the camera
function fitShadow(){
  const [sw, sh] = Q().shadow;
  if (sun.shadow.mapSize.x !== sw || sun.shadow.mapSize.y !== sh){ sun.shadow.mapSize.set(sw, sh); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } }
  const tgt = new THREE.Vector3(0, 0, -22);
  sun.target.position.copy(tgt); sun.position.copy(SUN_DIR).multiplyScalar(80).add(tgt);
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  // Cover the track from just behind the camera to 64 m ahead, including tall props beside the road.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity; const v = new THREE.Vector3();
  for (const x of [-9, 9]) for (const y of [0, 9]) for (const z of SHADOW_Z){ v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  Object.assign(cam, { left:x0, right:x1, bottom:y0, top:y1, near:Math.max(0.5, -z1 - 60), far:-z0 + 4 }); cam.updateProjectionMatrix();
}
fitShadow();

/* ---------- Sky: gradient, sun and drifting clouds in one shader. It also lights the scene through an environment map. ---------- */
const NOISE_GLSL = `
float hash2(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 17.17; a *= 0.5; } return v; }`;
const skyU = {
  uZenith:{ value:new THREE.Color() }, uMid:{ value:new THREE.Color() }, uHorizon:{ value:new THREE.Color() }, uGround:{ value:new THREE.Color() },
  uSunColor:{ value:new THREE.Color() }, uSunDir:{ value:SUN_DIR }, uView:{ value:new THREE.Vector3(0, 0.12, -1).normalize() },
  uCloud:{ value:new THREE.Vector2() }, uEnv:{ value:0 }
};
const skyMat = new THREE.ShaderMaterial({
  uniforms:skyU, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader:`
uniform vec3 uZenith, uMid, uHorizon, uGround, uSunColor, uSunDir, uView; uniform vec2 uCloud; uniform float uEnv;
varying vec3 vDir;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.16, h));
  sky = mix(sky, uZenith, smoothstep(0.1, 0.75, h));
  float sd = max(dot(d, uSunDir), 0.0);
  sky += uSunColor * (pow(sd, 5.0) * 0.18 + pow(sd, 48.0) * 0.45);
  if (h > 0.0){
    // clouds live on a plane far overhead; uCloud slides them as the player moves forward
    vec2 cp = d.xz / (h + 0.09) * 0.9 + uCloud;
    float c = fbm(cp * 1.1);
    float cov = smoothstep(0.5, 0.78, c) * smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.55, 0.95, h) * 0.6);
    float lit = clamp(0.62 + (c - fbm(cp * 1.1 + uSunDir.xz * 0.12)) * 3.2, 0.0, 1.0);
    vec3 cloud = mix(mix(uHorizon, uMid, 0.35) * 0.82, vec3(1.08, 1.06, 1.02), lit);
    cloud += uSunColor * pow(sd, 6.0) * 0.6 * lit;
    sky = mix(sky, cloud, cov * 0.92);
  }
  if (uEnv < 0.5) sky += uSunColor * smoothstep(0.99935, 0.99965, sd) * 40.0;
  else sky = mix(sky, uGround, smoothstep(0.0, -0.18, h));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(390, 48, 24), skyMat);
skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function buildEnvironment(){
  const envScene = new THREE.Scene(), m = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMat);
  envScene.add(m); skyU.uEnv.value = 1;
  const rt = pmrem.fromScene(envScene, 0.02, 0.1, 200);
  skyU.uEnv.value = 0; m.geometry.dispose();
  if (envRT) envRT.dispose(); envRT = rt;
  scene.environment = rt.texture; scene.environmentIntensity = 1.0;
}

/* ---------- Post-processing: HDR target, bloom, lens and grade ---------- */
const FSQ = new THREE.Mesh(new THREE.BufferGeometry(), null); FSQ.frustumCulled = false;
FSQ.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
FSQ.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
const FSQ_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
function fsMat(fragmentShader, uniforms, extra){ return new THREE.ShaderMaterial(Object.assign({ uniforms, vertexShader:FS_VERT, fragmentShader, depthTest:false, depthWrite:false, toneMapped:false }, extra || {})); }
function fsDraw(material, target){ FSQ.material = material; renderer.setRenderTarget(target); renderer.render(FSQ, FSQ_CAM); }
const post = {
  on:false, rt:null, mips:[], w:1, h:1, hdr:THREE.HalfFloatType,
  bloom:0.55, aberr:0, zoom:0, vignette:0.32,
  pre:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
    vec3 tap(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
    float w(vec3 c){ return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
    void main(){
      vec3 a = tap(vec2(-1.0, -1.0)), b = tap(vec2(1.0, -1.0)), c = tap(vec2(-1.0, 1.0)), d = tap(vec2(1.0, 1.0));
      float wa = w(a), wb = w(b), wc = w(c), wd = w(d);
      vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
      float br = max(col.r, max(col.g, col.b)), knee = uThreshold * 0.5;
      float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-4);
      col *= max(soft, br - uThreshold) / max(br, 1e-4);
      gl_FragColor = vec4(min(col, vec3(60.0)), 1.0);
    }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() }, uThreshold:{ value:1.05 } }),
  down:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0); }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() } }),
  up:fsMat(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uWeight; varying vec2 vUv;
    void main(){ vec2 t = uTexel;
      vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += (texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb) * 2.0;
      c += texture2D(tSrc, vUv - t).rgb + texture2D(tSrc, vUv + t).rgb + texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb + texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb;
      gl_FragColor = vec4(c / 16.0 * uWeight, 1.0); }`, { tSrc:{ value:null }, uTexel:{ value:new THREE.Vector2() }, uWeight:{ value:1 } }, { blending:THREE.AdditiveBlending, transparent:true }),
  comp:fsMat(`uniform sampler2D tScene, tBloom; uniform float uBloom, uAberr, uZoom, uVignette, uTime, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 scene3(vec2 uv, vec2 dir){
      if (uAberr < 0.0005) return texture2D(tScene, uv).rgb;
      return vec3(texture2D(tScene, uv + dir * uAberr).r, texture2D(tScene, uv).g, texture2D(tScene, uv - dir * uAberr).b);
    }
    void main(){
      vec2 d = vUv - 0.5; float r = length(d * vec2(uAspect, 1.0));
      vec2 dir = d * r;
      vec3 col;
      if (uZoom > 0.001){
        col = vec3(0.0); float jit = hash(gl_FragCoord.xy + uTime);
        for (int i = 0; i < 8; i++){ float s = 1.0 - uZoom * (float(i) + jit) / 8.0 * smoothstep(0.08, 0.6, r); col += scene3(0.5 + d * s, dir); }
        col /= 8.0;
      } else col = scene3(vUv, dir);
      col += texture2D(tBloom, vUv).rgb * uBloom;
      col *= 1.0 - uVignette * smoothstep(0.35, 1.05, r);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      // a gentle lift in contrast and saturation after tone mapping
      vec3 c = gl_FragColor.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.1); c = max(c, 0.0);
      gl_FragColor.rgb = c;
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(gl_FragCoord.xy * 0.73 + fract(uTime)) - 0.5) / 255.0;
    }`, { tScene:{ value:null }, tBloom:{ value:null }, uBloom:{ value:0.5 }, uAberr:{ value:0 }, uZoom:{ value:0 }, uVignette:{ value:0.3 }, uTime:{ value:0 }, uAspect:{ value:1 }, toneMappingExposure:{ value:1 } }, { toneMapped:true }),
  setup(){
    for (const t of [this.rt, ...this.mips]) if (t) t.dispose();
    this.rt = null; this.mips = [];
    this.on = Q().post && !!(renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    if (!this.on) return;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type:this.hdr, samples:Q().msaa, depthBuffer:true });
    for (let i = 0; i < 6; i++){ const m = new THREE.WebGLRenderTarget(1, 1, { type:this.hdr, depthBuffer:false }); m.texture.minFilter = m.texture.magFilter = THREE.LinearFilter; this.mips.push(m); }
    this.resize();
  },
  resize(){
    if (!this.on) return;
    const v = renderer.getDrawingBufferSize(new THREE.Vector2()); this.w = v.x; this.h = v.y;
    this.rt.setSize(v.x, v.y);
    let w = Math.max(1, v.x >> 1), h = Math.max(1, v.y >> 1);
    for (const m of this.mips){ m.setSize(w, h); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
  },
  render(time){
    if (!this.on){ renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(this.rt); renderer.render(scene, camera);
    // bloom: bright-pass at half resolution, then a downsample chain and a tent-filtered upsample back
    const u = this.pre.uniforms; u.tSrc.value = this.rt.texture; u.uTexel.value.set(1 / this.w, 1 / this.h); fsDraw(this.pre, this.mips[0]);
    for (let i = 1; i < this.mips.length; i++){ const s = this.mips[i - 1]; this.down.uniforms.tSrc.value = s.texture; this.down.uniforms.uTexel.value.set(1 / s.width, 1 / s.height); fsDraw(this.down, this.mips[i]); }
    for (let i = this.mips.length - 1; i > 0; i--){ const s = this.mips[i]; this.up.uniforms.tSrc.value = s.texture; this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height); this.up.uniforms.uWeight.value = 0.85; fsDraw(this.up, this.mips[i - 1]); }
    const c = this.comp.uniforms;
    c.tScene.value = this.rt.texture; c.tBloom.value = this.mips[0].texture; c.uBloom.value = this.bloom / this.mips.length * 1.6;
    c.uAberr.value = reduceMotion ? 0 : this.aberr; c.uZoom.value = reduceMotion ? 0 : this.zoom; c.uVignette.value = this.vignette;
    c.uTime.value = time % 100; c.uAspect.value = this.w / Math.max(1, this.h); c.toneMappingExposure.value = renderer.toneMappingExposure;
    fsDraw(this.comp, null);
  }
};

const LANE = 2.1, LOOP = 230, Z_NEAR = 18, ZC = Z_NEAR - LOOP / 2;
const M = {};
// Every lit surface is physically based so it picks up the sky's environment light and reflections.
const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness:0.72, metalness:0 }, extra || {}));
const GLOW = 2.6; // emissive colours above 1.0 reach the bloom pass
function makeMaterials(){
  M.green = mat(P.green, { roughness:0.62 }); M.greenDark = mat(P.greenDark); M.gold = mat(P.gold, { roughness:0.3, metalness:0.85 });
  M.yellowGlow = mat(P.yellow, { emissive:new THREE.Color(P.yellow), emissiveIntensity:0.32, roughness:0.35 });
  M.red = mat(P.red, { roughness:0.5 }); M.orange = mat(P.orange, { roughness:0.48 }); M.yellow = mat(P.yellow, { roughness:0.5 });
  M.paper = mat(P.paper, { roughness:0.8 }); M.white = mat(P.paper, { roughness:0.5 });
  M.dark = mat(P.outline, { roughness:0.55 }); M.steel = mat(P.steel, { roughness:0.32, metalness:0.85 }); M.wood = mat(P.wood, { roughness:0.88 });
  M.npc = mat(P.npc); M.suit = mat(P.suit);
  M.frame = mat(P.frame, { roughness:0.95 }); M.far = mat(P.far, { roughness:0.6, metalness:0.2 }); M.sil = mat(P.sil, { roughness:0.45, metalness:0.55 }); M.blue = mat(P.blue);
  M.glass = mat('#1C2731', { roughness:0.04, metalness:0.1, envMapIntensity:1.6 });
  M.lamp = mat(P.lamp, { emissive:new THREE.Color(P.lamp), emissiveIntensity:0.25, roughness:0.3 });
  M.headlight = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.lamp).multiplyScalar(GLOW) });
  M.tail = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.red).multiplyScalar(1.6) });
  M.redLight = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.red).multiplyScalar(GLOW * 2), fog:false });
  M.beam = new THREE.MeshBasicMaterial({ color:new THREE.Color(P.lamp), transparent:true, opacity:isNaN(parseFloat(P.beamA)) ? 0.06 : parseFloat(P.beamA), depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide });
  M.dirt = mat(P.ground2, { roughness:1 });
  M.rubber = mat('#1E1F21', { roughness:0.92 }); M.rim = mat('#C9CFD3', { roughness:0.25, metalness:0.9 }); M.plastic = mat('#2A2D31', { roughness:0.55 });
  M.concrete = mat('#B5B0A6', { roughness:0.96 });
}
makeMaterials();

/* ---------- Procedural textures ---------- */
const TEX = {};
// Seeded random numbers, so a texture repainted for a new theme keeps the same cracks, stains and puddles.
function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkCanvas(w, h){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d', { willReadFrequently:true }); return cv; }
// Turns a greyscale height canvas into a tangent-space normal map.
function normalFromHeight(hc, strength, wrapX, wrapY){
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = mkCanvas(w, h), oc = out.getContext('2d'), img = oc.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++){
    const yu = wrapY ? (y - 1 + h) % h : Math.max(0, y - 1), yd = wrapY ? (y + 1) % h : Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++){
      const xl = wrapX ? (x - 1 + w) % w : Math.max(0, x - 1), xr = wrapX ? (x + 1) % w : Math.min(w - 1, x + 1);
      const dx = (src[(y * w + xr) * 4] - src[(y * w + xl) * 4]) / 255 * strength;
      const dy = (src[(yd * w + x) * 4] - src[(yu * w + x) * 4]) / 255 * strength;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
      d[i] = (-dx * il * 0.5 + 0.5) * 255; d[i + 1] = (dy * il * 0.5 + 0.5) * 255; d[i + 2] = (il * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  oc.putImageData(img, 0, 0); return out;
}
function grain(c, w, h, amt, seed, mono){
  const img = c.getImageData(0, 0, w, h), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4){ const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += mono ? n : n * 0.96; d[i + 2] += mono ? n : n * 0.9; }
  c.putImageData(img, 0, 0);
}
function softBlob(c, x, y, rx, ry, color, a){
  c.save(); c.translate(x, y); c.scale(rx, ry); c.globalAlpha = a;
  const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, color); gr.addColorStop(0.6, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
}

// The walkway: concrete slabs with joints, cracks, oil, tyre marks, puddles, worn lane paint and hazard edges.
// One tile is the full road width (7.6 m) and 32 m long; it scrolls with the run.
const ROAD_W = 7.6, GROUND_TILE = 32, DIRT_TILE = 6;
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
function makeGroundTextures(){
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
function makeDirtTextures(){
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
function makeFenceTextures(){
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
function iconTex(k){ return canvasTex(160, 160, (c) => { c.scale(4, 4); drawIcon(c, k); }); }
function setSkyColours(){
  skyU.uZenith.value.set(P.sky1); skyU.uMid.value.set(P.sky2); skyU.uHorizon.value.set(P.fog);
  skyU.uGround.value.set(P.hemiGround).multiplyScalar(0.7); skyU.uSunColor.value.set(P.sun);
}
function applyTheme(){
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

/* ---------- Static world: ground, fences, scenery ---------- */
const scenery = [];
setSkyColours();
makeGroundTextures(); makeDirtTextures(); makeFenceTextures();
const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, LOOP), new THREE.MeshStandardMaterial({ map:TEX.ground, normalMap:TEX.groundN, roughnessMap:TEX.groundR, roughness:1, metalness:0, normalScale:new THREE.Vector2(1, 1) }));
groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.set(0, 0, ZC); groundMesh.receiveShadow = true; groundMesh.renderOrder = -3; scene.add(groundMesh);
const dirt = new THREE.Mesh(new THREE.PlaneGeometry(220, LOOP + 200), M.dirt);
M.dirt.map = TEX.dirt; M.dirt.normalMap = TEX.dirtN; M.dirt.roughnessMap = TEX.dirtR; M.dirt.color.set('#FFFFFF');
dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, -0.03, ZC - 100); dirt.receiveShadow = true; dirt.renderOrder = -3; scene.add(dirt);
// Holes are real: a quad resets the depth where the ground opens, then the pit's inside walls draw into the gap.
M.pitPunch = new THREE.ShaderMaterial({ vertexShader:'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader:'void main(){ gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }', colorWrite:false, depthFunc:THREE.AlwaysDepth, fog:false });
M.pitWall = new THREE.MeshStandardMaterial({ map:TEX.dirtPit, normalMap:TEX.dirtNPit, roughness:1, vertexColors:true, side:THREE.BackSide });
const GEO_PIT = (() => {
  const gq = new THREE.BoxGeometry(1, 1, 1, 1, 8, 1); gq.translate(0, -0.5, 0);
  const pos = gq.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++){ const k = Math.pow(1 + pos.getY(i), 2.2) * 0.85 + 0.06; cols.push(k, k * 0.97, k * 0.93); }
  gq.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return { walls:gq, punch:new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) };
})();
// Fence panels and their feet are instanced and slide past with the ground.
const FENCE = { P:3, N:52, X:4.5 };
const fenceMat = new THREE.MeshStandardMaterial({ map:TEX.fence, transparent:true, alphaTest:0.08, side:THREE.DoubleSide, depthWrite:false, roughness:0.42, metalness:0.65 });
const fencePanels = new THREE.InstancedMesh(new THREE.PlaneGeometry(FENCE.P, 2.05), fenceMat, FENCE.N * 2);
fencePanels.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:TEX.fenceShadow, alphaTest:0.5, side:THREE.DoubleSide });
fencePanels.castShadow = true; fencePanels.frustumCulled = false; scene.add(fencePanels);
const fenceFeet = new THREE.InstancedMesh(new RoundedBoxGeometry(0.24, 0.15, 0.7, 2, 0.04), M.concrete, FENCE.N * 2);
fenceFeet.castShadow = fenceFeet.receiveShadow = true; fenceFeet.frustumCulled = false; scene.add(fenceFeet);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _v2 = new THREE.Vector2(), _s3 = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
function updateFence(dist){
  const span = FENCE.N * FENCE.P;
  for (let k = 0; k < FENCE.N; k++){
    const z = Z_NEAR - ((((k * FENCE.P - dist) % span) + span) % span);
    for (const side of [0, 1]){
      const sx = side ? FENCE.X : -FENCE.X, i = k * 2 + side;
      _q.setFromAxisAngle(_up, side ? -Math.PI / 2 : Math.PI / 2);
      fencePanels.setMatrixAt(i, _m4.compose(_v3.set(sx, 1.1, z), _q, _s3));
      fenceFeet.setMatrixAt(i, _m4.compose(_v3.set(sx, 0.075, z + FENCE.P / 2), _q.identity(), _s3));
    }
  }
  fencePanels.instanceMatrix.needsUpdate = true; fenceFeet.instanceMatrix.needsUpdate = true;
}
updateFence(0);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const GEO = {
  unit:box(1, 1, 1), limbArm:new THREE.CylinderGeometry(0.06, 0.055, 0.56, 8), limbLeg:new THREE.CylinderGeometry(0.08, 0.07, 0.88, 8),
  torso:new THREE.CylinderGeometry(0.21, 0.17, 0.62, 12), stripe:new THREE.CylinderGeometry(0.215, 0.2, 0.05, 12), head:new THREE.SphereGeometry(0.15, 16, 12),
  dome:new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brim:new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20),
  disc:new THREE.CylinderGeometry(0.34, 0.34, 0.07, 28), wheel:new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), cone:new THREE.ConeGeometry(0.22, 0.72, 18),
  beam:new THREE.ConeGeometry(1.7, 6.2, 22, 1, true), post:new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
};
Object.assign(GEO, {
  vanBox:new RoundedBoxGeometry(1.95, 1.9, 3.3, 3, 0.14), vanNose:new RoundedBoxGeometry(1.95, 1.08, 1.15, 3, 0.16),
  vanWind:new RoundedBoxGeometry(1.82, 0.78, 0.05, 2, 0.02), vanBumper:new RoundedBoxGeometry(2.02, 0.24, 0.16, 2, 0.06),
  vanLamp:new RoundedBoxGeometry(0.38, 0.17, 0.04, 2, 0.015), tyre:new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24), rim:new THREE.CylinderGeometry(0.21, 0.21, 0.12, 16)
});
const vanCache = {};
const vanPaint = hex => vanCache[hex] || (vanCache[hex] = new THREE.MeshPhysicalMaterial({ color:new THREE.Color(hex), roughness:0.35, metalness:0.15, clearcoat:1, clearcoatRoughness:0.06 }));
const PIT_DEPTH = 4.6;
GEO.pickRim = new THREE.TorusGeometry(0.34, 0.035, 10, 40);
GEO.ground1 = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
// CylinderGeometry maps cap UVs a quarter turn off. Pickups stand the disc up (rotation.x = PI/2), so remap both caps to keep icons upright from either side.
{ const pos = GEO.disc.attributes.position, nrm = GEO.disc.attributes.normal, uv = GEO.disc.attributes.uv;
  for (let i = 0; i < uv.count; i++){ const s = nrm.getY(i); if (Math.abs(s) > 0.99) uv.setXY(i, 0.5 + s * pos.getX(i) / 0.68, 0.5 - pos.getZ(i) / 0.68); } }
function addMesh(parent, geo, material, x, y, z, sx, sy, sz){
  const m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0);
  if (sx != null) m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// Collapse the meshes of a rigid group that share a material into one mesh: far fewer draw calls for the same picture.
// shallow: only the group's own meshes, so jointed children (arms, legs, head) keep moving on their own.
function bake(root, shallow){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material) || o.userData.noBake || (shallow && o.parent !== root)) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.noBake) return;
    const ge = o.geometry, sig = [o.material.uuid, ge.index ? 'i' : 'n', Object.keys(ge.attributes).sort().join(','), o.castShadow, o.receiveShadow, o.renderOrder].join('|');
    if (!buckets.has(sig)) buckets.set(sig, []);
    buckets.get(sig).push(o);
  });
  for (const list of buckets.values()){
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map(o => o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))));
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder; m.userData.baked = true;
    for (const o of list) o.parent.remove(o);
    root.add(m);
  }
  return root;
}
function disposeBaked(root){ root.traverse(o => { if (o.userData.baked) o.geometry.dispose(); }); }
function addScen(obj, z){ bake(obj); obj.position.z = z; obj.userData.wrapZ = scenWrapZ(obj); scene.add(obj); scenery.push(obj); }
// The sun is behind the runner, so tall scenery throws its shadow forward across the road: a 25 m building
// 18 m behind the camera still shades the road ahead. Scenery therefore only wraps round to the far end once its
// shadow has also left the shadow-mapped stretch, or the shadow would vanish in a single frame. The wrap point is
// capped so the object still reappears beyond the fog. Cranes slew, so the horizontal reach uses the full radius.
const _scenBox = new THREE.Box3();
function scenWrapZ(obj){
  const b = _scenBox.setFromObject(obj), p = obj.position;
  let r = 0;
  for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) r = Math.max(r, Math.hypot(x - p.x, z - p.z));
  const reach = r + Math.max(0, b.max.y) * SUN_DIR.z / SUN_DIR.y;
  return clamp(SHADOW_Z[1] + reach, Z_NEAR, LOOP - FOG.far - 10);
}
const SIGNS = {};
const logoImg = new Image(), logoTexs = [];
logoImg.onload = () => { for (const t of logoTexs) repaint(t); };
logoImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAxQAAAEgCAYAAAAt9zUDAABSgElEQVR42u3dd5xcVdkH8N9z7+zMnVRCGoSU3ZmBhJCdmRikNxUB6UVEQDqiKPqKviqKSMCCiii+qKh0KdKLIlKkg9IzswkbAjO7m0oqKSSZO7s793n/SIAAm+TeKXfK/r6fz1vIzsw99znnnnueW84RUOOYfnYcop+DYhcAMUB2BDBiwx91MYAMIG8BziwE5B786Lq5DBoRERERlUIYgjp38TnjIYVvAXI8gLHevqztAO4GzKsw/S/LGUwiIiIiYkLRrxIJZzqAM8rwa2sB/B7QyzH9uncYXCIiIiJiQtHILjn7KCjur8AvL4XReyB+fONMBpmIiIiI3DAYgrpLJs6tUDIBAKPgmM/j0rP2ZqCJiIiIiAlFo5l+1o+h+GNlNyKD4chzuOTLBzPgRERERLTV0SNDUCcuOes0qNzo3wbVBrA/pl/3EoNPREREREwo6tn0Mw8EjMf837Cugql74KLr57ASiIiIiKgvfOSp1l127jDAuLNK+eY2KBj3sxKIiIiIiAlFvcr3XAJgWBVLMAmXnPV9VgQRERER9YWPPNWy6WdMBszXa6Ak6xEoTMKPbpjPSiEiIiKiTfEORW1XzzdrpCAD0Gv+D+uDiIiIiJhQ1Jfja6coejKrg4iIiIiYUNSLS8/cE5Bta6dAsh2mn70HK4aIiIiImFDUA8fYvebKJOAK2kRERETEhKI+6PjaKxJaWC9ERERExISiPoyvwTIxoSAiIiIiJhR1YlzNlUiVCQURERERMaGoE6GaK5FUdYE9IiIiImJCQR6sr70iySpWCxERERExoagLsrj2yqRvs16IiIiIiAlFfVhSg2ViQkFERERETCiYUBRJJMVqISIiIiImFPXhpZorkeq/WC1EREREtClhCGrY9LNWAzKkRkqzHNOvHclKISIiIqJN8Q5Fbed7/6idsuj9rA8iIiIiYkJRV5wra6gsv2V9EBERERETinoy/fpXAL2n+gXR6zH9hnZWCBERERExoag3pl5Y5RKsR9C5gBVBRERERH0OVxmCGvfkjBXY/xM9EHymKtsX50RcdMMrrAgiIiIiYkJRr55+7VkcMHUvQKL+blh/iunX/4EVQERERESbw0ee6kbhBEDn+rjBBzH9uosYdyIiIiJiQtEIpt+4CmruB6gPL0frvZh+7REMOhERERExoWgkl/xlHhDaHcAjFdzK5Zh+3XEMNhERERG5wZWy69X0L38VcC4DZJvy/KDOhxhfxsXXPMLgEhEREZFbfCm7Xj312is4KHk9CrIdIIkSf+1yoHAspl8/h4ElIiIiIi94h6IRTD9rN0A+D+hhgEx2+a1XATwE07kVFzGRICIiIiImFAQAF58zHuJMgTjDoDIMIsOgqhBZCdWVEGMFmnpfww9vWMZgEREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREVGRhCGoQ83NVtOQwGTTwJBy/JwjWNo9I9POwBIRERERE4rNsJLNzZDABHWcwQaMASo6QCEDDEcHqCAMSA9E30ZBFzqG8Xa3070IM+etrL39iPxcYPyg/L+sqxzVU/Lpjgd5WBARERFRv00orMmR8dJk7KHQiRDsLJCdFTpRIGHPQ2xVG5C3AV0kIosAXaSKdu3BE/n2bMb3fUvELhDBZZXchhacz9ozO/7NQ4OIiIiI+k1CEUq0HAQYBwlwiIjs4sc2FdoF4DFAn7Id+Tfasksrvc1wMrYMwIiK7pfqm3Y6O5GHBhERERE1bkIxdmzYGh48ESLHAfhUMXcfyp9goF1U/+2oPJ7Pr3oSc5a/W87ft+ITWsRo6vBjX3LL7QFYsCDHw4OIiIiIGiqhCMVbJhpinKeQ00QwuKYLq7hHncL/2TM7nynLvidiBxuCh30putMTsdvmdvLwICIiIqKtCdRDIYPxls8bYpwrIp+umyxIcJyY5nHhZLRNFX+wV+RvLuWqv4iO923PVTn7FxERERG5YtRy4axk9DQrEZ1nGuZd7yUT9UfiIvJna7i1JJyI/cZqHR8p8oea2VyJiIiIiAmFC8Fk7CgrEZ0pkBtFZFwjBFoEgyE4X8xg1krEHg4lIod7+gGV8WyuRERERMSEYgusqbH9w4nYCyZwv4hMadSgi+BgQ4x/WMlYeygZOdTdlzDexwIqDw0iIiIiqp+EYqcxI6xE9A5R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';
function logoSignTex(w, h, tagline){
  const t = canvasTex(w, h, (c) => {
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#008064'; c.fillRect(0, h * 0.91, w, h * 0.09);
    const lw = tagline ? w * 0.6 : w * 0.8, lh = lw * 288 / 788, ly = tagline ? h * 0.1 : (h * 0.91 - lh) / 2;
    if (logoImg.complete && logoImg.naturalWidth) c.drawImage(logoImg, (w - lw) / 2, ly, lw, lh);
    if (tagline){ c.fillStyle = '#093024'; c.font = `700 ${Math.round(h * 0.12)}px ${FONT_C}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(tagline, w / 2, h * 0.76); }
  });
  logoTexs.push(t); return t;
}
function makeSignTextures(){
  if (SIGNS.adgang){ for (const k in SIGNS) repaint(SIGNS[k]); return; }
  SIGNS.adgang = signTex(256, 128, P.yellow, P.outline, ['Adgang forbudt', 'for uvedkommende'], 34, P.outline);
  SIGNS.logo = logoSignTex(512, 188);
  SIGNS.billboard = logoSignTex(1024, 444, 'Norges mest valgte bedriftshelsetjeneste');
  SIGNS.banner = signTex(512, 96, P.green, P.greenInk, ['Nominert til Gullhjelmen'], 50);
  SIGNS.forste = canvasTex(128, 128, (c) => { c.fillStyle = P.green; c.fillRect(0, 0, 128, 128); c.fillStyle = P.greenInk; c.fillRect(48, 20, 32, 88); c.fillRect(20, 48, 88, 32); });
  SIGNS.hjelm = canvasTex(128, 128, (c) => { c.fillStyle = P.paper; c.fillRect(0, 0, 128, 128); c.fillStyle = P.blue; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.fill(); c.fillStyle = P.paper; c.beginPath(); c.arc(64, 74, 30, Math.PI, 0); c.fill(); c.fillRect(26, 72, 76, 10); });
  SIGNS.byggegrop = signTex(256, 96, P.yellow, P.outline, ['Byggegrop'], 50, P.outline);
  SIGNS.passpa = signTex(160, 90, P.paper, P.outline, ['pass på'], 40);
  SIGNS.tag = signTex(160, 90, P.red, P.hudInk, ['IKKE', 'GODKJENT'], 30);
  SIGNS.hansen = signTex(512, 96, P.paper, P.outline, ['Hansen Bygg & Betong'], 52);
  SIGNS.avvik = signTex(128, 64, P.paper, P.outline, ['AVVIK'], 40);
}
makeSignTextures();
function signPlane(tex, w, h){ return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map:tex, roughness:0.55 })); }
// Spots beside the road that are taken, so props do not grow into each other. z wraps with the scenery loop.
const occupied = [];
const loopDz = (a, b) => { const d = ((a - b) % LOOP + LOOP * 1.5) % LOOP; return d - LOOP / 2; };
const isFree = (side, z, half, x0, x1) => !occupied.some(o => o.side === side && Math.abs(loopDz(o.z, z)) < o.half + half && x1 > o.x0 && x0 < o.x1);
const claim = (side, z, half, x0, x1) => occupied.push({ side, z, half, x0, x1 });
// signs on the fences
const signKinds = ['adgang', 'logo', 'banner', 'hjelm', 'forste', 'logo', 'hjelm', 'adgang'];
signKinds.forEach((k, i) => {
  const side = i % 2 ? 1 : -1;
  const dims = { adgang:[1.5, 0.75], hjelm:[0.8, 0.8], banner:[2.6, 0.5], forste:[0.7, 0.7], logo:[2.3, 0.84] }[k];
  const grp = new THREE.Group();
  const s = signPlane(SIGNS[k], dims[0], dims[1]); s.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; s.position.x = side * 4.43; s.receiveShadow = true; grp.add(s);
  const back = addMesh(grp, GEO.unit, M.white, side * 4.46, 0, 0, 0.03, dims[1] + 0.06, dims[0] + 0.06); back.castShadow = true;
  grp.position.y = 1.2; addScen(grp, Z_NEAR - 10 - i * (LOOP / signKinds.length));
});
// lamp masts
for (let i = 0; i < 8; i++){
  const side = i % 2 ? 1 : -1, grp = new THREE.Group();
  addMesh(grp, new THREE.CylinderGeometry(0.07, 0.11, 6.8, 12), M.sil, 0, 3.4, 0);
  addMesh(grp, new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10), M.sil, -side * 0.9, 6.8, 0).rotation.z = Math.PI / 2;
  addMesh(grp, new RoundedBoxGeometry(0.75, 0.16, 0.5, 2, 0.05), M.sil, -side * 1.6, 6.72, 0);
  const lens = addMesh(grp, GEO.unit, M.lamp, -side * 1.6, 6.63, 0, 0.62, 0.02, 0.38); lens.castShadow = false;
  addMesh(grp, new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.06), M.concrete, 0, 0.2, 0);
  grp.position.x = side * 5.6; addScen(grp, Z_NEAR - 5 - i * (LOOP / 8));
  claim(side, grp.position.z, 0.6, 5.2, 6.0);
}
// Grønn Jobb billboards behind the fence
for (let i = 0; i < 2; i++){
  const side = i % 2 ? 1 : -1, grp = new THREE.Group();
  for (const z of [-3, 3]) addMesh(grp, new THREE.CylinderGeometry(0.11, 0.13, 4.4, 12), M.steel, 0, 2.2, z);
  const face = side < 0 ? 0 : 1, slots = [0, 0, 0, 0, 0, 0]; slots[face] = 1;
  const board = new THREE.Mesh(regroupBox(box(0.14, 3.5, 8.0), slots), [M.white, new THREE.MeshStandardMaterial({ map:SIGNS.billboard, roughness:0.45 })]); board.position.y = 5.3; board.castShadow = board.receiveShadow = true; grp.add(board);
  for (const y of [3.5, 7.1]) addMesh(grp, GEO.unit, M.steel, side * 0.04, y, 0, 0.1, 0.1, 8.2);
  grp.position.x = side * 9.2; addScen(grp, Z_NEAR - 60 - i * (LOOP / 2));
  claim(side, grp.position.z, 4.5, 8.6, 9.8);
}
// corrugated steel for site cabins and skips
const CORR = (() => {
  const draw = (c, w, h, mode) => {
    c.fillStyle = mode === 'color' ? '#E9E7E1' : '#808080'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16){ const gr = c.createLinearGradient(x, 0, x + 16, 0);
      if (mode === 'color'){ gr.addColorStop(0, 'rgba(0,0,0,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)'); }
      else { gr.addColorStop(0, '#303030'); gr.addColorStop(0.5, '#D0D0D0'); gr.addColorStop(1, '#303030'); }
      c.fillStyle = gr; c.fillRect(x, 0, 16, h); }
    if (mode === 'color'){ const gr = c.createLinearGradient(0, h * 0.6, 0, h); gr.addColorStop(0, 'rgba(90,75,55,0)'); gr.addColorStop(1, 'rgba(90,75,55,0.35)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); grain(c, w, h, 10, 4, false); }
  };
  const color = canvasTex(128, 128, (c, w, h) => draw(c, w, h, 'color'));
  const hc = mkCanvas(128, 128); draw(hc.getContext('2d'), 128, 128, 'height');
  const normal = dataTex(normalFromHeight(hc, 1.6, true, true));
  for (const t of [color, normal]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { color, normal };
})();
const corrMat = hex => new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), map:CORR.color, normalMap:CORR.normal, roughness:0.55, metalness:0.35 });
const CABIN_MATS = ['#F2F0EA', '#DADCD8', '#2E6FA8', '#E7C33A'].map(corrMat);
// stacked site cabins (brakkerigg) with windows towards the road and an outside stair
for (let i = 0; i < 4; i++){
  const side = i % 2 ? -1 : 1, grp = new THREE.Group(), levels = i % 3 === 0 ? 2 : 1;
  for (let lv = 0; lv < levels; lv++){
    const cm = CABIN_MATS[(i + lv) % CABIN_MATS.length], geo = box(2.5, 2.55, 6); scaleBoxUV(geo, 2.5, 2.55, 6, 1.4);
    const c = new THREE.Mesh(geo, cm); c.position.y = lv * 2.6 + 1.3; c.castShadow = c.receiveShadow = true; grp.add(c);
    for (const dz of [-1.6, 1.6]){
      addMesh(grp, GEO.unit, M.white, -side * 1.255, lv * 2.6 + 1.5, dz, 0.03, 0.82, 1.12);
      const w = addMesh(grp, GEO.unit, M.glass, -side * 1.27, lv * 2.6 + 1.5, dz, 0.02, 0.7, 1.0); w.castShadow = false;
    }
    addMesh(grp, GEO.unit, M.plastic, -side * 1.26, lv * 2.6 + 1.1, 0, 0.03, 2.0, 0.9);
  }
  if (levels > 1){
    // outside stair: a landing, treads and yellow hand rails
    addMesh(grp, GEO.unit, M.steel, -side * 1.75, 2.6, 2.0, 0.9, 0.06, 1.0);
    for (let s = 0; s < 10; s++) addMesh(grp, GEO.unit, M.steel, -side * 1.75, 0.24 + s * 0.24, -1.6 + s * 0.33, 0.86, 0.04, 0.28);
    for (const dx of [-0.44, 0.44]){
      const r = addMesh(grp, GEO.unit, M.yellow, -side * (1.75 + dx), 2.15, 0.0, 0.04, 0.04, 4.0); r.rotation.x = -0.63;
      addMesh(grp, GEO.unit, M.steel, -side * (1.75 + dx), 1.3, -0.15, 0.05, 0.05, 4.1).rotation.x = -0.63;
    }
  }
  grp.position.x = side * 7.8; addScen(grp, Z_NEAR - 30 - i * (LOOP / 4));
  claim(side, grp.position.z, 3.4, 5.9, 9.2);
}
// concrete frames of buildings under construction
function makeBuilding(w, floors, d){
  const grp = new THREE.Group(), fh = 3.1;
  for (let f = 0; f <= floors; f++) addMesh(grp, GEO.unit, M.frame, 0, f * fh + 0.15, 0, w, 0.3, d);
  const nx = Math.max(2, Math.round(w / 4)), nz = Math.max(2, Math.round(d / 4)), top = floors - (Math.random() < 0.5 ? 0 : 1);
  for (let f = 0; f < top; f++)
    for (let i = 0; i <= nx; i++) for (const j of [0, nz]) addMesh(grp, GEO.unit, M.frame, -w / 2 + 0.25 + i * (w - 0.5) / nx, f * fh + fh / 2 + 0.15, -d / 2 + 0.25 + j * (d - 0.5) / nz, 0.4, fh - 0.3, 0.4);
  // rebar sticking out of the top columns and a safety net on one floor
  for (let i = 0; i <= nx; i++) for (const j of [0, nz]) for (const o of [-0.1, 0.1]) addMesh(grp, GEO.unit, M.rust, -w / 2 + 0.25 + i * (w - 0.5) / nx + o, top * fh + 0.55, -d / 2 + 0.25 + j * (d - 0.5) / nz, 0.025, 0.8, 0.025).castShadow = false;
  return grp;
}
M.rust = mat('#7A4A2E', { roughness:0.8, metalness:0.4 });

/* facades: four by four bays per texture, each bay one floor high and 3.2 m wide.
   Each kind has a colour map, and each layout has a roughness map (glass is mirror-smooth) and a normal map (frames stand out, glass sits back). */
const FAC = {}, FAC_DATA = {}, FAC_TILE = 12.8, FAC_PX = gfxTier === 'high' ? 512 : 256;
const FAC_KINDS = {
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
// Re-sort a BoxGeometry's six faces into contiguous groups, one per material slot (-1 drops a face). Fewer groups means fewer draw calls.
function regroupBox(geo, slots){
  const idx = geo.index.array, per = [];
  for (const gr of geo.groups){ const s = slots[gr.materialIndex]; if (s < 0) continue; (per[s] = per[s] || []).push(...idx.subarray(gr.start, gr.start + gr.count)); }
  const all = []; geo.clearGroups();
  per.forEach((list, s) => { if (!list) return; geo.addGroup(all.length, list.length, s); all.push(...list); });
  geo.setIndex(all); return geo;
}
function scaleBoxUV(geo, w, h, d, tile){
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){
    if (f === 2 || f === 3) continue;
    const su = (f < 2 ? d : w) / tile, sv = h / tile;
    for (let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
  }
  uv.needsUpdate = true;
}
// Distant buildings get their own, thinner haze than the scene fog, so the skyline stays readable far out.
function hazeMat(m){
  m.fog = true;
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#ifdef USE_FOG\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, 0.9 * (1.0 - exp(-vFogDepth * 0.0058)));\n#endif'); };
  m.customProgramCacheKey = () => 'haze';
  return m;
}
const facMatCache = {};
function facMat(kind, far){
  const k = kind + (far ? '|far' : '');
  if (!facMatCache[k]){
    const D = FAC_DATA[FAC_KINDS[kind].lay], glassy = kind === 'glass' || kind === 'tower';
    const m = new THREE.MeshStandardMaterial({ map:FAC[kind], normalMap:D.n, roughnessMap:D.r, roughness:1, metalness:glassy ? 0.15 : 0, envMapIntensity:glassy ? 1.35 : 1 });
    facMatCache[k] = far ? hazeMat(m) : m;
  }
  return facMatCache[k];
}
const roofMatCache = {};
function roofMat(hex, far){ const k = hex + (far ? '|far' : ''); if (!roofMatCache[k]){ const m = new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), roughness:0.9 }); roofMatCache[k] = far ? hazeMat(m) : m; } return roofMatCache[k]; }
function block(parent, w, h, d, kind, roof, x, y, z, far){
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, FAC_TILE); regroupBox(geo, [0, 0, 1, -1, 0, 0]);
  const m = new THREE.Mesh(geo, [facMat(kind, far), roofMat(roof, far)]);
  m.position.set(x || 0, (y || 0) + h / 2, z || 0); m.castShadow = !far; m.receiveShadow = !far; parent.add(m);
  if (!far){ // parapet
    const pm = roofMat('#8C8A85'), py = (y || 0) + h + 0.25;
    for (const [px, pz, sw, sd] of [[0, d / 2 - 0.1, w, 0.2], [0, -d / 2 + 0.1, w, 0.2], [w / 2 - 0.1, 0, 0.2, d], [-w / 2 + 0.1, 0, 0.2, d]]) addMesh(parent, GEO.unit, pm, (x || 0) + px, py, (z || 0) + pz, sw, 0.5, sd).castShadow = false;
  }
  return m;
}
function makeApartment(side){
  const grp = new THREE.Group(), floors = 4 + Math.floor(Math.random() * 5), w = rand(11, 16), d = rand(18, 26), h = floors * 3.2;
  block(grp, w, h, d, pick(['apt', 'aptGrey', 'brick']), '#6E6A64', 0, 0, 0);
  const face = -side * (w / 2 + 0.5), rail = M.balcony, slab = roofMat('#B9B6AE');
  for (let f = 1; f < floors; f++) for (let k = -1; k <= 1; k++){
    addMesh(grp, GEO.unit, slab, face, f * 3.2, k * d / 3.2, 1.0, 0.12, 2.6);
    addMesh(grp, GEO.unit, rail, face - side * 0.48, f * 3.2 + 0.5, k * d / 3.2, 0.04, 0.9, 2.6).castShadow = false;
    addMesh(grp, GEO.unit, M.steel, face - side * 0.48, f * 3.2 + 0.97, k * d / 3.2, 0.06, 0.05, 2.62).castShadow = false;
  }
  block(grp, w * 0.35, 2.2, d * 0.25, 'aptGrey', '#5E5A55', 0, h, 0);
  return { grp, w };
}
M.balcony = new THREE.MeshPhysicalMaterial({ color:new THREE.Color('#BFD4DE'), roughness:0.05, transmission:0, transparent:true, opacity:0.45, envMapIntensity:1.4, depthWrite:false });
function makeOffice(){
  const grp = new THREE.Group(), floors = 3 + Math.floor(Math.random() * 5), w = rand(16, 22), d = rand(18, 26), h = floors * 3.6;
  block(grp, w, h, d, 'glass', '#4E555B', 0, 0, 0);
  addMesh(grp, GEO.unit, roofMat('#D7D9DA'), 0, h + 0.4, 0, w + 0.4, 0.8, d + 0.4);
  for (let i = 0; i < 3; i++) addMesh(grp, new RoundedBoxGeometry(2.2, 1.3, 1.6, 2, 0.1), M.steel, rand(-w / 3, w / 3), h + 1.45, rand(-d / 3, d / 3));
  return { grp, w };
}
function makeHouse(){
  const grp = new THREE.Group(), w = rand(7, 9), d = rand(9, 12), h = 6.2, kind = pick(['houseRed', 'houseWhite', 'houseYellow', 'houseBlue']);
  const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, FAC_TILE);
  const hm = new THREE.Mesh(geo, facMat(kind)); hm.position.y = h / 2; hm.castShadow = hm.receiveShadow = true; grp.add(hm);
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, w * 0.42); shape.lineTo(-w / 2 - 0.4, 0);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth:d + 0.8, bevelEnabled:false });
  const roof = new THREE.Mesh(roofGeo, roofMat(pick(['#3A3A3A', '#5A2E25', '#2F3B44']))); roof.position.set(0, h, -d / 2 - 0.4); roof.castShadow = roof.receiveShadow = true; grp.add(roof);
  addMesh(grp, GEO.unit, roofMat('#6B4A33'), w * 0.25, h + w * 0.3, 0, 0.6, 1.6, 0.6);
  return { grp, w };
}
function makeTowerNear(){
  const grp = new THREE.Group(), floors = 12 + Math.floor(Math.random() * 10), w = rand(14, 18), d = rand(14, 18), h = floors * 3.3;
  block(grp, w, h, d, pick(['tower', 'glass', 'aptGrey']), '#4E555B', 0, 0, 0);
  if (Math.random() < 0.6) block(grp, w * 0.6, 6.6, d * 0.6, 'tower', '#4E555B', 0, h, 0);
  return { grp, w };
}
const NEAR_TYPES = [['apt', 3], ['office', 2], ['house', 2.2], ['frame', 2], ['tower', 1.2]];
function pickWeighted(list){ let t = 0; list.forEach(([, w]) => t += w); let r = Math.random() * t; for (const [k, w] of list){ r -= w; if (r <= 0) return k; } return list[0][0]; }
for (let i = 0; i < 12; i++){
  const side = i % 2 ? 1 : -1, type = pickWeighted(NEAR_TYPES);
  let b, w, gap = rand(0, 5);
  if (type === 'frame'){ w = rand(12, 18); b = makeBuilding(w, 3 + Math.floor(Math.random() * 3), rand(9, 13)); }
  else if (type === 'apt'){ const r = makeApartment(side); b = r.grp; w = r.w; }
  else if (type === 'office'){ const r = makeOffice(); b = r.grp; w = r.w; }
  else if (type === 'house'){ const r = makeHouse(); b = r.grp; w = r.w; gap = rand(-1, 2); }
  else { const r = makeTowerNear(); b = r.grp; w = r.w; gap = rand(10, 18); }
  b.position.x = side * (11 + w / 2 + gap); addScen(b, Z_NEAR - 12 - i * (LOOP / 12));
}
// the city skyline beyond the site: hazy towers that drift past slowly, and a fixed cluster on the horizon
const skyline = [], SKY_SPAN = 470;
function makeSkyscraper(scale){
  const grp = new THREE.Group(), h = rand(38, 150) * (scale || 1), w = rand(14, 30), d = rand(14, 28), kind = pick(['tower', 'glass', 'tower', 'aptGrey']);
  block(grp, w, h, d, kind, '#7F8C95', 0, 0, 0, true);
  let top = h;
  if (Math.random() < 0.55){ const h2 = rand(10, 40); block(grp, w * rand(0.55, 0.75), h2, d * rand(0.55, 0.75), kind, '#7F8C95', 0, h, 0, true); top += h2; }
  if (Math.random() < 0.35){ const a = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, rand(8, 22), 6), roofMat('#9AA6AE', true)); a.position.y = top + a.geometry.parameters.height / 2; grp.add(a); }
  return grp;
}
for (let i = 0; i < 26; i++){
  const side = i % 2 ? 1 : -1, b = makeSkyscraper(i % 3 === 0 ? 1.15 : 0.85);
  bake(b); b.position.set(side * rand(55, 170), 0, 25 - (i / 26) * SKY_SPAN - rand(0, 12)); scene.add(b); skyline.push(b);
}
for (let i = 0; i < 12; i++){ const b = bake(makeSkyscraper(1.2)); b.position.set(rand(-150, 150), 0, -rand(330, 400)); scene.add(b); }
// tower cranes: lattice mast and jib, slewing slowly with a load on the hook
const craneLights = [], cranes = [];
const latticeMat = new THREE.MeshStandardMaterial({ color:new THREE.Color('#E8B21F'), map:TEX.lattice, alphaTest:0.02, alphaToCoverage:true, side:THREE.DoubleSide, roughness:0.5, metalness:0.3 });
function latticeBox(cross, len){
  const geo = new THREE.BoxGeometry(cross, len, cross), uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++){ if (f === 2 || f === 3) continue; for (let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, uv.getX(i), uv.getY(i) * len / (cross * 4)); } }
  return geo;
}
for (let i = 0; i < 3; i++){
  const side = i % 2 ? -1 : 1, grp = new THREE.Group(), hgt = rand(30, 38), slew = new THREE.Group();
  const mast = new THREE.Mesh(latticeBox(1.6, hgt), latticeMat); mast.position.y = hgt / 2; grp.add(mast);
  addMesh(grp, GEO.unit, M.concrete, 0, 0.5, 0, 4, 1, 4);
  slew.position.y = hgt; grp.add(slew);
  const jib = new THREE.Mesh(latticeBox(1.2, 40), latticeMat); jib.rotation.z = Math.PI / 2; jib.position.set(-side * 14, 0.6, 0); slew.add(jib);
  const cj = new THREE.Mesh(latticeBox(1.2, 10), latticeMat); cj.rotation.z = Math.PI / 2; cj.position.set(side * 9, 0.6, 0); slew.add(cj);
  addMesh(slew, GEO.unit, M.concrete, side * 12, -0.4, 0, 2.4, 2.2, 1.8);
  const cab = addMesh(slew, new RoundedBoxGeometry(2, 2, 2, 2, 0.2), M.white, -side * 1.2, -0.6, 1.4);
  addMesh(slew, GEO.unit, M.glass, -side * 2.21, -0.4, 1.4, 0.02, 1.2, 1.6);
  const tip = new THREE.Mesh(latticeBox(1.0, 5), latticeMat); tip.position.set(0, 3.6, 0); slew.add(tip);
  for (const s2 of [-1, 1]){ const tie = addMesh(slew, GEO.unit, M.steel, s2 * side * -9, 3.6, 0, 18, 0.06, 0.06); tie.rotation.z = s2 * side * 0.33; tie.castShadow = false; }
  const trolley = new THREE.Group(); trolley.position.set(-side * rand(14, 26), 0, 0); slew.add(trolley);
  const cableLen = rand(10, 20); addMesh(trolley, GEO.unit, M.dark, 0, -cableLen / 2, 0, 0.05, cableLen, 0.05).castShadow = false;
  addMesh(trolley, GEO.unit, M.yellow, 0, -cableLen - 0.3, 0, 0.5, 0.6, 0.3);
  addMesh(trolley, GEO.unit, M.wood, 0, -cableLen - 1.6, 0, 1.6, 0.9, 1.2);
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M.redLight); l.position.set(0, 6.4, 0); l.userData.noBake = true; slew.add(l); craneLights.push(l);
  bake(slew); slew.userData.noBake = true; slew.rotation.y = rand(-0.8, 0.8); grp.userData.slew = slew; grp.userData.slewPhase = rand(0, 6.28);
  grp.position.x = side * rand(26, 36); addScen(grp, Z_NEAR - 40 - i * (LOOP / 3)); cranes.push(grp);
}
// birches and rowans between the fence and the buildings
const TREE_GEOS = (() => {
  const out = [], leaf = ['#5E8A3A', '#6F9A42', '#4F7A33', '#7DA54C', '#8BAA4A'];
  for (let n = 0; n < 5; n++){
    const parts = [], hgt = rand(4.5, 7.5);
    const cnt = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < cnt; i++){
      const rr = rand(1.0, 1.7) * (i ? 0.85 : 1), b = mergeVertices(new THREE.IcosahedronGeometry(rr, 3).deleteAttribute('normal').deleteAttribute('uv')), p = b.attributes.position, cols = [];
      const base = new THREE.Color(pick(leaf)), cx = rand(-0.9, 0.9), cy = hgt - rand(0, 2.2), cz = rand(-0.9, 0.9);
      for (let k = 0; k < p.count; k++){
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nn = 1 + (Math.sin(x * 3.1 + n) * Math.cos(y * 2.7) * Math.sin(z * 3.3 + i)) * 0.18;
        p.setXYZ(k, x * nn + cx, y * nn * 0.85 + cy, z * nn + cz);
        const shade = (0.62 + 0.38 * ((y / rr) * 0.5 + 0.5)) * (0.85 + Math.random() * 0.3); cols.push(base.r * shade, base.g * shade, base.b * shade);
      }
      b.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); b.computeVertexNormals(); parts.push(b);
    }
    out.push({ canopy:mergeGeometries(parts), trunk:new THREE.CylinderGeometry(0.1, 0.17, hgt, 8).translate(0, hgt / 2, 0) });
  }
  return out;
})();
const birchTex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#ECEAE4'; c.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 40; i++){ c.fillStyle = r() < 0.7 ? '#2B2722' : '#7A746C'; c.fillRect(r() * w, r() * h, r() * 22 + 6, r() * 3 + 1.5); } });
const leafMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.85 }), trunkMat = new THREE.MeshStandardMaterial({ map:birchTex, roughness:0.8 });
function placeBeside(half, x0, x1, tries, make){
  for (let t = 0; t < (tries || 40); t++){
    const side = Math.random() < 0.5 ? -1 : 1, z = Z_NEAR - rand(0, LOOP), x = rand(x0, x1);
    if (!isFree(side, z, half, x - half, x + half)) continue;
    claim(side, z, half, x - half, x + half); const obj = make(side); obj.position.x = side * x; addScen(obj, z); return true;
  }
  return false;
}
for (let i = 0; i < 22; i++) placeBeside(1.6, 6.3, 9.6, 40, () => {
  const T = pick(TREE_GEOS), grp = new THREE.Group();
  const tr = new THREE.Mesh(T.trunk, trunkMat), cn = new THREE.Mesh(T.canopy, leafMat);
  tr.castShadow = cn.castShadow = true; tr.receiveShadow = cn.receiveShadow = true; grp.add(tr, cn);
  grp.rotation.y = rand(0, 6.28); grp.scale.setScalar(rand(0.8, 1.15)); return grp;
});
// site clutter: gravel heaps, pallets of blocks, portable toilets and skips
const gravelGeo = (() => { const gq = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), p = gq.attributes.position; for (let k = 0; k < p.count; k++){ const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nn = 1 + Math.sin(x * 5) * Math.cos(z * 4) * 0.06; p.setXYZ(k, x * nn, y * 0.55, z * nn); } gq.computeVertexNormals(); return gq; })();
const gravelMat = new THREE.MeshStandardMaterial({ map:TEX.dirtPit, normalMap:TEX.dirtNPit, roughness:1, color:new THREE.Color('#E6DED0') });
for (let i = 0; i < 4; i++) placeBeside(2.2, 6.6, 9.4, 40, () => { const m = new THREE.Mesh(gravelGeo, gravelMat); m.scale.set(rand(1.6, 2.2), rand(1.1, 1.8), rand(1.6, 2.4)); m.castShadow = m.receiveShadow = true; return m; });
const blockMat = mat('#B8B4AC', { roughness:0.95 }), wrapMat = new THREE.MeshPhysicalMaterial({ color:new THREE.Color('#DDE6EA'), roughness:0.15, transparent:true, opacity:0.5, depthWrite:false });
for (let i = 0; i < 6; i++) placeBeside(0.9, 5.5, 9.6, 40, () => {
  const grp = new THREE.Group(), n = 1 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++){
    const y = k * 1.05;
    addMesh(grp, GEO.unit, M.wood, 0, y + 0.07, 0, 1.2, 0.14, 1.0);
    addMesh(grp, new RoundedBoxGeometry(1.1, 0.8, 0.95, 2, 0.03), Math.random() < 0.5 ? blockMat : M.paper, 0, y + 0.55, 0);
    addMesh(grp, GEO.unit, wrapMat, 0, y + 0.56, 0, 1.13, 0.84, 0.98).castShadow = false;
  }
  grp.rotation.y = rand(-0.3, 0.3); return grp;
});
const toiletMat = mat('#2F6FB5', { roughness:0.45 });
for (let i = 0; i < 3; i++) placeBeside(0.8, 5.6, 8.5, 40, side => {
  const grp = new THREE.Group();
  addMesh(grp, new RoundedBoxGeometry(1.1, 2.3, 1.1, 3, 0.08), toiletMat, 0, 1.15, 0);
  addMesh(grp, new RoundedBoxGeometry(1.2, 0.12, 1.2, 2, 0.05), M.white, 0, 2.34, 0);
  addMesh(grp, GEO.unit, M.white, -side * 0.56, 1.1, 0, 0.02, 1.9, 0.8);
  return grp;
});
const skipMat = corrMat('#E36F1E');
for (let i = 0; i < 2; i++) placeBeside(2.2, 6.6, 9.2, 40, () => {
  const grp = new THREE.Group(), geo = box(2.0, 1.4, 4.0); scaleBoxUV(geo, 2.0, 1.4, 4.0, 1.4);
  const sk = new THREE.Mesh(geo, skipMat); sk.position.y = 0.75; sk.castShadow = sk.receiveShadow = true; grp.add(sk);
  addMesh(grp, gravelGeo, gravelMat, 0, 1.4, 0, 0.9, 0.6, 1.8);
  for (const s of [-0.5, 0.8]) addMesh(grp, GEO.unit, M.wood, s, 1.6, 0.4, 0.15, 0.15, 2.6).rotation.z = s;
  return grp;
});

/* ---------- Characters ---------- */
const matCache = {};
const matC = hex => matCache[hex] || (matCache[hex] = mat(hex));
const smatCache = {};
function smat(hex, rough, metal){ const k = hex + '|' + rough + '|' + (metal || 0); return smatCache[k] || (smatCache[k] = new THREE.MeshStandardMaterial({ color:new THREE.Color(hex), roughness:rough, metalness:metal || 0 })); }
const SKINS = ['#E8BE9C', '#C99A76', '#A8714C', '#7A4E33', '#F0CDB2', '#B9825C'], HAIRS = ['#2B1E16', '#4E3220', '#141414', '#8A6A3E', '#9A9A96', '#6B3A1E'];
const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg, open) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg || 24);
const HG = {
  torso:lathe([[0, 0.02], [0.15, 0.04], [0.165, 0.12], [0.158, 0.22], [0.165, 0.32], [0.186, 0.44], [0.2, 0.53], [0.196, 0.6], [0.15, 0.655], [0.07, 0.69], [0, 0.7]]),
  hips:lathe([[0, -0.1], [0.12, -0.1], [0.158, -0.04], [0.165, 0.04], [0.152, 0.1], [0, 0.1]]),
  vest:lathe([[0.173, 0.14], [0.168, 0.22], [0.174, 0.32], [0.194, 0.44], [0.208, 0.53], [0.203, 0.6], [0.162, 0.652]]),
  band1:new THREE.CylinderGeometry(0.177, 0.176, 0.042, 24, 1, true), band2:new THREE.CylinderGeometry(0.2, 0.197, 0.042, 24, 1, true),
  belt:new THREE.CylinderGeometry(0.168, 0.168, 0.042, 24, 1, true), strap:box(0.034, 0.2, 0.008), zip:box(0.008, 0.42, 0.006),
  shirtFront:box(0.075, 0.2, 0.006), lapel:box(0.04, 0.2, 0.008), tie:box(0.034, 0.24, 0.008), collar:box(0.12, 0.05, 0.03),
  neck:new THREE.CylinderGeometry(0.048, 0.055, 0.11, 14),
  cranium:new THREE.SphereGeometry(0.105, 26, 20), jaw:new THREE.SphereGeometry(0.085, 22, 16), nose:new THREE.ConeGeometry(0.018, 0.046, 10),
  eyeW:new THREE.SphereGeometry(0.016, 12, 10), pupil:new THREE.SphereGeometry(0.0085, 8, 6), brow:box(0.036, 0.008, 0.01), mouth:box(0.04, 0.007, 0.01),
  ear:new THREE.SphereGeometry(0.022, 10, 8), hairTop:new THREE.SphereGeometry(0.112, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hairBack:new THREE.SphereGeometry(0.1, 20, 14),
  beard:new THREE.SphereGeometry(0.089, 22, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
  dome:new THREE.SphereGeometry(0.136, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), brim:new THREE.CylinderGeometry(0.15, 0.156, 0.014, 32), ridge:box(0.03, 0.026, 0.25),
  glasses:box(0.15, 0.022, 0.012), lens:box(0.05, 0.03, 0.004),
  joint:new THREE.SphereGeometry(0.06, 14, 10), upper:new THREE.CylinderGeometry(0.054, 0.046, 0.28, 14), fore:new THREE.CylinderGeometry(0.045, 0.037, 0.25, 14), elbow:new THREE.SphereGeometry(0.047, 12, 10),
  palm:new THREE.SphereGeometry(0.045, 14, 10), thumb:new THREE.CylinderGeometry(0.014, 0.012, 0.055, 8),
  thigh:new THREE.CylinderGeometry(0.08, 0.062, 0.44, 16), knee:new THREE.SphereGeometry(0.062, 14, 10), pad:box(0.1, 0.11, 0.03), shin:new THREE.CylinderGeometry(0.06, 0.047, 0.4, 16),
  bootUp:new THREE.CylinderGeometry(0.056, 0.062, 0.1, 14), foot:box(0.1, 0.07, 0.2), toe:new THREE.SphereGeometry(0.052, 14, 10), sole:box(0.112, 0.022, 0.235),
  // hair styles and facial hair
  hairLong:new THREE.CapsuleGeometry(0.075, 0.2, 6, 16), lock:new THREE.CapsuleGeometry(0.026, 0.1, 4, 10), pony:new THREE.CapsuleGeometry(0.032, 0.16, 4, 12),
  tie:new THREE.SphereGeometry(0.026, 12, 8), bun:new THREE.SphereGeometry(0.05, 16, 12), curl:new THREE.SphereGeometry(0.03, 10, 8),
  stache:new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), chin:new THREE.SphereGeometry(0.03, 12, 10), lash:box(0.032, 0.006, 0.006)
};
const HAIR_STYLES = ['short', 'long', 'ponytail', 'bun', 'curly', 'bald'], FACIALS = ['none', 'stubble', 'mustache', 'goatee', 'full'];
let backTex = null;
// o.female narrows the shoulders and widens the hips; o.hairStyle and o.facial pick from HAIR_STYLES and FACIALS.
function makeHuman(o){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.97;
  const skinC = o.skin || pick(SKINS), skin = smat(skinC, 0.62), hairC = o.hair || pick(HAIRS), hair = smat(hairC, 0.85);
  const shirt = o.shirt, pants = o.pants, boots = o.boots || smat('#4A3422', 0.7), soleM = smat('#1A1714', 0.9), dark = smat('#1A1714', 0.6);
  const bx = o.female ? 0.92 : 1, hx = o.female ? 1.07 : 1;
  addMesh(body, HG.hips, pants, 0, 0, 0, hx, 1, 0.74 * (o.female ? 1.06 : 1));
  addMesh(body, HG.torso, shirt, 0, 0, 0, bx, 1, 0.63);
  addMesh(body, HG.belt, smat('#1C1A18', 0.5), 0, 0.075, 0, hx * 0.98, 1, 0.75).material.side = THREE.DoubleSide;
  if (o.vest){
    const v = addMesh(body, HG.vest, o.vest, 0, 0, 0, bx, 1, 0.67); v.material.side = THREE.DoubleSide;
    addMesh(body, HG.band1, o.stripe, 0, 0.29, 0, bx, 1, 0.69); addMesh(body, HG.band2, o.stripe, 0, 0.46, 0, bx, 1, 0.68);
    for (const x of [-0.085, 0.085]) for (const z of [-0.137, 0.137]){ const st = addMesh(body, HG.strap, o.stripe, x * bx, 0.56, z); st.rotation.x = z < 0 ? 0.18 : -0.18; }
    addMesh(body, HG.zip, dark, 0, 0.4, -0.123);
    if (o.backText){
      if (!backTex) backTex = canvasTex(256, 64, (c, w, h) => { c.clearRect(0, 0, w, h); let fs = 46; c.font = `800 ${fs}px ${FONT_C}`; const tw = c.measureText(o.backText).width; if (tw > w - 16){ fs = Math.floor(fs * (w - 16) / tw); c.font = `800 ${fs}px ${FONT_C}`; } c.fillStyle = '#F2F2F0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.backText, w / 2, h / 2 + 2); });
      const bt = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065), new THREE.MeshStandardMaterial({ map:backTex, transparent:true, roughness:0.4, emissive:new THREE.Color('#FFFFFF'), emissiveMap:backTex, emissiveIntensity:0.25 })); bt.position.set(0, 0.38, 0.131); body.add(bt);
    }
  }
  if (o.suit){
    addMesh(body, HG.shirtFront, smat('#F4F4F2', 0.6), 0, 0.53, -0.124);
    addMesh(body, HG.tie, o.suit.tie, 0, 0.5, -0.128);
    for (const x of [-1, 1]){ const l = addMesh(body, HG.lapel, shirt, x * 0.05, 0.54, -0.127); l.rotation.z = x * 0.32; }
    addMesh(body, HG.collar, smat('#F4F4F2', 0.6), 0, 0.665, -0.07);
  }
  addMesh(body, HG.neck, skin, 0, 0.72, 0, o.female ? 0.88 : 1, 1, o.female ? 0.88 : 1);
  const head = new THREE.Group(); head.position.set(0, 0.855, 0); body.add(head);
  addMesh(head, HG.cranium, skin, 0, 0, 0, 0.93, 1.08, 1.02);
  if (o.female) addMesh(head, HG.jaw, skin, 0, -0.05, -0.014, 0.86, 0.76, 0.9);
  else addMesh(head, HG.jaw, skin, 0, -0.055, -0.016, 0.95, 0.8, 0.95);
  const nose = addMesh(head, HG.nose, skin, 0, -0.012, -0.106); nose.rotation.x = -Math.PI / 2 - 0.25;
  for (const x of [-0.037, 0.037]){
    addMesh(head, HG.eyeW, smat('#F2EFEA', 0.4), x, 0.018, -0.086); addMesh(head, HG.pupil, smat('#2A2018', 0.3), x, 0.018, -0.1); addMesh(head, HG.brow, hair, x, 0.043, -0.096);
    if (o.female) addMesh(head, HG.lash, dark, x, 0.031, -0.1);
  }
  const facial = o.facial || (o.beard ? 'full' : 'none'), style = o.hairStyle || (o.bald ? 'bald' : 'short'); let pony = null;
  addMesh(head, HG.mouth, smat(o.female ? '#9A4A48' : '#7A3E35', 0.55), 0, -0.06, facial === 'full' ? -0.107 : facial === 'stubble' ? -0.103 : -0.088, o.female ? 1.05 : 1, o.female ? 1.6 : 1, 1);
  for (const x of [-0.098, 0.098]) addMesh(head, HG.ear, skin, x, -0.002, 0.006, 0.5, 1, 0.8);
  // hair: most of it shows below the helmet brim, at the back and sides
  if (style !== 'bald'){
    addMesh(head, HG.hairTop, hair, 0, 0.024, 0.01, 0.97, 1.08, 1.06); addMesh(head, HG.hairBack, hair, 0, -0.02, 0.034, 0.93, 0.86, 0.8);
    for (const x of [-0.093, 0.093]) addMesh(head, HG.lock, hair, x, -0.008, -0.022, 0.55, 0.42, 0.6); // sideburns, so the hair shows from the front too
  }
  if (style === 'long'){
    addMesh(head, HG.hairLong, hair, 0, -0.13, 0.06, 1.18, 1, 0.78);
    for (const x of [-0.085, 0.085]) addMesh(head, HG.lock, hair, x, -0.075, 0.005, 1, 1, 0.9);
  } else if (style === 'ponytail'){
    const pv = new THREE.Group(); pv.position.set(0, -0.005, 0.105); pv.rotation.x = -0.45; head.add(pv);
    addMesh(pv, HG.tie, hair, 0, 0, 0); addMesh(pv, HG.pony, hair, 0, -0.11, 0, 1, 1, 0.85);
    pony = pv;
  } else if (style === 'bun') addMesh(head, HG.bun, hair, 0, -0.025, 0.112);
  else if (style === 'curly'){
    // a ring of curls around the back half of the head, from ear to ear
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++){
      const a = Math.PI * (0.02 + i * 0.12) + (row % 2) * 0.17, r = 0.1 - row * 0.008;
      addMesh(head, HG.curl, hair, Math.cos(a) * r, 0.0 - row * 0.042, Math.sin(a) * r * 1.05 + 0.02);
    }
  }
  // facial hair
  if (facial === 'stubble') addMesh(head, HG.beard, smat('#' + new THREE.Color(skinC).lerp(new THREE.Color(hairC), 0.45).getHexString(), 0.9), 0, -0.05, -0.016, 0.95, 0.85, 0.95);
  if (facial === 'full') addMesh(head, HG.beard, hair, 0, -0.05, -0.016, 1, 0.92, 1);
  if (facial === 'mustache' || facial === 'goatee' || facial === 'full') for (const s of [-1, 1]){ const st = addMesh(head, HG.stache, hair, s * 0.021, -0.041, facial === 'full' ? -0.106 : -0.098, 1, 1, 0.7); st.rotation.z = s * (Math.PI / 2 - 0.28); }
  if (facial === 'goatee') addMesh(head, HG.chin, hair, 0, -0.118, -0.074, 0.9, 1.25, 0.7);
  if (o.glasses){ addMesh(head, HG.glasses, dark, 0, 0.02, -0.104); for (const x of [-0.037, 0.037]) addMesh(head, HG.lens, smat('#9CC3D8', 0.1, 0.2), x, 0.018, -0.106); }
  if (o.helmet){ addMesh(head, HG.dome, o.helmet, 0, 0.038, 0, 1, 0.95, 1.08); addMesh(head, HG.brim, o.helmet, 0, 0.038, -0.014, 1.05, 1, 1.2); addMesh(head, HG.ridge, o.helmet, 0, 0.165, 0); }
  const mk = (x) => {
    const sh = new THREE.Group(); sh.position.set(x, 0.6, 0); body.add(sh);
    addMesh(sh, HG.joint, shirt, 0, -0.01, 0);
    addMesh(sh, HG.upper, shirt, 0, -0.14, 0);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    addMesh(el, HG.elbow, shirt, 0, 0, 0); addMesh(el, HG.fore, shirt, 0, -0.125, 0);
    const handM = o.gloves || skin;
    addMesh(el, HG.palm, handM, 0, -0.29, 0, 0.75, 1.15, 0.55);
    const th = addMesh(el, HG.thumb, handM, -Math.sign(x) * 0.03, -0.27, -0.02); th.rotation.z = Math.sign(x) * 0.6;
    const hp = new THREE.Group(); hp.position.set(Math.sign(x) * 0.095 * hx, -0.02, 0); body.add(hp);
    addMesh(hp, HG.thigh, pants, 0, -0.22, 0);
    const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
    addMesh(kn, HG.knee, pants, 0, 0, 0);
    if (o.kneepads) addMesh(kn, HG.pad, dark, 0, -0.02, -0.058);
    addMesh(kn, HG.shin, pants, 0, -0.2, 0);
    const an = new THREE.Group(); an.position.y = -0.41; kn.add(an);
    addMesh(an, HG.bootUp, boots, 0, 0.0, 0); addMesh(an, HG.foot, boots, 0, -0.05, -0.045); addMesh(an, HG.toe, boots, 0, -0.055, -0.13, 1, 0.68, 1); addMesh(an, HG.sole, soleM, 0, -0.088, -0.05);
    return { sh, el, hp, kn, an };
  };
  const L = mk(-0.205 * bx), Rr = mk(0.205 * bx);
  for (const grp of [body, head, L.sh, L.el, L.hp, L.kn, L.an, Rr.sh, Rr.el, Rr.hp, Rr.kn, Rr.an, pony].filter(Boolean)) bake(grp, true);
  return { root, body, head, pony, shL:L.sh, elL:L.el, hipL:L.hp, knL:L.kn, anL:L.an, shR:Rr.sh, elR:Rr.el, hipR:Rr.hp, knR:Rr.kn, anR:Rr.an };
}
const JOINTS = ['shL', 'elL', 'hipL', 'knL', 'anL', 'shR', 'elR', 'hipR', 'knR', 'anR'];
function poseReset(f){ f.body.rotation.set(0, 0, 0); f.body.position.y = 0.97; f.head.rotation.set(0, 0, 0); for (const k of JOINTS) f[k].rotation.set(0, 0, 0); f.elL.rotation.x = f.elR.rotation.x = 0.15; f.shL.rotation.z = -0.06; f.shR.rotation.z = 0.06; }
function feet(f){ f.anL.rotation.x = clamp(-(f.hipL.rotation.x + f.knL.rotation.x) * 0.7, -0.7, 0.9); f.anR.rotation.x = clamp(-(f.hipR.rotation.x + f.knR.rotation.x) * 0.7, -0.7, 0.9); }
function poseRun(f, ph, amp){
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
function poseJump(f){ poseReset(f); f.body.rotation.x = -0.1; f.hipL.rotation.x = 1.15; f.knL.rotation.x = -1.5; f.hipR.rotation.x = -0.25; f.knR.rotation.x = -0.9; feet(f); f.shL.rotation.x = 2.5; f.elL.rotation.x = 0.4; f.shR.rotation.x = -0.5; f.elR.rotation.x = 1.0; f.head.rotation.x = 0.1; }
function poseSlide(f){ poseReset(f); f.body.rotation.x = 1.15; f.body.position.y = 0.44; f.hipL.rotation.x = f.hipR.rotation.x = 1.45; f.knL.rotation.x = f.knR.rotation.x = -0.15; f.anL.rotation.x = f.anR.rotation.x = 0.3; f.shL.rotation.x = f.shR.rotation.x = -0.4; f.elL.rotation.x = f.elR.rotation.x = 0.5; f.head.rotation.x = -0.6; }
function poseReady(f){ poseReset(f); f.body.rotation.x = -0.35; f.body.position.y = 0.88; f.hipL.rotation.x = 0.6; f.knL.rotation.x = -0.6; f.hipR.rotation.x = -0.35; f.knR.rotation.x = -0.5; feet(f); f.shL.rotation.x = -0.6; f.shR.rotation.x = 0.7; f.elL.rotation.x = f.elR.rotation.x = 1.3; f.head.rotation.x = 0.3; }
function poseSit(f){ poseReset(f); f.body.position.y = 0.56; f.hipL.rotation.x = f.hipR.rotation.x = 1.5; f.knL.rotation.x = f.knR.rotation.x = -1.5; f.shR.rotation.x = 0.55; f.elR.rotation.x = 1.5; f.shL.rotation.x = 0.25; f.elL.rotation.x = 0.7; f.head.rotation.x = -0.08; }
/* ---------- The player's character: made in the creator and saved on this device ---------- */
const CHAR_OPTS = {
  gender:{ label:'Kjønn', type:'chip', opts:[['male', 'Mann'], ['female', 'Kvinne']] },
  skin:{ label:'Hudfarge', type:'swatch', opts:[['#F0CDB2', 'Veldig lys'], ['#E8BE9C', 'Lys'], ['#D9AC88', 'Lys middels'], ['#C99A76', 'Middels'], ['#B9825C', 'Gyllen'], ['#A8714C', 'Brun'], ['#7A4E33', 'Mørk'], ['#55351F', 'Veldig mørk']] },
  hairStyle:{ label:'Hår', type:'chip', opts:[['short', 'Kort'], ['long', 'Langt'], ['ponytail', 'Hestehale'], ['bun', 'Knute'], ['curly', 'Krøller'], ['bald', 'Skallet']] },
  hair:{ label:'Hårfarge', type:'swatch', opts:[['#141414', 'Svart'], ['#3A2A1C', 'Mørkebrun'], ['#6B4423', 'Brun'], ['#9C7A4A', 'Mørk blond'], ['#D8B56A', 'Blond'], ['#A0482A', 'Rød'], ['#9A9A96', 'Grå'], ['#E4E2DC', 'Hvit'], ['#D65A9A', 'Rosa'], ['#3E6FD8', 'Blå']] },
  facial:{ label:'Skjegg', type:'chip', opts:[['none', 'Ingen'], ['stubble', 'Skjeggstubb'], ['mustache', 'Bart'], ['goatee', 'Fippskjegg'], ['full', 'Helskjegg']] },
  helmet:{ label:'Hjelm', type:'swatch', opts:[['#F2F2EE', 'Hvit'], ['#E2AB22', 'Gul'], ['#E8701E', 'Oransje'], ['#C8281C', 'Rød'], ['#2F6FB5', 'Blå'], ['#2E8B57', 'Grønn'], ['#2A2D31', 'Svart']] },
  vest:{ label:'Vest', type:'swatch', opts:[['green', 'Grønn'], ['#D4E020', 'Gul'], ['#F07A12', 'Oransje'], ['#D93B2B', 'Rød'], ['#2F6FB5', 'Blå'], ['#E35A9C', 'Rosa']] }
};
const CHAR_DEFAULT = { gender:'male', skin:'#C99A76', hairStyle:'short', hair:'#3A2A1C', facial:'none', helmet:'#E2AB22', vest:'green' };
// A stored character is only used if every field is still one of the options.
function validChar(c){
  if (!c || typeof c !== 'object') return null;
  const out = {};
  for (const k in CHAR_OPTS){ if (!CHAR_OPTS[k].opts.some(([v]) => v === c[k])) return null; out[k] = c[k]; }
  return out;
}
let charSaved = validChar(store.get('vr3d:char', null));
let char = Object.assign({}, charSaved || CHAR_DEFAULT);
const sameChar = (a, b) => Object.keys(CHAR_OPTS).every(k => a[k] === b[k]);
function randomChar(){
  const female = Math.random() < 0.5, opt = k => pick(CHAR_OPTS[k].opts)[0];
  return {
    gender:female ? 'female' : 'male', skin:opt('skin'),
    hairStyle:pickWeighted(female ? [['long', 3], ['ponytail', 3], ['bun', 2], ['curly', 1.5], ['short', 1.2], ['bald', 0.2]] : [['short', 4], ['bald', 1.4], ['curly', 1.4], ['long', 0.8], ['ponytail', 0.5], ['bun', 0.5]]),
    hair:pickWeighted([['#141414', 3], ['#3A2A1C', 3], ['#6B4423', 3], ['#9C7A4A', 2], ['#D8B56A', 2], ['#A0482A', 1.2], ['#9A9A96', 1], ['#E4E2DC', 0.4], ['#D65A9A', 0.4], ['#3E6FD8', 0.4]]),
    facial:female ? 'none' : pickWeighted([['none', 3], ['stubble', 2], ['mustache', 1], ['goatee', 1], ['full', 1.6]]),
    helmet:opt('helmet'), vest:pickWeighted([['green', 3], ['#D4E020', 1], ['#F07A12', 1], ['#D93B2B', 1], ['#2F6FB5', 1], ['#E35A9C', 1]])
  };
}
const stripeSilver = mat('#DADDE0', { roughness:0.3, metalness:0.5, emissive:new THREE.Color('#FFFFFF'), emissiveIntensity:0.06 });
const vestMats = {};
// Hi-vis fabric glows a little, like fluorescent cloth does in daylight.
const vestMat = hex => vestMats[hex] || (vestMats[hex] = mat(hex, { roughness:0.65, emissive:new THREE.Color(hex), emissiveIntensity:0.12 }));
function charToHuman(c){
  const green = c.vest === 'green';
  return { female:c.gender === 'female', skin:c.skin, hair:c.hair, hairStyle:c.hairStyle, facial:c.facial, shirt:smat('#3B4148', 0.85), pants:smat('#2E3747', 0.9),
    vest:green ? M.green : vestMat(c.vest), stripe:green ? M.yellowGlow : stripeSilver, helmet:smat(c.helmet, 0.32, 0.05), gloves:smat('#C7B48A', 0.8), kneepads:true, backText:'VERNEOMBUD' };
}
let player = null, playerMats = [], playerRainbow = false;
// (Re)build the player from `char`, keeping where it stands. Each mesh gets its own material so super speed can tint them.
function buildPlayer(){
  const keep = player && { p:player.root.position.clone(), r:player.root.rotation.clone() };
  if (player){ scene.remove(player.root); disposeBaked(player.root); player.root.traverse(m => { if (m.isMesh) m.material.dispose(); }); }
  player = makeHuman(charToHuman(char)); playerMats = []; playerRainbow = false;
  player.root.traverse(m => { if (m.isMesh){ m.material = m.material.clone(); if (m.material.emissive){ m.material.userData.e0 = m.material.emissive.clone(); m.material.userData.i0 = m.material.emissiveIntensity; playerMats.push(m.material); } } });
  if (keep){ player.root.position.copy(keep.p); player.root.rotation.copy(keep.r); }
  scene.add(player.root);
}
buildPlayer();
const tagGeo = box(0.16, 0.13, 0.03), tags = [];


/* ---------- Content ---------- */
const MAX_OPEN = 5;
const OBS = {
  gass:   { kind:'low',  wid:0.95,len:0.45,h:0.38, label:'Gassflaske uten sikring', hit:'Gassflaske uten sikring. Den trillet.', tiltak:'Gassflasker skal stå oppreist og være sikret, for eksempel med kjetting i et stativ.' },
  sement: { kind:'low',  wid:0.95,len:0.6, h:0.55, label:'Sementsekker lagret i gangveien', hit:'Sementsekken sprakk. Du er nå grå.', tiltak:'Sekker lagres på pall på anvist plass, ikke i gangveien.' },
  drill:  { kind:'low',  wid:0.6, len:0.4, h:0.5,  label:'Drill lagt fra seg på gulvet', hit:'Du tråkket på drillen. Den startet.', tiltak:'Legg drillen i kofferten, ikke på gulvet.' },
  kjegle: { kind:'low',  wid:0.55,len:0.55,h:0.78, label:'Kjegle plassert midt i gangveien', hit:'Kjeglen som skulle advare deg, var selve faren.', tiltak:'Kjegler skal markere faren, ikke være den.' },
  skilt:  { kind:'tall', wid:1.35,len:0.5, h:2.0,  label:'Skilt plassert midt i gangveien', hit:'Du løp rett inn i skiltet. Det var satt opp for din sikkerhet.', tiltak:'Skilt skal varsle om fare, ikke sperre gangveien.' },
  tralle: { kind:'low',  wid:0.95,len:1.3, h:0.85, label:'Trillebår parkert i rømningsvei', hit:'Trillebåren sto i rømningsveien. Nå sitter du i trillebåren.', tiltak:'Trillebåren har ikke parkeringstillatelse i rømningsveien.' },
  barn:   { kind:'kid',  wid:0.5, len:0.5, h:1.15, label:'Barn på byggeplassen', hit:'Nesten-ulykke! Et barn løp etter fotballen rett foran deg. Du bråstoppet.', tiltak:'Sikre byggeplassen mot barn. Gjerdet skal være helt og porten lukket.' },
  laerling:{ kind:'tall', wid:0.75,len:0.6, h:2.0,  label:'Lærling som gikk og så i mobilen', hit:'Lærlingen så ikke opp fra TikTok.', tiltak:'Mobilen i lomma når du går på byggeplassen. Se deg for.' },
  bil:    { kind:'tall', wid:1.95,len:4.4, h:2.3,  label:'Varebil parkert i gangveien', hit:'Rett i varebilen. Den sto parkert i gangveien med motoren i gang.', tiltak:'Varebiler parkeres på anvist plass, ikke i gangveien.' },
  kjor:   { kind:'tall', wid:1.95,len:4.4, h:2.3,  label:'Varebil som kjørte i gangveien', hit:'Varebilen kom kjørende. Du kom deg ikke unna.', tiltak:'Skill kjøretøy og gående. Varebiler skal ikke kjøre i gangveien.' },
  stillas:{ kind:'over', wid:2.05,len:1.3, bottom:1.32, label:'Stillas uten godkjent stillaskort', hit:'Du slo hodet i stillaset. Godt du hadde hjelm.', tiltak:'Få stillaset kontrollert og merket med grønt stillaskort.' },
  hull:   { kind:'pit',  wid:1.7, len:1.8, label:'Hull i dekket uten sikring' },
  grop:   { kind:'pit',  wid:7.2, len:3.2, label:'Usikret byggegrop' },
  kappsag:{ kind:'tall', wid:4.6, len:1.6, h:2.0, label:'Kapping med kappsag midt i gangveien', hit:'Du løp inn i mannen med kappsagen. Han hørte deg ikke for støyen.', tiltak:'Kapping gjøres på avsperret område, med vanning eller avsug mot støv.' },
  tilsyn: { kind:'insp', wid:0.7, len:0.6, h:2.0, label:'Stoppet av Arbeidstilsynet' }
};
const LOWS = ['gass', 'sement', 'drill', 'kjegle', 'tralle'];
const SIGN_TEXTS = [['SE DEG', 'FOR'], ['ARBEID', 'PÅGÅR'], ['GANGVEI', 'STENGT'], ['HJELM', 'PÅBUDT'], ['FARE FOR', 'NEDFALL'], ['VIS', 'HENSYN']];
const signTexCache = {};
const MILES = { 250:'Godt i gang', 500:'Halvveis rundt blokk C', 750:'Kaffen er kald nå', 1000:'En hel kilometer med vernerunde', 1500:'Verneombudet er i form', 2000:'Dette blir en lang rapport', 3000:'Har noen sett verneombudet?' };
const EVENTS = { dust:{ warn:'Kappsag i bruk. Det blir støvete.', gear:'briller' } };

/* ---------- Obstacle and pickup builders ---------- */
function buildObstacle(type){
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
const iconTexCache = {};
function getIconTex(k){ return iconTexCache[k] || (iconTexCache[k] = iconTex(k)); }
const glowTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
const blobTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
const ringTex = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 30, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
const PICK_GLOW = { lukk:'green', app:'green', kurs:'blue', briller:'halo', ore:'yellow' };
function buildPickup(kind, name){
  const grp = new THREE.Group(), spin = new THREE.Group(); grp.add(spin);
  if (kind === 'app' || kind === 'rival'){
    addMesh(spin, new RoundedBoxGeometry(0.42, 0.76, 0.08, 3, 0.05), M.dark, 0, 0, 0);
    const scrM = new THREE.MeshBasicMaterial({ map:getIconTex(kind), transparent:true });
    if (kind === 'app') scrM.color.setScalar(1.6);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), scrM);
    scr.scale.set(1.5, 1.5, 1); scr.position.z = 0.045; spin.add(scr);
    const back = scr.clone(); back.rotation.y = Math.PI; back.position.z = -0.045; spin.add(back);
    if (kind === 'app'){ const lab = labelSprite('Grønn Jobb-appen', { height:0.3 }); lab.position.y = 0.75; grp.add(lab); }
  } else {
    const mats = [M.gold, new THREE.MeshBasicMaterial({ map:getIconTex(kind) }), new THREE.MeshBasicMaterial({ map:getIconTex(kind) })];
    const d = new THREE.Mesh(GEO.disc, mats); d.rotation.x = Math.PI / 2; d.castShadow = true; spin.add(d);
    const rim = new THREE.Mesh(GEO.pickRim, M.gold); spin.add(rim);
  }
  // halo and a pool of light on the ground; both feed the bloom pass
  const gc = PICK_GLOW[kind];
  if (gc){
    const col = new THREE.Color(P[gc]).multiplyScalar(1.8);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:col, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending, fog:false }));
    glow.scale.setScalar(kind === 'app' ? 2.0 : 1.5); glow.userData.base = 0.55; grp.add(glow); grp.userData.glow = glow;
    const ring = new THREE.Mesh(GEO.ground1, new THREE.MeshBasicMaterial({ map:ringTex, color:col, transparent:true, opacity:0.5, depthWrite:false, blending:THREE.AdditiveBlending }));
    ring.renderOrder = 2; grp.add(ring); grp.userData.ring = ring;
  }
  const shadow = new THREE.Mesh(GEO.ground1, new THREE.MeshBasicMaterial({ map:blobTex, transparent:true, depthWrite:false }));
  shadow.scale.setScalar(0.9); grp.add(shadow); grp.userData.shadow = shadow;
  grp.userData.spin = spin;
  return grp;
}

/* ---------- State ---------- */
let state = 'start', g = null, overAt = 0;
let localBest = Number(store.get('vr3d:best', 0)) || 0, remoteBest = 0;
const SPEED0 = 11, ACCEL = 0.3, BASE_CAP = Infinity, GRAV = 32, JUMP_V = 11.2, DJUMP_V = 9.4;

function clearWorld(){
  if (!g) return;
  for (const o of g.obstacles){ scene.remove(o.mesh); disposeBaked(o.mesh); }
  for (const p of g.pickups) scene.remove(p.mesh);
  for (const c of g.fx) scene.remove(c.mesh);
  for (const d of (g.dust || [])){ scene.remove(d.sp); d.sp.material.dispose(); }
  FX.dust.clear(); FX.spark.clear();
}
function newGame(){
  clearWorld();
  g = {
    t:0, dist:0, base:SPEED0, speed:SPEED0, boostF:1, boost:null,
    lane:0, x:0, y:0, vy:0, onGround:true, jumps:0, slideT:0, phase:0, invuln:0, stumble:0,
    tail:[], counts:{}, total:0, closed:0, lastAvvikM:0, streak:0, apps:0,
    briller:0, ore:0, kurs:0, ev:null, evTimer:9, nextEv:'dust', evGearSpawned:false,
    obstacles:[], pickups:[], fx:[], dust:[], extraGap:0, nextRowAt:46,
    hakeTimer:rand(3, 4.5), gearTimer:rand(8, 11), appTimer:rand(20, 28), rivalTimer:rand(9, 13), tilsynTimer:rand(18, 26), kidTimer:rand(14, 22),
    wrongApp:null, rivals:[], caught:false, fell:false, fellGrop:false, endT:0, nextMile:250, recordShown:false,
    shake:0, hitstop:0, cd:0, fov:60, fogNear:FOG.near, fogFar:FOG.far
  };
  player.root.position.set(0, 0, 0); player.root.rotation.set(0, 0, 0); poseReset(player);
  updateHud(true);
}

/* ---------- Overlays ---------- */
const capEl = $('caption'), popEl = $('pop'), popMain = $('popMain'), popSub = $('popSub'), cdEl = $('countdown');
const loadEl = $('loadbar'), loadFill = $('loadFill'), loadText = $('loadText'), superEl = $('superbar'), superLeft = $('superLeft'), superFill = $('superFill');
const wrongEl = $('wrongPill'), noiseEl = $('noiseTxt'), warnEl = $('warnTri'), flashEl = $('flash'), pauseEl = $('pauseBox');
let capT = 0, popT = 0;
function caption(text, color, life){ capEl.textContent = text; capEl.style.setProperty('--cc', `var(--${color || 'yellow'})`); capEl.classList.add('show'); capT = life || 2.6; }
function pop(text, color, life, sub){
  popEl.style.setProperty('--pc', `var(--${color || 'yellow'})`);
  popEl.style.setProperty('--tilt', (rand(-4, 3)).toFixed(1) + 'deg');
  const lines = text.split('\n'), maxLen = Math.max(...lines.map(l => l.length));
  popMain.style.fontSize = `clamp(30px, ${Math.min(10, 150 / maxLen).toFixed(2)}cqw, 116px)`;
  popMain.replaceChildren(...lines.map(l => { const d = document.createElement('div'); d.textContent = l; return d; }));
  popSub.textContent = sub || '';
  popEl.classList.remove('show'); void popEl.offsetWidth; popEl.classList.add('show');
  popT = life || 1;
}
function flash(color, strength){
  flashEl.style.setProperty('--fc', `var(--${color})`);
  return;
}
function boom(color, f, shake){ flash(color, f); g.shake = Math.max(g.shake, shake); }

/* ---------- Spawning ---------- */
const laneX = l => l * LANE;
function addObstacle(type, lane, zSpawn, extra){
  const d = OBS[type], mesh = buildObstacle(type);
  const o = Object.assign({ type, kind:d.kind, lane, x:lane === null ? 0 : laneX(lane), z:zSpawn, wid:d.wid, len:d.len, h:d.h || 0, bottom:d.bottom || 0, vz:0, hit:false, mesh }, extra || {});
  if (type === 'hull' || type === 'grop'){ o.holeMesh = mesh.userData.hole; fitPit(o); }
  mesh.position.set(o.x, 0, o.z); scene.add(mesh); g.obstacles.push(o);
  return o;
}
function fitPit(o){
  o.holeMesh.scale.set(o.wid, 1, o.len);
  const [a, b, c, d] = o.mesh.userData.lip, t = 0.16;
  a.scale.set(o.wid + 2 * t, 0.05, t); a.position.set(0, 0.02, o.len / 2 + t / 2);
  b.scale.set(o.wid + 2 * t, 0.05, t); b.position.set(0, 0.02, -o.len / 2 - t / 2);
  c.scale.set(t, 0.05, o.len); c.position.set(o.wid / 2 + t / 2, 0.02, 0);
  d.scale.set(t, 0.05, o.len); d.position.set(-o.wid / 2 - t / 2, 0.02, 0);
}
function setPitLen(o, len){ o.len = len; fitPit(o); for (const e of (o.mesh.userData.edge || [])) e.position.z = len / 2 + 0.3; if (len > 5) g.extraGap = len; }
function freeLanesNear(z, range){
  const free = [-1, 0, 1].filter(l => !g.obstacles.some(o => Math.abs(o.z - z) < range + o.len / 2 && (o.lanes ? o.lanes.includes(l) : (o.lane === null || o.lane === l))));
  return free;
}
function spawnRow(z){
  const t = g.t, lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const pats = [
    { w:4, f:() => addObstacle(pick(LOWS), lanes[0], z) },
    { w:2, min:10, f:() => { addObstacle(pick(LOWS), lanes[0], z); addObstacle(pick(LOWS), lanes[1], z); } },
    { w:2.2, min:3, f:() => addObstacle('bil', lanes[0], z - 1.5) },
    { w:1, min:16, f:() => { addObstacle('bil', lanes[0], z - 1.5); addObstacle('bil', lanes[1], z - 1.5); } },
    { w:2, min:6, f:() => addObstacle('stillas', lanes[0], z) },
    { w:1, min:14, f:() => { addObstacle('stillas', lanes[0], z); addObstacle('stillas', lanes[1], z); } },
    { w:2, min:5, f:() => { const o = addObstacle('hull', lanes[0], z); setPitLen(o, rand(1.4, 2.0)); } },
    { w:1.3, min:9, f:() => { const len = clamp(g.base * rand(0.74, 0.84), 5, 40); const o = addObstacle('hull', lanes[0], z - len / 2); setPitLen(o, len); } },
    { w:1.8, min:3, f:() => addObstacle('skilt', lanes[0], z) },
    { w:0.8, min:15, f:() => { addObstacle('skilt', lanes[0], z); addObstacle('skilt', lanes[1], z); } },
    { w:1.3, min:12, f:() => { const o = addObstacle('grop', null, z); setPitLen(o, rand(2.6, 3.4) + Math.min(1.2, (g.base - SPEED0) * 0.08)); } },
    { w:0.9, min:20, f:() => { const len = clamp(g.base * rand(0.74, 0.82), 5, 40); const o = addObstacle('grop', null, z - len / 2); setPitLen(o, len); } },
    { w:1.2, min:6, f:() => addObstacle('laerling', lanes[0], z - 4, { vz:rand(1.6, 2.6) }) },
    { w:1, min:18, f:() => { addObstacle('kjor', lanes[0], z - 25, { vz:rand(9, 13) }); sfxHonk(); } },
    { w:1, min:20, f:() => { addObstacle('bil', lanes[0], z - 1.5); addObstacle('stillas', lanes[1], z); } }
  ].filter(p => !p.min || t >= p.min);
  let total = 0; pats.forEach(p => total += p.w);
  let r = Math.random() * total;
  for (const p of pats){ r -= p.w; if (r <= 0){ p.f(); return; } }
  pats[0].f();
}
function spawnPickup(kind, name){
  const z = -110;
  let lanes = freeLanesNear(z, 3);
  let y = 1.0;
  if (!lanes.length){ lanes = [-1, 0, 1].filter(l => g.obstacles.some(o => Math.abs(o.z - z) < 3 && o.lane === l && o.kind === 'low')); y = 2.15; }
  if (!lanes.length) return false;
  const lane = pick(lanes), mesh = buildPickup(kind, name);
  const p = { kind, name, lane, x:laneX(lane), y, z, seed:Math.random() * 6, mesh };
  mesh.position.set(p.x, y, z); scene.add(mesh); g.pickups.push(p);
  return true;
}
function spawnInspector(){
  const lanes = freeLanesNear(-100, 10); if (!lanes.length) return false;
  const o = addObstacle('tilsyn', pick(lanes), -100, { vz:rand(4.5, 6.5) });
  sfxWhistle(); caption('Arbeidstilsynet kommer! Dobbelthopp over ham eller bytt fil.', 'red', 2.4);
  o.warned = true; return true;
}

/* ---------- Avvik and outcomes ---------- */
function addAvvik(type){
  const d = OBS[type], k = g.wrongApp ? 2 : 1;
  for (let i = 0; i < k; i++) g.tail.push(type);
  g.total += k; g.counts[type] = (g.counts[type] || 0) + k;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM); g.lastAvvikM = g.dist;
  const wasSuper = superOn();
  if (g.boost && g.boost.phase !== 'loading') g.boost = null;
  g.invuln = 1.0; g.hitstop = 0.1; g.stumble = 0.45; boom('red', 0.6, 0.35);
  puff(g.x, 0.4, -0.4, 14, 0.5, 0.55, 0.5, 2.2); sparkle(g.x, 1.0, -0.4, 14, COL.white, 5);
  caption(d.hit, 'red'); pop(k > 1 ? 'DOBBELT AVVIK!' : 'AVVIK!', 'red', 1.15, wasSuper ? 'Superhastigheten er over' : k > 1 ? 'Lastet ned feil app' : d.label); sfxHit();
  if (g.tail.length >= MAX_OPEN){
    state = 'ending'; g.endT = 2.0; g.ev = null; stopMusic();
    caption('Fem åpne avvik. Arbeidet stanses.', 'red', 3);
    pop('ARBEIDET\nSTANSES!', 'red', 2, 'Fem åpne avvik på en gang');
  }
}
function fallIn(o){
  g.fell = true; g.fellGrop = o.type === 'grop'; g.total++;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM);
  state = 'ending'; g.endT = 2.0; g.ev = null; stopMusic(); g.vy = 0; g.hang = 0.3;
  boom('red', 0.6, 0.3);
  caption(g.fellGrop ? 'Du falt ned i byggegropa. Arbeidet stanses.' : 'Du falt ned i hullet. Arbeidet stanses.', 'red', 3);
  pop(g.fellGrop ? 'NED I\nBYGGEGROPA!' : 'NED I\nHULLET!', 'red', 1.9, 'Arbeidet stanses');
  tone(900, 0.55, 'sine', 0.16, 110); setTimeout(() => sfxHit(), 620);
}
function caught(o){
  g.caught = true; o.caught = true; o.vz = 0; o.z = -2.3; o.x = g.x + (g.lane < 1 ? 0.95 : -0.95); g.total++;
  g.streak = Math.max(g.streak, g.dist - g.lastAvvikM);
  state = 'ending'; g.endT = 2.3; g.ev = null; stopMusic();
  boom('red', 0.6, 0.35);
  caption('Stoppet av Arbeidstilsynet.', 'red', 3);
  pop('STOPPET AV\nARBEIDSTILSYNET!', 'red', 2.1, 'Vernerunden er over');
  const bub = o.mesh.userData.bubble; o.mesh.remove(bub);
  const nb = labelSprite('Hei! Har du et øyeblikk?', { bubble:true, height:0.42 }); nb.position.set(0, 2.45, 0); o.mesh.add(nb);
  { const f = o.mesh.userData.fig; poseReset(f); f.shR.rotation.x = 2.3; f.elR.rotation.x = 0.4; f.shL.rotation.x = 0.4; f.elL.rotation.x = 1.2; o.mesh.userData.binder.position.set(0.12, 0.98, -0.2); }
  sfxWhistle(); setTimeout(() => sfxHit(), 120);
}
function knock(o, strong){
  o.hit = true;
  o.fly = { vx:(o.x >= g.x ? 1 : -1) * rand(3.5, 5.5) * (strong ? 1.4 : 1), vy:rand(2.2, 3.4), vz:-rand(4, 8), rx:rand(-5, 5), rz:rand(-5, 5), y:0 };
}
function superOn(){ return !!g.boost && (g.boost.phase === 'super' || g.boost.phase === 'down'); }
function confetti(colors, n, y){
  const geo = new THREE.PlaneGeometry(0.09, 0.13);
  for (let i = 0; i < n; i++){
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:new THREE.Color(pick(colors)), side:THREE.DoubleSide }));
    m.position.set(g.x + rand(-0.5, 0.5), y, rand(-1.5, -0.5)); scene.add(m);
    g.fx.push({ mesh:m, vx:rand(-4, 4), vy:rand(3, 9), vz:rand(-4, 1), rx:rand(-10, 10), ry:rand(-10, 10), life:rand(1.4, 2.4) });
  }
}
function collect(p){
  const pc = { lukk:P.green, app:P.green, rival:P.npc, kurs:P.blue, briller:P.halo, ore:P.yellow }[p.kind] || P.halo;
  sparkle(p.x, p.y, p.z, p.kind === 'app' ? 60 : 26, fxCol(pc, 4), p.kind === 'app' ? 6 : 4);
  if (p.kind === 'app'){ downloadApp(); return; }
  if (p.kind === 'rival'){ wrongApp(); return; }
  if (p.kind === 'lukk'){
    sfxClose(); boom('green', 0.25, 0.08);
    if (g.tail.length){ g.tail.pop(); g.closed++; pop('LUKKET!', 'green', 0.95, 'Ett avvik mindre å dra på'); }
    else pop('RYDDIG!', 'green', 0.95, 'Ingen åpne avvik å lukke');
    return;
  }
  sfxPickup(); boom(p.kind === 'kurs' ? 'blue' : 'green', 0.25, 0.08);
  if (p.kind === 'kurs'){ g.kurs = 10; pop('ARBEID I HØYDEN!', 'blue', 1.2, 'Kursbevis: trippelhopp i 10 sekunder'); }
  else if (p.kind === 'briller'){ g.briller = 14; pop('VERNEBRILLER!', 'green', 1.1, 'Nå ser du gjennom støvet'); }
  else if (p.kind === 'ore'){ g.ore = 14; pop('HØRSELVERN!', 'yellow', 1.1, 'Deilig stille'); }
}
function downloadApp(){
  if (g.wrongApp){ g.wrongApp = null; caption('Riktig app. Avvik teller normalt igjen.', 'green', 2.6); }
  const n = g.tail.length; g.apps++;
  g.closed += n; g.tail = [];
  pop('GRØNN JOBB-APPEN\nLASTET NED!', 'green', 2.0, n ? `Alle ${n} avvik lukket i én portal` : 'Alt samlet i én portal');
  boom('green', 0.7, 0.3);
  confetti([P.green, P.yellow, P.halo, P.gold, P.blue, P.orange], reduceMotion ? 40 : 110, 1.6);
  sfxCheer();
  if (g.boost && g.boost.phase !== 'loading'){ g.boost.phase = 'super'; g.boost.left = 10; }
  else if (!g.boost){ g.boost = { phase:'loading', t:0 }; stopMusic(); state = 'loading'; }
}
function wrongApp(){
  g.wrongApp = true; g.rivals.push(1);
  caption('Du lastet ned feil app.', 'red', 3);
  pop('LASTET NED\nFEIL APP!', 'red', 1.8, 'Avvik teller dobbelt til du har Grønn Jobb-appen');
  boom('red', 0.6, 0.3); sfxSad();
}
function updateBoost(dt){
  const b = g.boost; let target = 1;
  if (b){
    b.t += dt;
    if (b.phase === 'loading'){
      if (b.t >= 1.0 && !b.barSfx){ b.barSfx = true; if (soundOn && actx){ const t = actx.currentTime + 0.02; [392, 440, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99].forEach((f, i) => note(f, t + i * 0.1, 0.14, 'sine', 0.06, 0.008)); } }
      if (b.t >= 1.9){ b.phase = 'super'; b.left = 10; state = 'playing'; pop('SUPERHASTIGHET!', 'yellow', 1.4, '10 sekunder. Immun mot alle hindringer.'); boom('yellow', 0.5, 0.35); sfxWhoosh(); startMusic(); }
    } else if (b.phase === 'super'){ target = 1.75; b.left -= dt; if (b.left <= 0){ b.phase = 'down'; b.down = 1.3; } }
    else if (b.phase === 'down'){ b.down -= dt; if (b.down <= 0){ g.boost = null; g.invuln = Math.max(g.invuln, 0.6); caption('Superhastigheten er over. Immuniteten er borte.', 'green', 2.4); } }
  }
  g.boostF += (target - g.boostF) * Math.min(1, dt * (target > g.boostF ? 5 : 2));
}

/* ---------- Input ---------- */
function moveLane(d){ if (state !== 'playing') return; const nl = clamp(g.lane + d, -1, 1); if (nl !== g.lane){ g.lane = nl; sfxSwish(); } }
function jump(){
  if (state !== 'playing') return;
  if (g.onGround){ g.vy = JUMP_V; g.onGround = false; g.jumps = 1; g.slideT = 0; sfxJump(); }
  else if (g.jumps < (g.kurs > 0 ? 3 : 2)){ g.vy = DJUMP_V; g.jumps++; g.flip = 0.5; sfxJump(); tone(520, 0.12, 'square', 0.04, 1040); }
}
function slide(){
  if (state !== 'playing') return;
  if (!g.onGround){ g.vy = Math.min(g.vy, -18); g.slideQueued = true; }
  else { g.slideT = 0.75; sfxSwish(); }
}

/* ---------- Update ---------- */
function update(dt){
  g.shake = Math.max(0, g.shake - dt);
  if (g.hitstop > 0){ g.hitstop -= dt; return; }
  g.t += dt;
  g.base = Math.min(BASE_CAP, g.base + ACCEL * dt);
  updateBoost(dt);
  if (state === 'loading') return;
  g.speed = g.base * g.boostF;
  const sp = g.speed, dz = sp * dt; g.lastDz = dz;
  g.dist += dz;
  // milestones and record
  const bestM = Math.max(localBest, remoteBest);
  if (!g.recordShown && bestM > 0 && g.dist > bestM){ g.recordShown = true; pop('NY REKORD!', 'green', 1.3, 'Din lengste vernerunde hittil'); boom('green', 0.3, 0.1); sfxMult(); }
  else if (g.dist >= g.nextMile){ pop(nf.format(g.nextMile) + ' METER!', 'yellow', 1.0, MILES[g.nextMile] || 'Fortsatt på vernerunde'); boom('yellow', 0.2, 0.08); sfxMult(); }
  if (g.dist >= g.nextMile) g.nextMile += 250;

  // player motion
  const tx = laneX(g.lane);
  g.x += (tx - g.x) * Math.min(1, dt * 13);
  if (!g.onGround){
    g.vy -= GRAV * dt; g.y += g.vy * dt;
    if (g.y <= 0){ const hard = -g.vy; g.y = 0; g.vy = 0; g.onGround = true; g.jumps = 0; puff(g.x, 0.05, 0.1, clamp(hard * 0.8, 4, 14), 0.35, 0.45, 0.4, 1.2); if (g.slideQueued){ g.slideQueued = false; g.slideT = 0.7; } }
  }
  if (g.slideT > 0) g.slideT -= dt;
  g.phase += dt * Math.min(sp, 32) * 1.25;
  if (g.onGround){
    const step = Math.floor(g.phase / Math.PI);
    if (g.slideT > 0){ if (Math.random() < dt * 40) puff(g.x, 0.05, -0.3, 1, 0.3, 0.5, 0.4, 1.4); }
    else if (step !== g.lastStep){ g.lastStep = step; puff(g.x + (step % 2 ? 0.1 : -0.1), 0.04, 0.05, 2, 0.08, 0.28, 0.22, 0.6); }
  }
  for (const k of ['briller', 'ore', 'kurs']) if (g[k] > 0) g[k] = Math.max(0, g[k] - dt);
  if (g.invuln > 0) g.invuln -= dt;
  if (g.stumble > 0) g.stumble -= dt;
  if (g.flip > 0) g.flip = Math.max(0, g.flip - dt);
  if (g.onGround) g.flip = 0;

  // spawning
  while (g.dist + 112 >= g.nextRowAt){ spawnRow(-(g.nextRowAt - g.dist)); g.nextRowAt += rand(13, 21) + sp * 0.45 + (g.extraGap || 0); g.extraGap = 0; }
  g.hakeTimer -= dt; if (g.hakeTimer <= 0){ spawnPickup('lukk'); g.hakeTimer = rand(4, 6.5) * (1 + Math.min(0.8, g.t / 120)); }
  g.gearTimer -= dt; if (g.gearTimer <= 0){ spawnPickup(Math.random() < 0.45 ? 'kurs' : 'briller'); g.gearTimer = rand(10, 15); }
  g.appTimer -= dt; if (g.appTimer <= 0){ g.appTimer = spawnPickup('app') ? rand(34, 48) : 0.5; }
  g.rivalTimer -= dt; if (g.rivalTimer <= 0){ g.rivalTimer = (g.pickups.some(p => p.kind === 'app') || !spawnPickup('rival')) ? 1.5 : rand(12, 18); }
  g.tilsynTimer -= dt; if (g.tilsynTimer <= 0){ g.tilsynTimer = spawnInspector() ? rand(22, 34) : 0.6; }
  g.kidTimer -= dt; if (g.kidTimer <= 0){ spawnKids(); g.kidTimer = rand(22, 35); }

  // events
  if (!g.ev){
    g.evTimer -= dt;
    const gear = EVENTS[g.nextEv].gear;
    if (!g.evGearSpawned && g.evTimer < 3.2){ g.evGearSpawned = true; if (g[gear] < 6 && Math.random() < 0.65) spawnPickup(gear); }
    if (g.evTimer <= 0){ g.ev = { type:g.nextEv, warn:1.1, left:4.4 }; caption(EVENTS[g.nextEv].warn, 'orange', 2.2); if (g.ev.type === 'dust'){ spawnKappsag(); g.ev.left = 6; } }
  } else {
    if (g.ev.warn > 0) g.ev.warn -= dt;
    else {
      g.ev.left -= dt;
      if (g.ev.type === 'noise' && g.ore <= 0){ g.jackT = (g.jackT || 0) - dt; if (g.jackT <= 0){ sfxJack(); g.jackT = 0.065; } }
      if (g.ev.left <= 0){ g.ev = null; g.evTimer = rand(8, 12); g.nextEv = 'dust'; g.evGearSpawned = false; }
    }
  }

  // obstacles
  const sliding = g.slideT > 0 && g.onGround;
  const top = g.y + (sliding ? 0.95 : 1.8);
  for (const o of g.obstacles){
    const z0 = o.z; o.z += dz + o.vz * dt;
    if (o.fly){ o.fly.vy -= 20 * dt; o.fly.y += o.fly.vy * dt; o.x += o.fly.vx * dt; o.z += o.fly.vz * dt; o.mesh.rotation.x += o.fly.rx * dt; o.mesh.rotation.z += o.fly.rz * dt; }
    if (o.type === 'kappsag' && o.mesh.userData.blade){ o.mesh.userData.blade.rotation.y += dt * 40;
      if (o.z > -70 && !reduceMotion) for (let k = 0; k < fxN(5); k++) FX.spark.emit(o.x + 0.03, 1.08, o.z - 0.05, rand(-1, 1) * 1.5 + 3.5, rand(0.5, 3.5), rand(-1.5, 1.5), { color:COL.spark, life:rand(0.25, 0.55), size:rand(0.04, 0.08), grav:9, drag:0.6 }); }
    if (o.type === 'barn'){
      const f = o.mesh.userData.fig, ball = o.mesh.userData.ball;
      if (!o.run && o.z > o.trig){ o.run = true; caption('Barn på byggeplassen! Pass på.', 'orange', 2); }
      if (o.run){
        o.x += o.vx * dt; poseRun(f, g.t * 15 + o.z, 1.0);
        if (!o.kicked){ ball.rotation.x -= dt * 30; ball.position.y = 0.12 + Math.abs(Math.sin(g.t * 9)) * 0.08; }
      } else { poseReset(f); f.body.position.y = 0.97 + Math.abs(Math.sin(g.t * 7)) * 0.05; f.shR.rotation.x = 0.4; }
      if (o.kicked){ o.kv.y -= 18 * dt; ball.position.y = Math.max(0.12, ball.position.y + o.kv.y * dt); ball.position.z -= o.kv.z * dt; ball.rotation.x -= dt * 25; }
      else if (state === 'playing' && Math.abs(o.z) < 0.6 && Math.abs(o.x + o.dir * 1.1 - g.x) < 0.45 && g.y < 0.3){ o.kicked = true; o.kv = { y:6, z:10 }; if (actx) noiseHit(actx.currentTime, 0.08, 'lowpass', 600, 0.4); }
      if (Math.abs(o.x) > 9){ o.z = 99; }
    }
    if (o.type === 'laerling'){ const f = o.mesh.userData.fig; poseRun(f, g.t * 6.5 + o.z * 0.1, 0.42); f.shR.rotation.x = 1.15; f.elR.rotation.x = 1.55; f.shR.rotation.z = 0.25; f.head.rotation.x = -0.5; }
    if (o.type === 'tilsyn' && !o.caught){ const f = o.mesh.userData.fig; poseRun(f, g.t * 13, 0.9); f.shR.rotation.x = 0.45; f.elR.rotation.x = 1.55; }
    if (o.hit || state !== 'playing') continue;
    if (z0 > o.len / 2 + 0.35 || o.z < -(o.len / 2 + 0.35)) continue;
    if (Math.abs(o.x - g.x) > o.wid / 2 + 0.3) continue;
    if (o.kind === 'pit'){
      if (superOn()) continue;
      if (g.onGround && Math.abs(o.x - g.x) < o.wid / 2 - 0.15 && z0 < o.len / 2 - 0.2 && o.z > -(o.len / 2 - 0.2)){ o.hit = true; fallIn(o); return; }
      continue;
    }
    if (g.invuln > 0) continue;
    let hit = false;
    if (o.kind === 'low') hit = g.y < o.h - 0.05;
    else if (o.kind === 'tall') hit = g.y < o.h - 0.05;
    else if (o.kind === 'over') hit = top > o.bottom;
    else if (o.kind === 'insp') hit = g.y < o.h;
    else if (o.kind === 'kid') hit = o.run && g.y < o.h;
    if (!hit) continue;
    if (superOn()){
      if (o.kind === 'kid'){ o.hit = true; continue; }
      knock(o, true); g.shake = Math.max(g.shake, 0.15);
      if (actx) noiseHit(actx.currentTime, 0.12, 'lowpass', 1400, 0.25);
      if (o.type === 'tilsyn'){ confetti([P.paper], 30, 1.3); }
      continue;
    }
    if (o.kind === 'insp'){ caught(o); return; }
    o.hit = true;
    if (o.kind === 'low') knock(o, false);
    if (o.kind === 'over') g.vy = Math.min(g.vy, -2);
    if (o.type === 'sement') confetti(['#A39E96', '#BDB7AE', '#8F8A83'], reduceMotion ? 20 : 45, 0.7);
    addAvvik(o.type);
    if (state !== 'playing') return;
  }
  for (let i = g.obstacles.length - 1; i >= 0; i--){ const o = g.obstacles[i]; if (o.z - o.len / 2 > 12 || (o.fly && o.fly.y < -6)){ scene.remove(o.mesh); disposeBaked(o.mesh); g.obstacles.splice(i, 1); } }

  // dust clouds drift with the site
  for (let i = g.dust.length - 1; i >= 0; i--){ const d = g.dust[i]; d.z += dz; d.x += d.vx * dt; d.y += d.vy * dt; d.sp.material.rotation += dt * 0.25; if (d.z > 6){ scene.remove(d.sp); d.sp.material.dispose(); g.dust.splice(i, 1); } }
  // pickups
  for (let i = g.pickups.length - 1; i >= 0; i--){
    const p = g.pickups[i], pz0 = p.z; p.z += dz;
    if (pz0 < 0.8 && p.z > -0.8 && Math.abs(p.x - g.x) < 0.95 && p.y > g.y - 0.3 && p.y < top + 0.3){ scene.remove(p.mesh); g.pickups.splice(i, 1); collect(p); if (state !== 'playing' && state !== 'loading') return; continue; }
    if (p.z > 10){ scene.remove(p.mesh); g.pickups.splice(i, 1); }
  }
  // scenery scroll
  for (const s of scenery){ s.position.z += dz; if (s.position.z > s.userData.wrapZ) s.position.z -= LOOP; }
  for (const b of skyline){ b.position.z += dz * 0.12; if (b.position.z > 30) b.position.z -= SKY_SPAN; }
  updateHud();
}
function updateFx(dt){
  FX.dust.update(dt, g.lastDz || 0); FX.spark.update(dt, g.lastDz || 0);
  for (let i = g.fx.length - 1; i >= 0; i--){
    const c = g.fx[i]; c.life -= dt; c.vy -= 9 * dt; c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt; c.mesh.rotation.x += c.rx * dt; c.mesh.rotation.y += c.ry * dt;
    if (c.life <= 0 || c.mesh.position.y < -1){ scene.remove(c.mesh); c.mesh.material.dispose(); g.fx.splice(i, 1); }
  }
}
function updateEnding(dt){
  g.shake = Math.max(0, g.shake - dt);
  g.endT -= dt;
  if (g.fell){
    if (g.hang > 0) g.hang -= dt; else { g.vy -= GRAV * dt; g.y += g.vy * dt; if (g.y < -4) g.y = -4; }
  } else if (!g.caught){
    player.root.rotation.x = Math.max(-1.45, player.root.rotation.x - dt * 3.2);
    if (g.y > 0){ g.vy -= GRAV * dt; g.y = Math.max(0, g.y + g.vy * dt); }
  }
  if (g.endT <= 0) showGameOver();
}

/* ---------- Render ---------- */
const fogTarget = new THREE.Color();
const dustTex = canvasTex(128, 128, (c, w, h) => {
  const gr = c.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++){ c.fillStyle = `rgba(0,0,0,${rand(0.03, 0.09)})`; const a = rand(0, 6.28), r = rand(0, 50); c.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); }
});
function spawnKappsag(){
  const pair = Math.random() < 0.5 ? [-1, 0] : [0, 1], cx = (pair[0] + pair[1]) / 2 * LANE;
  // Place the saw beyond any existing obstacle instead of deleting them (deleting made distant holes vanish).
  let z = -100;
  for (let moved = true, n = 0; moved && n < 20; n++){
    moved = false;
    for (const o of g.obstacles){ if (Math.abs(o.z - z) < o.len / 2 + 14){ z = Math.min(z, o.z - o.len / 2 - 14); moved = true; } }
  }
  addObstacle('kappsag', null, z, { x:cx, lanes:pair });
  const n = reduceMotion ? 40 : 70;
  for (let i = 0; i < n; i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:dustTex, color:new THREE.Color(P.dust), transparent:true, depthWrite:false, opacity:0 }));
    const sc = rand(2.2, 5); sp.scale.set(sc, sc * rand(0.7, 1), 1); sp.material.rotation = rand(0, 6.28);
    const d = { sp, x:cx + rand(-4, 4) * (i < n * 0.6 ? 0.7 : 1.4), y:rand(0.3, 3.4), z:z + rand(-24, 9), vx:rand(-0.7, 0.7), vy:rand(0.05, 0.35), base:rand(0.38, 0.68) };
    sp.position.set(d.x, d.y, d.z); scene.add(sp); g.dust.push(d);
  }
  if (soundOn && actx){ tone(1900, 1.3, 'sawtooth', 0.02, 1500); }
}
const ballTex = canvasTex(128, 64, (c, w, h) => {
  c.fillStyle = '#F7F7F5'; c.fillRect(0, 0, w, h); c.fillStyle = '#1A1A1A';
  for (const [x, y] of [[16, 16], [48, 40], [80, 14], [112, 38], [32, 56], [96, 58], [64, 4]]){ c.beginPath(); for (let k = 0; k < 5; k++){ const a = k * Math.PI * 2 / 5 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } c.closePath(); c.fill(); }
});
function spawnKids(){
  const dir = Math.random() < 0.5 ? 1 : -1, n = Math.random() < 0.4 ? 2 : 1, z = -95;
  for (let i = 0; i < n; i++){
    const o = addObstacle('barn', null, z - i * 1.4, { x:-dir * (5.6 + i * 1.3), vx:dir * rand(3.6, 4.4), dir, run:false, trig:-(g.base * rand(1.4, 2.0) + 3), lanes:[-1, 0, 1] });
    o.mesh.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  return true;
}
/* ---------- Particles: one draw call per kind, sized in world units ---------- */
class Particles {
  constructor(max, tex, additive){
    this.max = max; this.n = 0;
    const f = k => new Float32Array(max * k);
    this.pos = f(3); this.col = f(3); this.alpha = f(1); this.size = f(1); this.rot = f(1);
    this.vel = f(3); this.age = f(1); this.life = f(1); this.a0 = f(1); this.s0 = f(1); this.grow = f(1); this.grav = f(1); this.drag = f(1); this.spin = f(1); this.scroll = f(1);
    const geo = new THREE.BufferGeometry();
    for (const [name, arr, k] of [['position', this.pos, 3], ['aColor', this.col, 3], ['aAlpha', this.alpha, 1], ['aSize', this.size, 1], ['aRot', this.rot, 1]]){ const at = new THREE.BufferAttribute(arr, k); at.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, at); }
    this.mat = new THREE.ShaderMaterial({
      uniforms:{ map:{ value:tex }, uScale:{ value:400 } }, transparent:true, depthWrite:false, fog:false,
      blending:additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader:`attribute vec3 aColor; attribute float aAlpha, aSize, aRot; uniform float uScale; varying vec3 vColor; varying float vAlpha, vRot;
        void main(){ vColor = aColor; vAlpha = aAlpha; vRot = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader:`uniform sampler2D map; varying vec3 vColor; varying float vAlpha, vRot;
        void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); vec4 t = texture2D(map, vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5);
          gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha); ${additive ? 'gl_FragColor.rgb *= gl_FragColor.a;' : ''}
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    geo.setDrawRange(0, 0);
  }
  emit(x, y, z, vx, vy, vz, o){
    const i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    const c = o.color; this.col.set([c.r, c.g, c.b], i * 3);
    this.age[i] = 0; this.life[i] = o.life || 1; this.a0[i] = o.alpha == null ? 1 : o.alpha; this.s0[i] = o.size || 0.3; this.grow[i] = o.grow || 0;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag || 0; this.rot[i] = Math.random() * 6.28; this.spin[i] = o.spin || 0; this.scroll[i] = o.scroll == null ? 1 : o.scroll;
    this.alpha[i] = 0; this.size[i] = this.s0[i];
  }
  update(dt, dz){
    let i = 0;
    while (i < this.n){
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]){ this.kill(i); continue; }
      const k = i * 3, t = this.age[i] / this.life[i], dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[k + 1] -= this.grav[i] * dt; this.vel[k] *= dr; this.vel[k + 1] *= dr; this.vel[k + 2] *= dr;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt + dz * this.scroll[i];
      if (this.pos[k + 1] < 0.02 && this.grav[i] > 0){ this.pos[k + 1] = 0.02; this.vel[k + 1] *= -0.3; this.vel[k] *= 0.6; this.vel[k + 2] *= 0.6; }
      this.alpha[i] = this.a0[i] * Math.min(1, t * 8) * (1 - t) * (1 - t * 0.3);
      this.size[i] = this.s0[i] + this.grow[i] * this.age[i]; this.rot[i] += this.spin[i] * dt;
      i++;
    }
    const geo = this.points.geometry; geo.setDrawRange(0, this.n);
    for (const a of ['position', 'aColor', 'aAlpha', 'aSize', 'aRot']) geo.attributes[a].needsUpdate = true;
  }
  kill(i){
    const j = --this.n; if (i === j) return;
    for (const [arr, k] of [[this.pos, 3], [this.vel, 3], [this.col, 3]]) for (let q = 0; q < k; q++) arr[i * k + q] = arr[j * k + q];
    for (const arr of [this.alpha, this.size, this.rot, this.age, this.life, this.a0, this.s0, this.grow, this.grav, this.drag, this.spin, this.scroll]) arr[i] = arr[j];
  }
  clear(){ this.n = 0; this.points.geometry.setDrawRange(0, 0); }
}
const puffTex = canvasTex(128, 128, (c) => {
  const r = rng(5);
  for (let i = 0; i < 14; i++){ const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, s = r() * 22 + 18, gr = c.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }
});
const sparkTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
const FX = { dust:new Particles(500, puffTex, false), spark:new Particles(500, sparkTex, true) };
const fxCol = (hex, k) => new THREE.Color(hex).multiplyScalar(k || 1);
const COL = { dust:fxCol('#C9BCA6'), dustDark:fxCol('#8F8474'), spark:fxCol('#FFB347', 6), white:fxCol('#FFFFFF', 3) };
const fxN = n => Math.max(1, Math.round(n * Q().fx));
function puff(x, y, z, n, spread, size, alpha, up){
  for (let i = 0; i < fxN(n); i++) FX.dust.emit(x + rand(-spread, spread), y + rand(0, 0.1), z + rand(-spread, spread), rand(-0.8, 0.8), rand(0.2, up || 0.9), rand(-0.3, 1.2), { color:Math.random() < 0.3 ? COL.dustDark : COL.dust, life:rand(0.5, 0.9), alpha:alpha || 0.35, size:size || 0.4, grow:1.4, drag:2.2, spin:rand(-1, 1) });
}
function sparkle(x, y, z, n, color, speed){
  for (let i = 0; i < fxN(n); i++){ const a = rand(0, 6.28), e = rand(-0.6, 1.2), v = rand(0.5, 1) * (speed || 4); FX.spark.emit(x, y, z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 1, Math.sin(a) * Math.cos(e) * v, { color, life:rand(0.35, 0.7), size:rand(0.06, 0.14), drag:2.5, grav:3, scroll:0.6 }); }
}
// speed lines while the super speed is on
const speedLines = (() => {
  const n = 70, m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.018, 1), new THREE.MeshBasicMaterial({ color:new THREE.Color('#FFFFFF').multiplyScalar(2.2), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }), n);
  m.frustumCulled = false; m.renderOrder = 6; scene.add(m);
  const L = Array.from({ length:n }, () => ({ a:rand(0, 6.28), r:rand(1.6, 6), z:rand(-50, 8), len:rand(3, 8) }));
  return { m, L };
})();
function updateSpeedLines(dt, k){
  const { m, L } = speedLines; if (reduceMotion) k = 0; m.visible = k > 0.01; m.material.opacity = k * 0.55; if (!m.visible) return;
  for (let i = 0; i < L.length; i++){
    const l = L[i]; l.z += g.speed * 2.2 * dt; if (l.z > 8){ l.z = rand(-60, -30); l.a = rand(0, 6.28); l.r = rand(1.6, 6); }
    _v3.set(camera.position.x + Math.cos(l.a) * l.r, Math.max(0.15, 1.5 + Math.sin(l.a) * l.r * 0.6), l.z); _s3.set(1, 1, l.len);
    m.setMatrixAt(i, _m4.compose(_v3, _q.identity(), _s3));
  }
  _s3.set(1, 1, 1); m.instanceMatrix.needsUpdate = true;
}

const camPos = new THREE.Vector3(0, 2.75, 5.3), camLook = new THREE.Vector3(0, 1.15, -12);
// creator view: crBlend eases the camera between the running view and a front-on portrait of the player
let crBlend = 0, camFov = 60, stageW = 1, stageH = 1;
const crFx = { hop:0, spin:0, drag:null };
function render(time, dt){
  // player pose
  const pr = player.root;
  pr.position.set(g.x, g.y, 0);
  const sliding = g.slideT > 0 && g.onGround;
  pr.rotation.y = 0;
  if (state === 'create'){
    // idle on a turntable: breathing, glancing around, a little hop and cheer when something changes
    poseReset(player); pr.rotation.z = 0;
    const br = Math.sin(time * 2.2);
    player.body.position.y = 0.97 + br * 0.006; player.shL.rotation.z = -0.1 - br * 0.02; player.shR.rotation.z = 0.1 + br * 0.02;
    player.head.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.7) * 0.18;
    if (crFx.hop > 0){
      crFx.hop = Math.max(0, crFx.hop - dt); const k = Math.sin((1 - crFx.hop / 0.5) * Math.PI);
      if (!reduceMotion) pr.position.y = k * 0.22;
      player.shL.rotation.z = -0.1 - k * 2.4; player.shR.rotation.z = 0.1 + k * 2.4; player.elL.rotation.x = player.elR.rotation.x = 0.15 + k * 0.4;
    }
    pr.rotation.y = Math.PI + crFx.spin + (reduceMotion || crFx.drag ? 0 : Math.sin(time * 0.45) * 0.45);
  } else if (state === 'playing' || state === 'countdown' || state === 'start' || state === 'paused' || state === 'loading'){
    if (state === 'start') poseReset(player);
    else if (state === 'countdown') poseReady(player);
    else if (sliding) poseSlide(player);
    else if (!g.onGround){ if (state !== 'loading' && state !== 'paused'){ poseJump(player); if (g.flip > 0 && !reduceMotion) player.body.rotation.x -= Math.PI * 2 * (1 - g.flip / 0.5); } }
    else if (state !== 'loading' && state !== 'paused'){ poseRun(player, g.phase, 0.95); if (g.stumble > 0) player.body.rotation.x = -0.55; }
    pr.rotation.z = (g.x - laneX(g.lane)) * 0.08;
  } else if (g && g.caught){ poseReset(player); player.body.rotation.x = 0.08; }
  if (player.pony){
    // the ponytail swings with the stride and flies up in jumps
    const run = state === 'playing' && g.onGround && g.slideT <= 0, air = (state === 'playing' || state === 'ending') && !g.onGround;
    const sw = reduceMotion ? 0 : Math.sin(g.phase);
    player.pony.rotation.x = -0.45 - (run ? Math.abs(sw) * 0.35 + 0.25 : 0) - (air ? 0.7 : 0);
    player.pony.rotation.z = run ? sw * 0.28 : Math.sin(time * 1.3) * 0.05;
  }
  // avvik tags dangling behind
  for (let i = 0; i < tags.length; i++){
    const t = tags[i], on = g && i < g.tail.length;
    t.visible = !!on && !(g.fell && g.y < -1);
    if (on){ const sw = Math.sin(time * 9 + i) * 0.06; t.position.set(g.x + 0.12 + sw, g.y + 0.85 - i * 0.05 + (sliding ? -0.4 : 0), 0.3 + i * 0.24); t.rotation.set(0.2, 0, sw * 3); }
  }
  // super glow and blinking
  const sup = g && superOn();
  if (sup){
    const hue = (time * (reduceMotion ? 0.4 : 2.6)) % 1, k = reduceMotion ? 0.5 : 0.45 + 0.35 * Math.abs(Math.sin(time * 16));
    playerMats.forEach((m, i) => { m.emissive.setHSL((hue + i * 0.035) % 1, 1, 0.5); m.emissiveIntensity = k; });
    playerRainbow = true;
    if (state === 'playing' && !reduceMotion) for (let i = 0; i < 2; i++) FX.spark.emit(g.x + rand(-0.3, 0.3), g.y + rand(0.3, 1.7), rand(0.1, 0.4), rand(-0.5, 0.5), rand(-0.2, 0.6), rand(2, 5), { color:new THREE.Color().setHSL((hue + rand(0, 0.3)) % 1, 1, 0.6).multiplyScalar(3), life:rand(0.3, 0.6), size:rand(0.06, 0.12), scroll:0.3 });
  } else if (playerRainbow){ for (const m of playerMats){ m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.i0; } playerRainbow = false; }

  pr.visible = !(g && g.invuln > 0 && state === 'playing' && Math.floor(g.invuln * 12) % 2 === 0);
  // pickups spin and bob
  for (const p of g.pickups){
    p.mesh.userData.spin.rotation.y = reduceMotion ? 0 : time * 2.6 + p.seed; p.mesh.position.set(p.x, p.y + Math.sin(time * 3 + p.seed) * 0.08, p.z);
    const ud = p.mesh.userData, near = clamp((-p.z - 1) / 7, 0, 1);
    if (ud.glow) ud.glow.material.opacity = ud.glow.userData.base * near * (0.85 + 0.15 * Math.sin(time * 5 + p.seed));
    const gy = 0.025 - p.mesh.position.y;
    ud.shadow.position.y = gy; ud.shadow.material.opacity = 0.5 * clamp(1.6 - p.y * 0.4, 0.3, 1);
    if (ud.ring){ ud.ring.position.y = gy + 0.005; const pulse = (time * 0.9 + p.seed) % 1; ud.ring.scale.setScalar(0.6 + pulse * 1.4); ud.ring.material.opacity = 0.55 * (1 - pulse) * near; }
  }
  for (const o of g.obstacles){
    o.mesh.position.set(o.x, o.fly ? o.fly.y : 0, o.z);
    if (o.mesh.userData.beams) for (const b of o.mesh.userData.beams) b.visible = o.z < -14;
  }
  for (const s of scenery) if (s.userData.beam) s.userData.beam.visible = s.position.z < -9;
  craneLights.forEach(l => l.visible = Math.floor(time * 1.4) % 2 === 0);
  for (const c of cranes) c.userData.slew.rotation.y = Math.sin(time * 0.06 + c.userData.slewPhase) * 0.9;

  // fog: dust from the saw
  for (const d of g.dust){ d.sp.position.set(d.x, d.y, d.z); d.sp.material.opacity = d.base * clamp((4 - d.z) / 7, 0, 1) * (g.briller > 0 ? 0.12 : 1); }
  const dustOn = false;
  const tn = dustOn ? 6 : FOG.near, tf = dustOn ? 30 : FOG.far;
  g.fogNear += (tn - g.fogNear) * Math.min(1, dt * 3); g.fogFar += (tf - g.fogFar) * Math.min(1, dt * 3);
  scene.fog.near = g.fogNear; scene.fog.far = g.fogFar;
  fogTarget.set(dustOn ? P.dust : P.fog); scene.fog.color.lerp(fogTarget, Math.min(1, dt * 2.5));

  // ground, gravel and fence scroll with the run; clouds drift and slide slowly overhead
  const gOff = (g.dist / GROUND_TILE) % 1, dOff = (g.dist / DIRT_TILE) % 1;
  TEX.ground.offset.y = TEX.groundN.offset.y = TEX.groundR.offset.y = gOff;
  TEX.dirt.offset.y = TEX.dirtN.offset.y = TEX.dirtR.offset.y = dOff;
  updateFence(g.dist);
  skyU.uCloud.value.set(time * 0.006, -g.dist * 0.0009 - time * 0.002);

  // camera
  const noiseOn = g.ev && g.ev.type === 'noise' && g.ev.warn <= 0 && g.ore <= 0;
  let sh = g.shake * 1.2 + (noiseOn ? 0.09 : 0); if (reduceMotion) sh = 0;
  let cy = 2.75 + g.y * 0.3, cz = 5.3, lookY = 1.15 + g.y * 0.35;
  if (g.fell){ cy = 3.6; lookY = Math.max(-2, g.y); }
  crBlend += ((state === 'create' ? 1 : 0) - crBlend) * Math.min(1, dt * 3.5);
  const cb = crBlend * crBlend * (3 - 2 * crBlend), portrait = stageW < 640;
  camPos.set(g.x * 0.6, cy, cz);
  if (state === 'start' && !reduceMotion) camPos.add(_v3.set(Math.sin(time * 0.35) * 0.9, Math.sin(time * 0.23) * 0.15, 0));
  if (cb > 0.0005) camPos.lerp(_v3.set(0, portrait ? 1.4 : 1.5, portrait ? 4.6 : 2.7), cb);
  camera.position.lerp(camPos, Math.min(1, dt * 8)); skyMesh.position.copy(camera.position);
  camera.position.x += rand(-sh, sh); camera.position.y += rand(-sh, sh) * 0.7;
  camLook.set(g.x * 0.75, lookY, -12);
  if (cb > 0.0005) camLook.lerp(_v3.set(0, portrait ? 1.2 : 1.27, 0), cb);
  camera.lookAt(camLook);
  if (!reduceMotion) camera.rotateZ(clamp((g.x - laneX(g.lane)) * 0.035, -0.06, 0.06) * (1 - cb));
  const tfov = (sup ? 74 : 60) * (1 - cb) + 38 * cb; camFov += (tfov - camFov) * Math.min(1, dt * 4);
  if (Math.abs(camera.fov - camFov) > 0.05){ camera.fov = camFov; camera.updateProjectionMatrix(); }
  // shift the frame so the figure sits beside the creator panel (left of it on wide screens, above it on narrow ones)
  if (cb > 0.001) camera.setViewOffset(stageW, stageH, portrait ? 0 : 0.21 * stageW * cb, portrait ? 0.21 * stageH * cb : 0, stageW, stageH);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  // effects
  const pxScale = renderer.getDrawingBufferSize(_v2).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  FX.dust.mat.uniforms.uScale.value = FX.spark.mat.uniforms.uScale.value = pxScale;
  const boostK = clamp((g.boostF - 1) / 0.75, 0, 1);
  updateSpeedLines(dt, boostK);
  post.bloom = 0.55 + boostK * 0.35; post.zoom = boostK * 0.1; post.aberr = 0.0011 + boostK * 0.005 + g.shake * 0.02;
  post.render(time);

  // overlays
  if (capT > 0){ capT -= dt; if (capT <= 0) capEl.classList.remove('show'); }
  if (popT > 0){ popT -= dt; if (popT <= 0) popEl.classList.remove('show'); }
  noiseEl.classList.toggle('show', !!(g.ev && g.ev.type === 'noise' && g.ev.warn <= 0));
  noiseEl.classList.toggle('calm', g.ore > 0); noiseEl.textContent = g.ore > 0 ? 'brrt' : 'BRRRRRRT';
  warnEl.classList.toggle('show', !!(g.ev && g.ev.warn > 0));
  const loading = g.boost && g.boost.phase === 'loading' && g.boost.t >= 1.0;
  loadEl.classList.toggle('show', !!loading);
  if (loading){ const pr2 = clamp((g.boost.t - 1.0) / 0.85, 0, 1), e = pr2 < 0.5 ? 2 * pr2 * pr2 : 1 - Math.pow(-2 * pr2 + 2, 2) / 2; loadFill.style.width = (e * 100).toFixed(1) + '%'; loadText.textContent = 'Installerer superhastighet … ' + Math.round(e * 100) + ' %'; }
  superEl.classList.toggle('show', !!sup);
  if (sup){ const left = g.boost.phase === 'super' ? g.boost.left : 0; superLeft.textContent = Math.ceil(left) + ' s'; superFill.style.width = clamp(left / 10, 0, 1) * 100 + '%'; }
  wrongEl.classList.toggle('show', !!g.wrongApp && (state === 'playing' || state === 'ending'));
  if (g.wrongApp) wrongEl.textContent = 'Lastet ned feil app: avvik teller dobbelt';
}

/* ---------- HUD ---------- */
const slotsEl = $('slots'), hudMeters = $('hudMeters');
const chips = { briller:$('chipBriller'), kurs:$('chipKurs') };
for (let i = 0; i < MAX_OPEN; i++) slotsEl.appendChild(document.createElement('i'));
let lastHud = {};
function updateHud(force){
  if (force) lastHud = {};
  const m = Math.floor(g.dist);
  if (m !== lastHud.m){ hudMeters.textContent = fmtM(m); lastHud.m = m; }
  if (g.tail.length !== lastHud.n){ [...slotsEl.children].forEach((el, i) => el.classList.toggle('on', i < g.tail.length)); lastHud.n = g.tail.length; }
  for (const k in chips){ const on = g[k] > 0; if (on !== lastHud[k]){ chips[k].classList.toggle('on', on); lastHud[k] = on; } }
}

/* ---------- Sizing and fullscreen ---------- */
const gameEl = $('gameEl');
function resize(){
  const r = stage.getBoundingClientRect();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().dpr));
  renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
  stageW = Math.max(1, r.width); stageH = Math.max(1, r.height);
  camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  post.resize();
}
// graphics quality: a button cycles auto, high, medium and low; auto also steps down by itself if frames are slow
const gfxBtn = $('gfxBtn');
function syncGfxBtn(){ gfxBtn.textContent = 'Grafikk: ' + (gfxPref === 'auto' ? `auto (${GFX_LABEL[gfxTier]})` : GFX_LABEL[gfxPref]); }
function setTier(t){ gfxTier = t; post.setup(); fitShadow(); resize(); syncGfxBtn(); }
gfxBtn.addEventListener('click', () => {
  const order = ['auto', 'high', 'medium', 'low'];
  gfxPref = order[(order.indexOf(gfxPref) + 1) % order.length]; store.set('vr3d:gfx', gfxPref);
  setTier(gfxPref === 'auto' ? (coarse ? 'medium' : 'high') : gfxPref);
});
const perf = { acc:0, n:0 };
function watchPerf(rawDt){
  if (gfxPref !== 'auto' || state !== 'playing' || gfxTier === 'low' || document.hidden) { perf.acc = perf.n = 0; return; }
  perf.acc += Math.min(rawDt, 0.1); perf.n++;
  if (perf.n >= 150){ const avg = perf.acc / perf.n; perf.acc = perf.n = 0; if (avg > 1 / 40) setTier(gfxTier === 'high' ? 'medium' : 'low'); }
}
window.addEventListener('resize', resize);
const fsBtn = $('fsBtn'), fsExit = $('fsExit');
const fsActive = () => gameEl.classList.contains('fs');
const nativeFs = () => document.fullscreenElement || document.webkitFullscreenElement;
function setFsClass(on){ gameEl.classList.toggle('fs', on); document.body.classList.toggle('fs-on', on); fsBtn.textContent = on ? 'Avslutt fullskjerm' : 'Fullskjerm'; requestAnimationFrame(resize); }
async function enterFs(){
  setFsClass(true);
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !nativeFs()){ try { await req.call(el, { navigationUI:'hide' }); } catch (e) {} }
}
async function exitFs(){ setFsClass(false); const ex = document.exitFullscreen || document.webkitExitFullscreen; if (nativeFs() && ex){ try { await ex.call(document); } catch (e) {} } }
function toggleFs(){ if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return fsActive() ? exitFs() : enterFs(); }
fsBtn.addEventListener('click', toggleFs);
fsExit.addEventListener('click', e => { e.stopPropagation(); exitFs(); });
const onFsChange = () => { if (!nativeFs() && fsActive()) setFsClass(false); else requestAnimationFrame(resize); };
document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);

/* ---------- Flow ---------- */
const startModal = $('startModal'), overModal = $('overModal');
function startGame(){
  ensureAudio(); newGame(); state = 'countdown'; g.cd = 2.1; showCount(3);
  startModal.hidden = true; overModal.hidden = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  sfxBeep(false);
}
function showCount(n){ cdEl.textContent = String(n); cdEl.classList.remove('show'); void cdEl.offsetWidth; cdEl.classList.add('show'); }
function pause(){ if (state === 'playing'){ state = 'paused'; stopMusic(); pauseEl.classList.add('show'); } }
function resume(){ if (state === 'paused'){ state = 'playing'; startMusic(); pauseEl.classList.remove('show'); } }

const OBS_DONE = new Set(['hull', 'grop', 'tilsyn']);
async function showGameOver(){
  state = 'over'; overAt = performance.now(); stopMusic();
  const m = Math.floor(g.dist);
  g.streak = Math.max(g.streak, m - g.lastAvvikM);
  $('stMeters').textContent = fmtM(m);
  $('stTime').textContent = Math.floor(g.t / 60) + ':' + String(Math.floor(g.t % 60)).padStart(2, '0');
  $('stApps').textContent = String(g.apps);
  $('stStreak').textContent = fmtM(g.streak);
  $('stTotal').textContent = String(g.total);
  $('stClosed').textContent = String(g.closed);
  $('overQuote').textContent = g.caught ? '«Hei! Har du et øyeblikk?»' : g.fell ? '«Er det noen som ser verneombudet?»' : '«Vi tar en prat i brakka.»';
  $('overTitle').textContent = g.caught ? 'Pålegg' : 'Avviksrapport';
  $('stamp').textContent = g.caught ? 'Stoppet av tilsynet' : 'Arbeidet stanset';
  const ol = $('findings'); ol.replaceChildren();
  const add = (title, tiltak) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = title; const s = document.createElement('span'); s.textContent = 'Tiltak: ' + tiltak; li.append(b, s); ol.appendChild(li); };
  if (g.caught) add('Vernerunden ble stoppet av Arbeidstilsynet', 'Les gjennom permen med avvik, og svar på pålegget innen tre uker.');
  if (g.fell && g.fellGrop) add('Verneombudet falt ned i en usikret byggegrop', 'Sett opp rekkverk rundt byggegropa, og hent verneombudet opp.');
  else if (g.fell) add('Verneombudet falt ned i et usikret hull i dekket', 'Hent verneombudet opp. Dekk deretter til og merk hullet. En lapp med «pass på» er ikke merking.');
  if (g.rivals.length) add('Lastet ned feil app' + (g.rivals.length > 1 ? ` (${g.rivals.length} ganger)` : ''), 'Avinstaller, og last ned Grønn Jobb-appen.');
  Object.entries(g.counts).filter(([k]) => !OBS_DONE.has(k)).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => add(OBS[k].label + (n > 1 ? ` (${n} ganger)` : ''), OBS[k].tiltak));
  if (!ol.children.length) add('Ingen funn', 'Fortsett det gode arbeidet.');
  const rec = $('overRecord'), prev = Math.max(localBest, remoteBest);
  rec.textContent = (m > prev && m > 0) ? 'Ny personlig rekord!' : 'Din lengste vernerunde: ' + fmtM(prev) + '.';
  if (m > localBest){ localBest = m; store.set('vr3d:best', localBest); }
  lastRun = { meters:m, secs:Math.round(g.t), saved:false };
  saveBtn.disabled = !db || m <= 0;
  saveMsg.textContent = !db ? 'Topplisten er ikke tilgjengelig her, så resultatet kan ikke lagres.' : m <= 0 ? 'Gå minst én meter for å komme på listen.' : '';
  overModal.hidden = false;
  if (db && m > 0){ nameInput.focus({ preventScroll:true }); nameInput.select(); } else $('againBtn').focus({ preventScroll:true });
  if (!db) renderLocalBoard(); else if (typeof loadBoard === 'function') loadBoard();
}
$('startBtn').addEventListener('click', () => requestStart());
const startOv = $('startOv'), playBtn = $('playBtn'), creatorEl = $('creator'), crGroups = $('crGroups'), charBtn = $('charBtn'), charBtn2 = $('charBtn2');
let uiState = '';
function syncStartUi(){
  startOv.hidden = !(state === 'start' && startModal.hidden);
  creatorEl.hidden = state !== 'create'; stage.classList.toggle('creating', state === 'create');
  charBtn.textContent = charSaved ? 'Endre figur' : 'Lag figur';
  playBtn.textContent = (state === 'playing' || state === 'paused' || state === 'countdown' || state === 'loading') ? 'Start på nytt' : 'Start spillet';
  uiState = state + (startModal.hidden ? '' : '+rules');
}
function openRules(){ if (state === 'playing') pause(); startModal.hidden = false; syncStartUi(); $('startBtn').focus({ preventScroll:true }); }
function closeRules(){ startModal.hidden = true; syncStartUi(); if (state === 'start') $('startBtn2').focus({ preventScroll:true }); }
$('rulesClose').addEventListener('click', closeRules);
$('rulesBtn').addEventListener('click', openRules);
$('rulesBtn2').addEventListener('click', openRules);
$('startBtn2').addEventListener('click', () => requestStart());
playBtn.addEventListener('click', () => { playBtn.blur(); requestStart(); });
startModal.addEventListener('click', e => { if (e.target === startModal) closeRules(); });
$('againBtn').addEventListener('click', () => { if (performance.now() - overAt > 600) startGame(); });

/* ---------- Character creator ---------- */
// The first start goes through the creator; after that the saved figure is used straight away.
function requestStart(){
  if (state === 'create'){ saveAndStart(); return; }
  if (!charSaved && state !== 'playing' && state !== 'paused') openCreator();
  else startGame();
}
let crBackup = null;
for (const [key, def] of Object.entries(CHAR_OPTS)){
  const fs = document.createElement('fieldset'); fs.className = 'cr-group';
  const lg = document.createElement('legend'); lg.textContent = def.label;
  const row = document.createElement('div'); row.className = 'cr-opts';
  for (const [v, label] of def.opts){
    const lab = document.createElement('label'); lab.className = 'cr-opt ' + (def.type === 'swatch' ? 'cr-sw' : 'cr-chip');
    const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'cr-' + key; inp.value = v;
    const vis = document.createElement('span');
    if (def.type === 'swatch'){ vis.className = 'dot'; vis.style.setProperty('--c', v === 'green' ? 'var(--green)' : v); lab.title = label; inp.setAttribute('aria-label', label); }
    else vis.textContent = label;
    lab.append(inp, vis); row.appendChild(lab);
  }
  fs.append(lg, row); crGroups.appendChild(fs);
}
function syncCreatorUi(){ for (const k in CHAR_OPTS) for (const inp of creatorEl.querySelectorAll(`input[name="cr-${k}"]`)) inp.checked = inp.value === char[k]; }
function charChanged(){
  buildPlayer(); crFx.hop = 0.5;
  sparkle(0, 1.95, 0, 16, fxCol(P.yellow, 3), 2.2); sfxPickup();
}
function openCreator(){
  if (state === 'playing' || state === 'paused') return;
  ensureAudio();
  startModal.hidden = true; overModal.hidden = true;
  crBackup = Object.assign({}, char);
  newGame(); state = 'create'; crFx.spin = 0;
  $('crCancel').hidden = !charSaved;
  syncCreatorUi(); syncStartUi();
  crGroups.scrollTop = 0;
  const first = creatorEl.querySelector('input:checked'); if (first) first.focus({ preventScroll:true });
}
function closeCreator(){
  state = 'start'; syncStartUi();
  $('startBtn2').focus({ preventScroll:true });
}
function cancelCreator(){
  if (crBackup && !sameChar(crBackup, char)){ char = crBackup; buildPlayer(); }
  closeCreator();
}
function saveAndStart(){
  charSaved = Object.assign({}, char); store.set('vr3d:char', charSaved);
  startGame();
}
creatorEl.addEventListener('change', e => {
  const t = e.target;
  if (!t.name || !t.name.startsWith('cr-')) return;
  char[t.name.slice(3)] = t.value; charChanged();
});
creatorEl.addEventListener('submit', e => { e.preventDefault(); saveAndStart(); });
$('crRandom').addEventListener('click', () => { let c; do { c = randomChar(); } while (sameChar(c, char)); char = c; syncCreatorUi(); charChanged(); });
$('crNew').addEventListener('click', () => { char = Object.assign({}, CHAR_DEFAULT); syncCreatorUi(); charChanged(); });
$('crCancel').addEventListener('click', cancelCreator);
charBtn.addEventListener('click', openCreator);
charBtn2.addEventListener('click', openCreator);
// drag the figure to turn it
canvas.addEventListener('pointerdown', e => { if (state === 'create'){ crFx.drag = { x:e.clientX }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } });
window.addEventListener('pointermove', e => { if (crFx.drag && state === 'create'){ crFx.spin += (e.clientX - crFx.drag.x) * 0.012; crFx.drag.x = e.clientX; } });
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => { crFx.drag = null; });

window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && !startModal.hidden){ e.preventDefault(); closeRules(); return; }
  if (e.code === 'Escape' && state === 'create'){ e.preventDefault(); cancelCreator(); return; }
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyF' && !e.repeat){ e.preventDefault(); toggleFs(); return; }
  if (e.code === 'Escape' && fsActive() && state !== 'playing' && state !== 'paused'){ exitFs(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape'){
    if (state === 'playing'){ pause(); e.preventDefault(); return; }
    if (state === 'paused'){ resume(); e.preventDefault(); return; }
  }
  const k = e.code;
  const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Enter'];
  if (!game.includes(k)) return;
  if (state === 'playing'){
    e.preventDefault(); if (e.repeat) return;
    if (k === 'ArrowLeft' || k === 'KeyA') moveLane(-1);
    else if (k === 'ArrowRight' || k === 'KeyD') moveLane(1);
    else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') jump();
    else if (k === 'ArrowDown' || k === 'KeyS') slide();
    return;
  }
  if (state === 'paused'){ e.preventDefault(); resume(); return; }
  if (state === 'countdown' || state === 'loading' || state === 'ending'){ e.preventDefault(); return; }
  if (e.target && e.target.tagName === 'BUTTON') return;
  if ((k === 'Space' || k === 'Enter') && (state === 'start' || (state === 'over' && performance.now() - overAt > 700))){ e.preventDefault(); requestStart(); }
});
let touch = null;
canvas.addEventListener('pointerdown', e => { ensureAudio(); touch = { x:e.clientX, y:e.clientY, t:performance.now() }; if (state === 'paused') resume(); });
window.addEventListener('pointerup', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch = null;
  if (state !== 'playing') return;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < 24 && ay < 24) jump();
  else if (ax > ay) moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) jump(); else slide();
});
window.addEventListener('pointercancel', () => { touch = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ---------- Loop ---------- */
post.setup();
newGame();
resize();
syncGfxBtn();
camera.position.copy(camPos); camera.lookAt(camLook);
drawIconCanvases();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawIconCanvases(); makeSignTextures(); if (backTex) repaint(backTex); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
new MutationObserver(applyTheme).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
applyTheme();
let last = performance.now();
function frame(now){
  if (uiState !== state + (startModal.hidden ? '' : '+rules')) syncStartUi();
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.033, raw); last = now;
  watchPerf(raw);
  if (g) g.lastDz = 0;
  if (state === 'playing' || state === 'loading') update(dt);
  else if (state === 'countdown'){
    const before = Math.ceil(g.cd / 0.7 - 0.001); g.cd -= dt; const after = Math.ceil(g.cd / 0.7 - 0.001);
    if (g.cd <= 0){ state = 'playing'; cdEl.classList.remove('show'); pop('GÅ!', 'green', 0.8); sfxBeep(true); startMusic(); }
    else if (after !== before){ showCount(after); sfxBeep(false); }
  } else if (state === 'ending') updateEnding(dt);
  if (g) updateFx(dt);
  render(now / 1000, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => $('startBtn').focus({ preventScroll:true }), 60);

/* ---------- Leaderboard (JSONsilo) ---------- */
// The shared high-score list lives on JSONsilo, under the field "scores3d".
// The same silo also holds the 2D game's list ("scores"), so every save keeps the other fields.
// NB: this is a Manage key. It gives full access to the JSONsilo account, and anyone
// who opens this page can read it in the source. It expires on 26 November 2026.
const JSONSILO = {
  base: 'https://api.jsonsilo.com',
  silo: 'b7c422d1-4115-4ee6-be72-81621f728da9',
  key:  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX3V1aWQiOiJNQk85bDFCY0pVV0JJMVJ3c3BMZ0V0cTBBMHoxIiwiaXNzIjoiaHR0cHM6Ly9qc29uc2lsby5jb20iLCJleHAiOjE3OTU3MDQ1NTR9.Pdj1EBHgHhXFBwE2r-8JXkhf1QtOUF7OK5KIWjAqkMY',
  field: 'scores3d'
};
const READ_URL = `${JSONSILO.base}/public/${JSONSILO.silo}`;
const MANAGE_URL = `${JSONSILO.base}/api/v1/manage/${JSONSILO.silo}`;
let db = !!(JSONSILO.silo && JSONSILO.key), boardDocs = [], lastRun = null, siloMeta = null, loading = false;
const myEntries = new Set();
const boardEl = $('board'), boardNote = $('boardNote');
const saveForm = $('saveForm'), nameInput = $('nameInput'), saveBtn = $('saveBtn'), saveMsg = $('saveMsg');
nameInput.value = store.get('vr:name', '');
const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function sanitize(list){
  return (Array.isArray(list) ? list : [])
    .map(v => ({ id:String((v && v.id) || ''), name:cleanName(v && v.name), meters:Math.floor(Number(v && v.meters)), secs:Number(v && v.secs) || 0, at:Number(v && v.at) || 0 }))
    .filter(v => v.id && Number.isFinite(v.meters) && v.meters >= 0 && v.meters < 1e7)
    .sort((a, b) => b.meters - a.meters || a.at - b.at);
}
function renderLocalBoard(){
  boardEl.replaceChildren();
  boardNote.textContent = localBest > 0 ? `Topplisten er ikke tilgjengelig. Din lengste vernerunde på denne enheten: ${fmtM(localBest)}.` : 'Topplisten er ikke tilgjengelig. Din lengste runde huskes på denne enheten.';
}
function renderBoard(){
  if (!boardDocs.length){ boardEl.replaceChildren(); boardNote.textContent = 'Ingen runder lagret ennå. Bli den første.'; return; }
  const frag = document.createDocumentFragment();
  boardDocs.forEach((d, i) => {
    const li = document.createElement('li'); if (myEntries.has(d.id)) li.classList.add('me');
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(i + 1);
    const name = document.createElement('span'); name.className = 'name'; name.textContent = (d.name || 'Uten navn') + (myEntries.has(d.id) ? ' (deg)' : '');
    const val = document.createElement('span'); val.className = 'val'; val.textContent = fmtM(d.meters);
    li.append(rank, name, val); frag.appendChild(li);
  });
  boardEl.replaceChildren(frag); boardNote.textContent = 'De ti lengste vernerundene.';
}
async function fetchAll(){
  const res = await fetch(READ_URL, { cache:'no-store' });
  if (!res.ok) throw Object.assign(new Error('read'), { status:res.status });
  const data = await res.json();
  return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}
// The list is fetched when the page opens, after each round and after each save. No polling.
async function loadBoard(){
  if (!db){ renderLocalBoard(); return; }
  if (loading) return; loading = true;
  try { boardDocs = sanitize((await fetchAll())[JSONSILO.field]).slice(0, 10); renderBoard(); }
  catch (e) { if (!boardDocs.length) boardNote.textContent = 'Topplisten kunne ikke hentes akkurat nå.'; }
  finally { loading = false; }
}
async function getMeta(){
  if (siloMeta) return siloMeta;
  const res = await fetch(`${JSONSILO.base}/api/v1/manage/meta/${JSONSILO.silo}`, { headers:{ 'X-MAN-API':JSONSILO.key } });
  if (!res.ok) throw Object.assign(new Error('meta'), { status:res.status });
  siloMeta = await res.json();
  return siloMeta;
}
async function saveScore(entry){
  const meta = await getMeta();
  const all = await fetchAll();
  const list = sanitize(all[JSONSILO.field]); list.push(entry);
  const scores = sanitize(list).slice(0, 200);
  const file_data = Object.assign({}, all, { [JSONSILO.field]:scores });
  const res = await fetch(MANAGE_URL, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', 'X-MAN-API':JSONSILO.key },
    body:JSON.stringify({ file_name:meta.file_name, region_name:meta.region_name || 'api', is_public:meta.is_public !== false, file_data })
  });
  if (!res.ok) throw Object.assign(new Error('save'), { status:res.status });
  return scores;
}
saveForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!lastRun || lastRun.saved || !db) return;
  const name = cleanName(nameInput.value);
  if (!name){ saveMsg.textContent = 'Skriv inn et navn først.'; nameInput.focus(); return; }
  nameInput.value = name; store.set('vr:name', name);
  saveBtn.disabled = true; saveMsg.textContent = 'Lagrer …';
  const entry = { id:newId(), name, meters:lastRun.meters, secs:lastRun.secs, at:Date.now() };
  try {
    const scores = await saveScore(entry);
    lastRun.saved = true; myEntries.add(entry.id);
    boardDocs = scores.slice(0, 10); renderBoard();
    const place = scores.findIndex(s => s.id === entry.id) + 1;
    saveMsg.textContent = place > 0 && place <= 10 ? `Lagret som «${name}», på ${place}. plass.` : `Lagret som «${name}».`;
    $('againBtn').focus({ preventScroll:true });
  } catch (err) {
    saveBtn.disabled = false;
    saveMsg.textContent = (err && (err.status === 401 || err.status === 403)) ? 'Nøkkelen til topplisten virker ikke. Den kan ha utløpt.' : 'Kunne ikke lagre akkurat nå. Sjekk nettforbindelsen og prøv igjen.';
  }
});
loadBoard();
})();
