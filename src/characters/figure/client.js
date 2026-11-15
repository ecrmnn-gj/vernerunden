// Asks the worker for figure parts, with a small in-memory cache. Falls back to generating on the main thread when
// workers are unavailable (or fail to start), so the figure always appears.
let worker = null, seq = 0;
const pending = new Map(), cache = new Map(), CACHE_MAX = 24;

function getWorker(){
  if (worker === false) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./gen/worker.js', import.meta.url), { type:'module' });
    worker.onmessage = e => {
      const p = pending.get(e.data.id); if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.rec);
    };
    // a worker that can't load: generate the outstanding parts here instead
    worker.onerror = e => {
      if (e && e.preventDefault) e.preventDefault();
      worker = false;
      for (const [id, p] of pending){ pending.delete(id); local(p.args).then(p.resolve, p.reject); }
    };
  } catch (e){ worker = false; }
  return worker || null;
}
async function local([kind, o, tier]){ const { generatePart } = await import('./gen/generate.js'); return generatePart(kind, o, tier); }

export function partCacheKey(kind, o, tier, keyFn){ return tier + ':' + keyFn(kind, o); }

// Resolves to the part's record. key identifies the part's shape (generate.js partKey) and tier.
export function requestPart(kind, o, tier, key){
  if (cache.has(key)){ const r = cache.get(key); cache.delete(key); cache.set(key, r); return Promise.resolve(r); }
  const args = [kind, o, tier];
  const w = getWorker();
  const pr = w ? new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject, args }); w.postMessage({ id, kind, o, tier }); }) : local(args);
  return pr.then(rec => {
    cache.set(key, rec);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return rec;
  });
}
