# Tank Battle Game — Architecture Map

## Systems

| **Entry / Boot** | `main.js` — DOM init, game start/restart orchestration, sound registration |
| **State Store** | `state.js` — single shared mutable state (tanks, bullets, particles, power-ups, UI values, input) with getter/setter functions |
| **Input** | `input.js` — keyboard + mouse handlers; manages WASD/cursor keys, space to shoot, targeting mode (auto/manual), and restart triggers |
| **Game Loop & Render Pipeline** | `loop.js` — `requestAnimationFrame(rAF)` loop: filter dead entities → update/draw power-ups → tanks → bullets → particles → collisions, with screen shake applied around the render pass |
| **Rendering** | `render.js` — background canvas fill + grid lines; screen shake helper that applies random translate offset to the ctx |
| **Game Objects (Classes)** | `tank.js` — Tank class (player + enemy AI, health, aim logic, shooting, detailed drawing); `bullet.js` — Bullet class with trail/aging/pulse visuals; `particle.js` — Particle spawn/drift/fade for explosions; `powerup.js` — PowerUp floating pickups (bob animation, fade-out, 6 types) |
| **Collision Detection** | `collisions.js` — bullet↔tank hit resolution (damage, lives, respawning, scoring); player↔power-up collection; spawns explosions and triggers sound/UI side effects |
| **Wave / Spawning System** | `waves.js` — progressive enemy count per wave, random edge spawning, elite chance (20%), wave-advance detection via tank array filtering |
| **Sound** | `sound.js` — Web Audio API synth: oscillator tones + white noise bursts for player shoot, enemy shoot, hit, explosion, player death, wave complete, game over, start fanfare |
| **UI / HUD** | `ui.js` — reactive score/high-score/lives/wave update; incrementScore shortcut; game-over handling with localStorage persistence |

## Key Files

| File           | Role                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `index.html`   | Shell DOM structure: canvas, info bar, start screen, controls hint, game-over overlay                               |
| `styles.css`   | All styling for HUD, overlays, buttons (no inline styles in JS)                                                     |
| `js/config.js` | Static constants (canvas dims, speeds, cooldowns, damage values, grid size) — the single source of truth for tuning |

## Responsibilities

```
Browser Event ──► input.js (key/mouse listeners)
                       │
                      state (keys[], mouseX, mouseY, spacePressed...)
                       │
              ╔════════▼══════════╗
              ║   loop.js / main  ║◄──── startGame() restarts RAF + initGame()
              ╚════════╤═════════╝
                       │
          ┌────────────┼───────────────┐
          ▼            ▼               ▼
    tank.js update   bullet.js      particle.js
    (WASD move,     (travel+       (drift+fade)
     aim/mouse,     trail, bounds-
     shoot w/ cooldown check) check)
          │
          ▼
  collisions.js ──► damage logic, lives, power-up collection, explosions, scHore
          │
          ▼
   waves.js ───→ enemy count per wave, spawn at edges, auto next-wave trigger
          │
          ▼
    state.js ──► all shared data mutated by above; single source of truth
          │
          ▼
   render.js  ◄── draw() called on each game object in loop
```

## Data Flow

1. **Boot** → `index.html` loads `js/main.js` (ES module) → DOM refs stored in `state.js` via setters, input handlers registered by `input.js`, high-score loaded from localStorage.

2. **Start** → User clicks START → `main.startGame()` clears start screen, sets targeting mode, calls `initGame()` which creates the player tank + spawns wave 1, then launches `gameLoop()`.

3. **Per-frame (loop.js)**:
   - Background drawn (`render.js`)
   - Screen shake applied via ctx translate
   - Dead enemy tanks filtered out of `state.tanks`
   - Wave complete check → if all enemies dead, increment wave & spawn next
   - UI HUD updated every frame from state values
   - Active buff timers expired/filtered
   - Power-up pickups updated + drawn (update/draw)
   - Tanks updated (`isPlayer? updatePlayer() : updateAI()`) then drawn
   - Bullets filtered alive → updated+drawn (travel, bounds check destroys off-screen)
   - Particles filtered dead → updated+drawn (drift, decay life)
   - `checkCollisions()` runs: bullet↔tank detection, player↔powerup collection
     - On hit: sound plays, explosion particles burst, score/lives/respawn state updated
     - Power-up collected: health healed or buff pushed to `activePowerUps[]` with expiry

4. **End** → Player lives reach 0 → `gameOver()` called: stops loop (sets gameRunning false), shows overlay, saves high-score to localStorage, plays descending tone.

5. **Restart** → Either R key or "Play Again" button cancels current rAF, resets all state via `initGame()`, restarts loop from wave 1.
