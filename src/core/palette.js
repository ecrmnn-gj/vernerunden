// The colour palette, read from the CSS custom properties so the 3D scene follows the page theme.

export let P = {};
const TOKENS = ['sky1','sky2','fog','sun','sun-light','sun-i','hemi-sky','hemi-ground','hemi-i','star','ground','ground2','frame','far','sil','lamp','beam-a',
  'outline','halo','steel','wood','puff','paper','green','green-ink','green-dark','yellow','orange','red','blue','gold','npc','suit','dust','hud-bg','hud-ink'];
export function readPalette(){
  const cs = getComputedStyle(document.documentElement);
  P = {};
  for (const t of TOKENS) P[t.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cs.getPropertyValue('--' + t).trim();
}
readPalette();
