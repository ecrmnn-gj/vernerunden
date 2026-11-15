// Generated parts cached in IndexedDB, so a returning player's figure appears at once instead of being rebuilt.
// Every call has a timeout and treats any failure (private browsing, quota, blocked) as a cache miss: the cache can
// only ever make things faster, never stop the figure from appearing.
import { GEN_VERSION } from './keys.js';

const DB = 'vr3d-figure', STORE = 'parts', MAX = 40, TIMEOUT = 4000;
const timeout = (p, v) => Promise.race([p, new Promise(r => setTimeout(() => r(v), TIMEOUT))]);
// The open request itself is kept, not a timed-out result: a slow open during page load must not switch the cache
// off for the whole session.
let opening = null;
function openDb(){
  if (opening) return opening;
  opening = new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath:'id' }); s.createIndex('t', 't'); };
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch (e){ res(null); }
  });
  // once open, drop parts made by older generator versions
  opening.then(db => { if (db) idle(() => sweep(db)); });
  return opening;
}
const open = () => timeout(openDb(), null);
const idle = f => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout:5000 }) : setTimeout(f, 2000));

export const cacheId = (tier, key) => `${GEN_VERSION}:${tier}:${key}`;

export async function cacheGet(id){
  const db = await open(); if (!db) return null;
  return timeout(new Promise(res => {
    try { const q = db.transaction(STORE).objectStore(STORE).get(id); q.onsuccess = () => res(q.result ? q.result.data : null); q.onerror = () => res(null); }
    catch (e){ res(null); }
  }), null);
}
export async function cachePut(id, data){
  const db = await open(); if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
    st.put({ id, t:Date.now(), data });
    // keep the newest MAX parts
    const c = st.count();
    c.onsuccess = () => {
      let extra = c.result - MAX; if (extra <= 0) return;
      st.index('t').openCursor().onsuccess = e => { const cur = e.target.result; if (cur && extra-- > 0){ cur.delete(); cur.continue(); } };
    };
  } catch (e){ /* a failed write only means a rebuild next time */ }
}
function sweep(db){
  try {
    const st = db.transaction(STORE, 'readwrite').objectStore(STORE), q = st.getAllKeys();
    q.onsuccess = () => { for (const k of q.result) if (!String(k).startsWith(GEN_VERSION + ':')) st.delete(k); };
  } catch (e){}
}
