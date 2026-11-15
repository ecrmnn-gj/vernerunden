// Gets figure parts: from memory, then IndexedDB, then the worker (which then fills both caches). Requests for a
// part already on its way share the one job. Falls back to generating on the main thread when workers are
// unavailable or fail to start, so the figure always appears.
import { cacheGet, cachePut, cacheId } from './cache.js';

let worker = null, seq = 0;
const pending = new Map(), memory = new Map(), inflight = new Map(), MEMORY_MAX = 32;
// How parts were obtained, for the ?debug hook and the scenario checks.
export const partStats = { memory:0, stored:0, generated:0 };
const CACHE_WAIT = 400; // ms

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
function generate(kind, o, tier){
  const w = getWorker(), args = [kind, o, tier];
  if (!w) return local(args);
  return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject, args }); w.postMessage({ id, kind, o, tier }); });
}
function remember(id, rec){
  memory.delete(id); memory.set(id, rec);
  while (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value);
}

// The part record for these options. key: the part's cache key (keys.js partKey).
export function requestPart(kind, o, tier, key){
  const id = cacheId(tier, key);
  if (memory.has(id)){ const r = memory.get(id); remember(id, r); partStats.memory++; return Promise.resolve(r); }
  if (inflight.has(id)) return inflight.get(id);
  // Ask the cache, and if it hasn't answered soon (the page may still be busy starting up), start generating too:
  // whichever arrives first is used.
  const job = new Promise((resolve, reject) => {
    let done = false, generating = null;
    const finish = (rec, src) => { if (done) return; done = true; partStats[src]++; resolve(rec); };
    const gen = () => {
      if (generating) return;
      generating = generate(kind, o, tier).then(rec => { cachePut(id, rec); finish(rec, 'generated'); }, err => { if (!done){ done = true; reject(err); } });
    };
    const timer = setTimeout(gen, CACHE_WAIT);
    cacheGet(id).then(hit => { clearTimeout(timer); if (hit) finish(hit, 'stored'); else gen(); });
  }).then(rec => { remember(id, rec); inflight.delete(id); return rec; }, err => { inflight.delete(id); throw err; });
  inflight.set(id, job);
  return job;
}
// Idle housekeeping outside the creator: the worker holds the simplifier's memory, so let it go when not needed.
export function releaseWorker(){ if (worker && !pending.size){ worker.terminate(); worker = null; } }
