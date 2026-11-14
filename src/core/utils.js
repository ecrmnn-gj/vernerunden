// Small shared helpers: DOM lookup, random numbers, number formatting and localStorage.

             
export const $ = id => document.getElementById(id);
export const stage = $('stage'), canvas = $('game');
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FONT_C = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const nf = new Intl.NumberFormat('nb-NO');
export const fmtM = v => nf.format(Math.floor(v)) + ' m';
export const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
