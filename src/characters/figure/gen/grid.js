// Samples a scene's distance field on a regular grid, sparsely: the grid is cut into bricks of 8³ cells, each brick
// only evaluates the scene nodes near it, and bricks far from the surface are skipped and just filled with the sign.
const B = 8;

// box: [minx, miny, minz, maxx, maxy, maxz]; h: cell size. The outermost layer of points is forced outside, so
// whatever the grid cuts through is capped and every extracted part is a closed shell.
// opts.dense evaluates every point with every node (slow; the reference the sparse path is tested against).
export function sampleGrid(scene, box, h, opts = {}){
  const dense = !!opts.dense, margin = opts.margin != null ? opts.margin : 2 * h;
  const [x0, y0, z0, x1, y1, z1] = box;
  const nx = Math.max(2, Math.ceil((x1 - x0) / h)), ny = Math.max(2, Math.ceil((y1 - y0) / h)), nz = Math.max(2, Math.ceil((z1 - z0) / h));
  const px = nx + 1, py = ny + 1, pz = nz + 1, sxy = px * py;
  const vals = new Float32Array(px * py * pz).fill(NaN);
  const bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  const brickCand = new Array(bx * by * bz).fill(null);
  const halfDiag = Math.sqrt(3) * B * h / 2, far = B * h;
  let evaluated = 0;
  for (let bk = 0; bk < bz; bk++) for (let bj = 0; bj < by; bj++) for (let bi = 0; bi < bx; bi++){
    const i0 = bi * B, i1 = Math.min(i0 + B, nx), j0 = bj * B, j1 = Math.min(j0 + B, ny), k0 = bk * B, k1 = Math.min(k0 + B, nz);
    const bb = [x0 + i0 * h, y0 + j0 * h, z0 + k0 * h, x0 + i1 * h, y0 + j1 * h, z0 + k1 * h];
    const cand = dense ? null : scene.candidates(bb, margin);
    let fill = null;
    if (!dense && !cand) fill = far;
    else if (!dense){
      const dc = scene.distC((bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2, cand);
      if (Math.abs(dc) > 1.5 * halfDiag) fill = dc > 0 ? dc - halfDiag : dc + halfDiag;
    }
    if (fill !== null){
      // a skipped brick only fills points no evaluated neighbour has written
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++){ let idx = i0 + px * j + sxy * k; for (let i = i0; i <= i1; i++, idx++) if (vals[idx] !== vals[idx]) vals[idx] = fill; }
      continue;
    }
    brickCand[bi + bx * (bj + by * bk)] = cand ? Int32Array.from(cand) : null;
    if (dense) brickCand[bi + bx * (bj + by * bk)] = 'all';
    evaluated++;
    for (let k = k0; k <= k1; k++){
      const z = z0 + k * h;
      for (let j = j0; j <= j1; j++){
        const y = y0 + j * h; let idx = i0 + px * j + sxy * k;
        for (let i = i0; i <= i1; i++, idx++) vals[idx] = scene.distC(x0 + i * h, y, z, cand);
      }
    }
  }
  // close the shell where the grid cuts through the shape
  const cap = 0.5 * h;
  for (let k = 0; k < pz; k++) for (let j = 0; j < py; j++){
    const edgeJK = k === 0 || k === nz || j === 0 || j === ny;
    let idx = px * j + sxy * k;
    if (edgeJK){ for (let i = 0; i < px; i++, idx++) if (vals[idx] < cap) vals[idx] = cap; }
    else { if (vals[idx] < cap) vals[idx] = cap; if (vals[idx + nx] < cap) vals[idx + nx] = cap; }
  }
  return { scene, vals, nx, ny, nz, h, x0, y0, z0, B, bx, by, bz, brickCand, stats:{ bricks:bx * by * bz, evaluated } };
}

// The scene nodes to use for an exact evaluation near cell (i, j, k): null if its brick was skipped.
export function cellCandidates(G, i, j, k){
  const c = G.brickCand[Math.min(G.bx - 1, (i / G.B) | 0) + G.bx * (Math.min(G.by - 1, (j / G.B) | 0) + G.by * Math.min(G.bz - 1, (k / G.B) | 0))];
  return c;
}
