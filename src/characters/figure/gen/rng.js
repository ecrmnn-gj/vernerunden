// Seeded randomness for the figure generator. Nothing in gen/ may use Math.random: the same options must always
// give the same mesh, so cached parts and tests stay valid.

// FNV-1a hash of a string to a 32-bit seed.
export function fnv1a(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function mulberry32(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Integer lattice hash to [-1, 1].
function hash3(seed, x, y, z){
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x1b873593);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 2147483647.5 - 1;
}
// Smooth 3D value noise in [-1, 1] with a quintic fade, so its gradient is continuous (no creases in warped surfaces).
export function valueNoise3(seed){
  const s = seed | 0;
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10), w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
    const c000 = hash3(s, xi, yi, zi), c100 = hash3(s, xi + 1, yi, zi), c010 = hash3(s, xi, yi + 1, zi), c110 = hash3(s, xi + 1, yi + 1, zi);
    const c001 = hash3(s, xi, yi, zi + 1), c101 = hash3(s, xi + 1, yi, zi + 1), c011 = hash3(s, xi, yi + 1, zi + 1), c111 = hash3(s, xi + 1, yi + 1, zi + 1);
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u, x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  };
}
