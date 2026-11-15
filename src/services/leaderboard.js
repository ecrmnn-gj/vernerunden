// The shared leaderboard on JSONsilo.
import { $, fmtM, store } from '../core/utils.js';
import { localBest } from '../game/state.js';

// The shared high-score list lives on JSONsilo, under the field "scores3d".
// The same silo also holds the 2D game's list ("scores"), so every save keeps the other fields.
// NB: this is a Manage key. It gives full access to the JSONsilo account, and anyone
// who opens this page can read it in the source. It expires on 26 November 2026.
const JSONSILO = {
  base: 'https://api.jsonsilo.com',
  silo: 'b7c422d1-4115-4ee6-be72-81621f728da9',
  key:  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX3V1aWQiOiJNQk85bDFCY0pVV0JJMVJ3c3BMZ0V0cTBBMHoxIiwiaXNzIjoiaHR0cHM6Ly9qc29uc2lsby5jb20iLCJleHAiOjE3OTU3MDQ1NTR9.Pdj1EBHgHhXFBwE2r-8JXkhf1QtOUF7OK5KIWjAqkMY',
  field: 'scores3d'
};
const READ_URL = `${JSONSILO.base}/public/${JSONSILO.silo}`;
const MANAGE_URL = `${JSONSILO.base}/api/v1/manage/${JSONSILO.silo}`;
export let db = !!(JSONSILO.silo && JSONSILO.key), boardDocs = [], lastRun = null, siloMeta = null, loading = false;
export function setLastRun(r){ lastRun = r; }
const myEntries = new Set();
const boardEl = $('board'), boardNote = $('boardNote');
export const saveForm = $('saveForm'), nameInput = $('nameInput'), saveBtn = $('saveBtn'), saveMsg = $('saveMsg');
nameInput.value = store.get('vr:name', '');
const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function sanitize(list){
  return (Array.isArray(list) ? list : [])
    .map(v => ({ id:String((v && v.id) || ''), name:cleanName(v && v.name), meters:Math.floor(Number(v && v.meters)), secs:Number(v && v.secs) || 0, at:Number(v && v.at) || 0 }))
    .filter(v => v.id && Number.isFinite(v.meters) && v.meters >= 0 && v.meters < 1e7)
    .sort((a, b) => b.meters - a.meters || a.at - b.at);
}
export function renderLocalBoard(){
  boardEl.replaceChildren();
  boardNote.textContent = localBest > 0 ? `Topplisten er ikke tilgjengelig. Din lengste vernerunde på denne enheten: ${fmtM(localBest)}.` : 'Topplisten er ikke tilgjengelig. Din lengste runde huskes på denne enheten.';
}
function renderBoard(){
  if (!boardDocs.length){ boardEl.replaceChildren(); boardNote.textContent = 'Ingen runder lagret ennå. Bli den første.'; return; }
  const frag = document.createDocumentFragment();
  boardDocs.forEach((d, i) => {
    const li = document.createElement('li'); if (myEntries.has(d.id)) li.classList.add('me');
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(i + 1);
    const name = document.createElement('span'); name.className = 'name'; name.textContent = (d.name || 'Uten navn') + (myEntries.has(d.id) ? ' (deg)' : '');
    const val = document.createElement('span'); val.className = 'val'; val.textContent = fmtM(d.meters);
    li.append(rank, name, val); frag.appendChild(li);
  });
  boardEl.replaceChildren(frag); boardNote.textContent = 'De ti lengste vernerundene.';
}
async function fetchAll(){
  const res = await fetch(READ_URL, { cache:'no-store' });
  if (!res.ok) throw Object.assign(new Error('read'), { status:res.status });
  const data = await res.json();
  return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}
// The list is fetched when the page opens, after each round and after each save. No polling.
export async function loadBoard(){
  if (!db){ renderLocalBoard(); return; }
  if (loading) return; loading = true;
  try { boardDocs = sanitize((await fetchAll())[JSONSILO.field]).slice(0, 10); renderBoard(); }
  catch (e) { if (!boardDocs.length) boardNote.textContent = 'Topplisten kunne ikke hentes akkurat nå.'; }
  finally { loading = false; }
}
async function getMeta(){
  if (siloMeta) return siloMeta;
  const res = await fetch(`${JSONSILO.base}/api/v1/manage/meta/${JSONSILO.silo}`, { headers:{ 'X-MAN-API':JSONSILO.key } });
  if (!res.ok) throw Object.assign(new Error('meta'), { status:res.status });
  siloMeta = await res.json();
  return siloMeta;
}
async function saveScore(entry){
  const meta = await getMeta();
  const all = await fetchAll();
  const list = sanitize(all[JSONSILO.field]); list.push(entry);
  const scores = sanitize(list).slice(0, 200);
  const file_data = Object.assign({}, all, { [JSONSILO.field]:scores });
  const res = await fetch(MANAGE_URL, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', 'X-MAN-API':JSONSILO.key },
    body:JSON.stringify({ file_name:meta.file_name, region_name:meta.region_name || 'api', is_public:meta.is_public !== false, file_data })
  });
  if (!res.ok) throw Object.assign(new Error('save'), { status:res.status });
  return scores;
}
saveForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!lastRun || lastRun.saved || !db) return;
  const name = cleanName(nameInput.value);
  if (!name){ saveMsg.textContent = 'Skriv inn et navn først.'; nameInput.focus(); return; }
  nameInput.value = name; store.set('vr:name', name);
  saveBtn.disabled = true; saveMsg.textContent = 'Lagrer …';
  const entry = { id:newId(), name, meters:lastRun.meters, secs:lastRun.secs, at:Date.now() };
  try {
    const scores = await saveScore(entry);
    lastRun.saved = true; myEntries.add(entry.id);
    boardDocs = scores.slice(0, 10); renderBoard();
    const place = scores.findIndex(s => s.id === entry.id) + 1;
    saveMsg.textContent = place > 0 && place <= 10 ? `Lagret som «${name}», på ${place}. plass.` : `Lagret som «${name}».`;
    $('againBtn').focus({ preventScroll:true });
  } catch (err) {
    saveBtn.disabled = false;
    saveMsg.textContent = (err && (err.status === 401 || err.status === 403)) ? 'Nøkkelen til topplisten virker ikke. Den kan ha utløpt.' : 'Kunne ikke lagre akkurat nå. Sjekk nettforbindelsen og prøv igjen.';
  }
});
loadBoard();
