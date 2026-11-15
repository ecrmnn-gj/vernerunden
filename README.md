# Vernerunden 3D

An endless runner on a building site, made with [three.js](https://threejs.org/) and built with [Vite](https://vite.dev/).

## Commands

Needs Node 22.12 or newer (`.nvmrc` pins 24).

```sh
npm install
npm run dev       # dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
npm test          # unit tests (Vitest), also run before every deploy
npm run shots     # screenshots of the player figure in shots/ (sets: tabs, poses, styles, matrix)
npm run scenarios # browser checks of how the figure loads and caches
```

`shots` and `scenarios` drive a headless Chromium: set `CHROMIUM_PATH`, or install Playwright's
(`npx playwright install chromium-headless-shell`). Add `--dark` to `shots` for the dark theme.

## Deployment

Every push to `main` builds the site and publishes `dist/` to GitHub Pages (`.github/workflows/deploy.yml`).
In the repository settings, Pages → Source must be set to **GitHub Actions**.

## Structure

`index.html` holds the markup and links the styles. Everything else is in `src/`:

| Folder | What is in it |
|---|---|
| `main.js` | Entry point: imports every module in build order, boots the game and runs the frame loop |
| `core/` | Shared helpers, the colour palette (read from CSS), graphics quality tiers, scratch math objects |
| `audio/` | Web Audio context, music sequencer and sound effects |
| `render/` | Renderer, scene, lights, sky, post-processing, materials, particles, theme and the per-frame draw (`frame.js`) |
| `textures/` | Procedural canvas textures: ground, facades, signs and icons |
| `world/` | The looping world: road, fence, props, buildings, cranes and roadside clutter |
| `characters/` | The player's character (`player.js`, options in `charSchema.js`), the generated player figure (`figure/`), the simpler people in the world (`human.js`) and the poses they all share |
| `game/` | State, content, obstacles and pickups, spawning, outcomes, controls, scripted events, the simulation and game flow |
| `ui/` | HUD, overlays, menus, character creator, layout and fullscreen, input |
| `services/` | The shared leaderboard on JSONsilo |
| `styles/` | CSS, imported in order from `styles/index.css` |

### Load order

Many modules build part of the game while they load. The renderer, textures, the world and the HUD all exist
as soon as their module has run, and later modules use them. `main.js` imports the modules in that order. When
adding a module, import it after everything it uses at load time. Calls made only at runtime, inside functions,
can point in any direction.

### Shared state

ES module imports are read-only, so state that several modules change has a setter next to its declaration.
For example, `setState()` and `setG()` live in `game/state.js`, and `setChar()` lives in `characters/player.js`.

## The player figure

The player is generated in code, not loaded from a model file (`src/characters/figure/`):

1. Each part (body, hands, head, hair, beard, vest, boots) is described as blended signed-distance primitives in
   `figure/gen/`, shaped by the creator's options: gender, build, face shape, hair and beard style, sleeves, gloves.
2. A worker samples the field on a sparse grid and extracts the surface with Surface Nets (`grid.js`,
   `surfacenets.js`), simplifies it to the quality tier's triangle budget with meshoptimizer, and skins it: each
   vertex takes its bone weights from the primitives that shaped it (`weights.js`).
3. `assemble.js` turns the parts into `THREE.SkinnedMesh`es on a skeleton (`rig.js`) whose posed joints have the
   same names as the simpler people's, so `poses.js` drives both. `refine.js` derives the extra bones each frame
   (spine twist, shoulder shrug, half joints, neck, swinging hair) and blinks the eyes.
4. Colours, hems, the belt, lips, brows and the vest's reflective tape and prints are drawn by the shaders in
   `materials.js` from per-vertex region distances and the bind-pose position, so colour changes are instant.

Parts are cached in memory and in IndexedDB (`cache.js`); only parts whose options changed are rebuilt. Bump
`GEN_VERSION` in `figure/keys.js` whenever generated output changes, so old cached parts are not reused. If
generation fails, the old figure from `human.js` is used; `?fig=old` shows it for comparison. `?debug` adds a
`window.__vr3dDebug` hook that the screenshot and scenario scripts use.
