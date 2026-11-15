// Canvas textures for the generated figure, made on the main thread and cached.
import * as THREE from 'three';
import { canvasTex } from '../../textures/canvas.js';
import { mulberry32 } from './gen/rng.js';

const irisCache = new Map();
// An eyeball texture for a sphere whose top pole faces forward: pupil, iris with radial fibres and a dark limbal
// ring, then the white. Rows run from the front pole (top) to the back; columns go round the eye.
export function irisTexture(hex){
  if (irisCache.has(hex)) return irisCache.get(hex);
  let tex = null;
  try {
    tex = canvasTex(128, 256, (c, w, h) => {
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
    });
  } catch (e){ tex = null; } // no canvas (tests): plain white eyes
  irisCache.set(hex, tex);
  return tex;
}
