// Which options each generated part depends on: its cache key. Kept apart from the generator so the main bundle
// can compute keys without loading it.
// Bump whenever any generated output changes, so parts cached from older code (in IndexedDB) are not reused.
export const GEN_VERSION = 7;
export const PARTS = ['body', 'hands', 'head', 'boot', 'hair', 'hairU', 'beard', 'vest'];
export function partKey(kind, o){
  if (kind === 'body' || kind === 'hands') return `${kind}|${o.gender}|${o.build}|${o.sleeves}|${o.gloves}`;
  if (kind === 'head') return `head|${o.gender}|${o.face}`;
  if (kind === 'boot') return 'boot';
  if (kind === 'vest') return `vest|${o.gender}|${o.build}`;
  if (kind === 'hair' || kind === 'hairU') return `${kind}|${o.gender}|${o.face}|${o.hairStyle}`;
  if (kind === 'beard') return `beard|${o.gender}|${o.face}|${o.facial}`;
  throw new Error('unknown part ' + kind);
}
