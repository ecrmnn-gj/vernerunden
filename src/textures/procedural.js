// Procedural texture helpers: seeded random numbers, height-to-normal maps, grain and soft blobs.

export const TEX = {};
// Seeded random numbers, so a texture repainted for a new theme keeps the same cracks, stains and puddles.
export function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function mkCanvas(w, h){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d', { willReadFrequently:true }); return cv; }
// Turns a greyscale height canvas into a tangent-space normal map.
export function normalFromHeight(hc, strength, wrapX, wrapY){
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
export function grain(c, w, h, amt, seed, mono){
  const img = c.getImageData(0, 0, w, h), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4){ const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += mono ? n : n * 0.96; d[i + 2] += mono ? n : n * 0.9; }
  c.putImageData(img, 0, 0);
}
export function softBlob(c, x, y, rx, ry, color, a){
  c.save(); c.translate(x, y); c.scale(rx, ry); c.globalAlpha = a;
  const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, color); gr.addColorStop(0.6, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
}
