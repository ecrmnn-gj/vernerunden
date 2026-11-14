// Sound effects and the sound on/off button.
import { $, store } from '../core/utils.js';
import { state } from '../game/state.js';
import { actx, master, soundOn, setSoundOn, ensureAudio, tone, noiseHit, startMusic, stopMusic } from './audio.js';

export const sfxPickup = () => tone(760, 0.12, 'sine', 0.14, 1320);
export const sfxClose = () => { tone(660, 0.1, 'sine', 0.14, 990); setTimeout(() => tone(990, 0.14, 'sine', 0.14, 1320), 90); };
export const sfxHit = () => { tone(170, 0.3, 'triangle', 0.3, 50); if (actx) noiseHit(actx.currentTime, 0.18, 'lowpass', 900, 0.35); };
export const sfxJump = () => tone(320, 0.16, 'square', 0.04, 640);
export const sfxSwish = () => { if (actx) noiseHit(actx.currentTime, 0.12, 'bandpass', 2400, 0.08); };
export const sfxBeep = hi => tone(hi ? 880 : 440, hi ? 0.3 : 0.14, 'square', 0.08);
export const sfxMult = () => { tone(520, 0.08, 'square', 0.07); setTimeout(() => tone(780, 0.12, 'square', 0.07), 70); };
export const sfxJack = () => tone(70 + Math.random() * 30, 0.05, 'sawtooth', 0.06);
export function note(freq, t, dur, type, vol, attack){
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + (attack || 0.02)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
export function sfxCheer(){
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
export function sfxWhoosh(){
  if (!soundOn || !actx) return;
  const t = actx.currentTime + 0.02;
  const o = actx.createOscillator(), gn = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.45);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.1, t + 0.05); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(gn).connect(master); o.start(t); o.stop(t + 0.6);
  for (const f of [392, 493.88, 587.33, 783.99]) note(f, t + 0.42, 0.7, 'triangle', 0.07, 0.02);
}
export function sfxHonk(){ if (!soundOn || !actx) return; const t = actx.currentTime; [0, 0.2].forEach(d => { tone(370, 0.14, 'square', 0.07, null, t + d); tone(466, 0.14, 'square', 0.05, null, t + d); }); }
export function sfxWhistle(){ if (!soundOn || !actx) return; const t = actx.currentTime; [0, 0.24].forEach(d => { tone(2300, 0.18, 'sine', 0.1, 2050, t + d); tone(2420, 0.18, 'sine', 0.05, 2150, t + d); }); }
export function sfxSad(){ if (!soundOn || !actx) return; const t = actx.currentTime; [392, 370, 349.2].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, f * 0.97, t + i * 0.32)); tone(330, 0.9, 'triangle', 0.16, 300, t + 0.96); }
const soundBtn = $('soundBtn');
function syncSoundBtn(){ soundBtn.textContent = soundOn ? 'Lyd og musikk på' : 'Lyd og musikk av'; soundBtn.setAttribute('aria-pressed', String(soundOn)); }
soundBtn.addEventListener('click', () => { setSoundOn(!soundOn); store.set('vr3d:sound', soundOn); syncSoundBtn(); if (soundOn){ ensureAudio(); if (state === 'playing') startMusic(); } else stopMusic(); });
syncSoundBtn();
