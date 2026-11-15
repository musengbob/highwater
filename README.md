# highwater

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/musengbob/highwater/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/musengbob/highwater/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

HIGHWATER is a tower defense on the drowned coast: the last dry town SALTSPIRE holds against the sea, and you are the Tidekeeper. Hold the keep through 12 waves, ride the tide cycle, and kill THE DROWNED KING — a 3-phase boss — at the end to win. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## The game

- **Complete loop:** title screen with difficulty choice (CALM / DUSK / STORM) → 12 named waves → boon draft after waves 3, 6 and 9 → victory screen on wave 12, game-over screen when the keep falls, restart any time.
- **The tide cycle (the signature mechanic):** LOW (20s) → RISING (10s) → HIGH (20s) → FALLING (10s), looping. At LOW tide, 4 mudflat plots open for cheap builds. At HIGH tide the road floods — enemies on it move 35% slower — and wrecks wash ashore worth +25g salvage each. Towers on mudflats fire at half rate while stranded at high tide.
- **The keep's beacon:** a light beam sweeps the board from Saltspire (a full rotation every ~24s); towers caught in the beam deal ×1.5 damage.
- **Six towers:** Harpoon (fast, cheap), Cannon (splash), Net Snare (slows 45%), Stormcaller (chain lightning, +50% at HIGH tide), Breakwall (slowing aura), Beacon (buffs nearby towers +25% damage, +15 range). Each upgrades twice; sell for 70%.
- **Enemies:** Drowned Shambler, Tide Runner (fast), Shellback (armored), Murkspawn (swarm), Eel (very fast), Drowned Knight (tanky, costs 3 lives), and THE DROWNED KING — 3 phases (summons minions → quickens → enrages).
- **Economy:** kills pay gold; wave-clear bonus plus 5% interest on saved gold; salvage at high tide; boons (Salted Steel, Deep Pockets, Tide Mastery, Second Wind, Storm's Favor, Thrifty Hands).
- **Feel:** rain, rolling swell, flooded roads, floating gold text, particles, screen shake, wave banners, boss phase banners, synthesized WebAudio sound effects and a bass music loop (M to mute).
- **HUD:** gold, lives, score, wave and wave name, a tide gauge with phase name and countdown, speed/pause/mute buttons, a boss bar, an INCOMING panel naming the next wave's composition, a build bar with costs, a selected-tower panel, and a tide log.
- **Pause menu (P):** resume, restart run, quit to title, sound toggle.
- **Original:** all art is drawn in code and all sound is synthesized — no copied assets, no network requests, no libraries. Deterministic seeded simulation.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network.

## Controls

| Input | Action |
|---|---|
| Mouse | Click a plot to build, click a tower to select it |
| 1 / 2 / 3 / 4 / 5 / 6 | Choose a tower to place (Harpoon / Cannon / Net / Stormcaller / Breakwall / Beacon) |
| 1 / 2 / 3 on the title screen | Choose a difficulty (CALM / DUSK / STORM) |
| 1 / 2 / 3 in the boon draft | Pick a boon |
| Space | Start the next wave |
| F | Game speed (1x / 2x / 3x) |
| P | Pause (menu: resume / restart / quit to title) |
| U | Upgrade the selected tower |
| X | Sell the selected tower (70%) |
| M | Mute |
| R | Restart after a win or loss |
| Q | Quit to title |

## Layout

- `game/index.html` — the page; `game/style.css` — page chrome.
- `game/src/main.js` — boot and the fixed-step frame loop.
- `game/src/sim.js` — game state, waves, tide, combat, economy, boons, boss, autopilot.
- `game/src/data.js` — board geometry, towers, enemies, waves, boons, difficulties.
- `game/src/render.js` — all drawing: coast, keep, HUD, menus, click zones.
- `game/src/rng.js` — seeded random numbers.
- `game/src/audio.js` — synthesized sound effects and music (WebAudio).
- `game/src/input.js` — keyboard + mouse, plus a scripted stand-in for the autopilot.
- `game/src/shots.js` — screenshot staging (renders one frame per shot).
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four 1280×720 captures: title, high-tide combat, boon draft, victory.

## Screenshots

The four screenshots in `screenshots/` are staged renders of the game's own code (`?shot=title|combat|boon|victory&seed=7`), each a real frame from the game's render path.

---

<sub>Entered on [make.fun](https://make.fun/?ref=t2hmjdyt&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
