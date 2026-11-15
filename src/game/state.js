// Game state: the current screen and the running shift (g). Other modules change it through the setters.
import { store } from '../core/utils.js';

export let state = 'start', g = null, overAt = 0;
export let localBest = Number(store.get('vr3d:best', 0)) || 0, remoteBest = 0;
// Other modules cannot assign to imported bindings, so the run's state changes through these.
export function setState(s){ state = s; }
export function setG(run){ g = run; }
export function setOverAt(t){ overAt = t; }
export function setLocalBest(m){ localBest = m; }
