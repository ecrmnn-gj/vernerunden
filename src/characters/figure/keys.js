// Which options each generated part depends on: its cache key. Kept apart from the generator so the main bundle
// can compute keys without loading it.
export const PARTS = ['body', 'hands', 'head', 'boot'];
export function partKey(kind, o){
  if (kind === 'body' || kind === 'hands') return `${kind}|${o.gender}|${o.build}|${o.sleeves}|${o.gloves}`;
  if (kind === 'head') return `head|${o.gender}|${o.face}`;
  if (kind === 'boot') return 'boot';
  throw new Error('unknown part ' + kind);
}
