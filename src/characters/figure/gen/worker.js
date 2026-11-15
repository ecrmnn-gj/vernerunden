// The figure generator's worker: builds one part per message and sends its typed arrays back without copying.
import { generatePart } from './generate.js';

self.onmessage = async e => {
  const { id, kind, o, tier } = e.data;
  try {
    const rec = await generatePart(kind, o, tier);
    const transfer = ['positions', 'normals', 'index', 'region', 'region2', 'skinIndex', 'skinWeight'].filter(k => rec[k]).map(k => rec[k].buffer);
    self.postMessage({ id, rec }, transfer);
  } catch (err){
    self.postMessage({ id, error:String((err && err.stack) || err) });
  }
};
