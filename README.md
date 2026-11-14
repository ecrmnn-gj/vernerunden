# Vernerunden 3D

An endless runner on a building site, made with [three.js](https://threejs.org/) and built with [Vite](https://vite.dev/).

## Commands

Needs Node 22.12 or newer (`.nvmrc` pins 24).

```sh
npm install
npm run dev       # dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
```

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
| `characters/` | Low-poly people, their poses and the player's character |
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
