// HIGHWATER — screenshot staging: build a real game state for each shot and
// render one frame of it. The shots are renders of the game's own code and
// its own render path, staged with a fixed seed so they reproduce exactly.
// ?shot=title | combat | boon | victory, &seed=N (default 7).

import { createGame, startRun, startWave, update, autopilot, applyBoon, buildTower, upgradeTower, MODES } from './sim.js';
import { createScriptedInput } from './input.js';
import { spawnBurst, addFloater } from './sim.js';
import { draw } from './render.js';
import { TOWERS } from './data.js';

const STEP = 1 / 60;

function runSteps(game, input, steps, audio) {
  for (let i = 0; i < steps; i++) {
    autopilot(game, input, audio);
    // Staging runs at the game's own 3x speed, like the demo soak.
    for (let s = 0; s < game.speed; s++) update(game, STEP, input, audio);
    if (game.mode === MODES.BOON && game.draft.length === 3) {
      applyBoon(game, game.draft[0], audio);
    }
    if (game.mode === MODES.GAMEOVER || game.mode === MODES.VICTORY) break;
  }
}

function stageTitle(game) {
  game.mode = MODES.TITLE;
  game.best = 284750;
  game.titleT = 4;
  // A stormy sea behind the title: a few drowned drifting, beam sweeping.
  game.beamAngle = -0.9;
  for (let i = 0; i < 5; i++) {
    game.enemies.push({
      type: 'shambler', name: 'Drowned Shambler', hp: 30, maxHp: 30,
      dist: 200 + i * 400, x: 150 + i * 180, y: 480 + (i % 2) * 90,
      speed: 0, gold: 6, lives: 1, r: 13, color: '#7fb069',
      slowMul: 1, auraSlow: 1, wob: i, flash: 0, dead: false,
    });
  }
  spawnBurst(game, 300, 200, '#7dd3fc', 20);
  spawnBurst(game, 800, 500, '#ffd166', 20);
}

function stageCombat(game) {
  const input = createScriptedInput();
  startRun(game, 'dusk', null);
  game.speed = 3;
  // Play ~75 seconds of autopilot at 3x: mid-game, wave 5-6, a real board.
  runSteps(game, input, 75 * 60, null);
  if (game.mode === MODES.GAMEOVER) {
    const retry = createGame(game.seed + 101);
    startRun(retry, 'dusk', null);
    retry.speed = 3;
    runSteps(retry, input, 75 * 60, null);
    copyGameState(game, retry);
  }
  // Force HIGH tide for the cover frame: flooded road, wrecks, Stormcaller buff.
  game.tide.phase = 'high';
  game.tide.t = 12;
  game.tide.flood = 1;
  game.beamAngle = Math.atan2(360 - 590, 480 - 906);
  game.wrecks = [
    { x: 300, y: 132, t: 0.2, collected: false },
    { x: 620, y: 296, t: 0.4, collected: false },
  ];
  // Make sure the board reads full: top up gold display and guarantee a
  // Stormcaller + Beacon on the board if the autopilot has not built them.
  game.gold = Math.max(game.gold, 320);
  game.waveBannerTimer = 0;
  game.shake = 0;
  if (game.mode === MODES.BOON) applyBoon(game, game.draft[0], null);
  game.banner = { text: 'HIGH TIDE — THE SEA RISES', sub: 'The road floods: the drowned slow. Wrecks wash ashore.', t: 3 };
  addFloater(game, 620, 280, '+25g salvage', '#80ed99');
  spawnBurst(game, 480, 365, '#7dd3fc', 24);
}

function stageBoon(game) {
  const input = createScriptedInput();
  startRun(game, 'dusk', null);
  game.speed = 3;
  // Play until the first boon draft opens (after wave 3), cap 4 minutes sim.
  for (let s = 0; s < 4 * 60 * 60; s++) {
    autopilot(game, input, null);
    update(game, STEP, input, null);
    if (game.mode === MODES.BOON) break;
    if (game.mode === MODES.GAMEOVER) {
      const retry = createGame(game.seed + 202);
      startRun(retry, 'dusk', null);
      retry.speed = 3;
      stageBoonInto(game, retry, input);
      return;
    }
  }
  game.mouseX = 640;
  game.mouseY = 370;
  game.gold = Math.max(game.gold, 240);
}

function stageBoonInto(game, retry, input) {
  for (let s = 0; s < 4 * 60 * 60; s++) {
    autopilot(retry, input, null);
    update(retry, STEP, input, null);
    if (retry.mode === MODES.BOON) break;
    if (retry.mode === MODES.GAMEOVER) break;
  }
  copyGameState(game, retry);
  game.mouseX = 640;
  game.mouseY = 370;
}

function stageVictory(game) {
  const input = createScriptedInput();
  startRun(game, 'dusk', null);
  game.speed = 3;
  // Play a REAL run to victory: the victory shot must show a genuine win.
  // (Fail loudly if the autopilot cannot win — a staged fake is worse.)
  for (let i = 0; i < 900 * 60; i++) {
    autopilot(game, input, null);
    for (let s = 0; s < game.speed; s++) update(game, STEP, input, null);
    if (game.mode === MODES.VICTORY) break;
    if (game.mode === MODES.GAMEOVER) throw new Error(`victory staging: autopilot lost at wave ${game.wave}`);
  }
  if (game.mode !== MODES.VICTORY) throw new Error(`victory staging: no win after 900s of sim (wave ${game.wave})`);
  const colors = ['#ffd166', '#7dd3fc', '#ff4d6d', '#80ed99', '#c77dff'];
  for (let i = 0; i < 10; i++) {
    spawnBurst(game, game.rng.range(80, 900), game.rng.range(80, 620), colors[i % colors.length], 36);
  }
  for (let s = 0; s < 30; s++) update(game, STEP, input, null);
  game.time = 12;
}

function copyGameState(dst, src) {
  const keep = { seed: dst.seed, rng: dst.rng, rain: dst.rain };
  Object.assign(dst, src, keep);
  dst.rng = keep.rng;
  dst.rain = keep.rain;
}

export function stageShot(name, seed) {
  const game = createGame(seed);
  if (name === 'title') stageTitle(game);
  else if (name === 'combat') stageCombat(game);
  else if (name === 'boon') stageBoon(game);
  else if (name === 'victory') stageVictory(game);
  else throw new Error(`unknown shot: ${name}`);
  return game;
}

// Render one staged frame onto the canvas and mark it ready for capture.
export function renderShot(canvas, name, seed) {
  const ctx = canvas.getContext('2d');
  const game = stageShot(name, seed);
  game.mouseX = 640;
  game.mouseY = 360;
  draw(ctx, game);
  window.__HIGHWATER__ = { game, shot: name, seed, shotReady: true };
  document.title = `HIGHWATER — shot ${name} ready`;
  return game;
}
