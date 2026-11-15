// Web Audio: the shared context, synth helpers and the background music sequencer.
import { clamp, store } from '../core/utils.js';
import { g } from '../game/state.js';

export let actx = null, master = null, noiseBuf = null, soundOn = store.get('vr3d:sound', true);
export function setSoundOn(on){ soundOn = on; }
export function ensureAudio(){
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
export function tone(freq, dur, type, vol, slideTo, at){
  if (!soundOn || !actx) return;
  const t = at || actx.currentTime, o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
export function noiseHit(t, dur, type, freq, vol){
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
export function startMusic(){ if (!soundOn || !actx) return; music.on = true; music.next = actx.currentTime + 0.06; music.step = 0; }
export function stopMusic(){ music.on = false; }
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
