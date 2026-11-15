// Graphics quality tiers. "auto" picks a tier from the device and steps down when the frame rate drops.
import { store } from './utils.js';

// auto picks a tier from the device and steps down if the frame rate drops. The choice is remembered per device.
const GFX_TIERS = {
  high:   { dpr:2,    post:true,  msaa:4, shadow:[2048, 4096], fx:1 },
  medium: { dpr:1.5,  post:true,  msaa:2, shadow:[1024, 2048], fx:0.7 },
  low:    { dpr:1,    post:false, msaa:0, shadow:[1024, 2048], fx:0.4 }
};
export const GFX_LABEL = { auto:'auto', high:'høy', medium:'middels', low:'lav' };
export const coarse = matchMedia('(pointer: coarse)').matches;
export let gfxPref = store.get('vr3d:gfx', 'auto'); if (!GFX_LABEL[gfxPref]) gfxPref = 'auto';
export let gfxTier = gfxPref === 'auto' ? (coarse ? 'medium' : 'high') : gfxPref;
export const Q = () => GFX_TIERS[gfxTier];
export function setGfxTier(t){ gfxTier = t; }
export function setGfxPref(p){ gfxPref = p; }
