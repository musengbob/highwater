// HIGHWATER — boot and the frame loop. Fixed 60 Hz simulation, rendering on
// requestAnimationFrame; input and audio are wired here, the game lives in
// sim.js and the drawing in render.js.
//
// URL modes (for testing and screenshots; normal play has no query):
//   ?shot=title|combat|boon|victory&seed=N — render one staged frame
//   ?demo=1&seed=N — autopilot plays on its own (soak tests, screenshots)

import { createGame, startRun, startWave, update, applyBoon, buildTower, upgradeTower, sellTower, quitToTitle, autopilot, boardClick, loadBest, saveBest, MODES } from './sim.js';
import { createInput, createScriptedInput } from './input.js';
import { createAudio } from './audio.js';
import {
  draw, titleDifficultyAt, buildBarAt, boonCardAt, pauseButtonAt,
  hudButtonAt, upgradeButtonAt, sellButtonAt, endButtonAt,
} from './render.js';
import { renderShot } from './shots.js';
import { TOWER_ORDER, DIFF_ORDER } from './data.js';
import { towerCost } from './sim.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
const shot = params.get('shot');
const demo = params.get('demo') === '1';

if (shot) {
  // Screenshot mode: one staged frame, then stop. No audio, no loop.
  document.body.classList.add('shot');
  renderShot(canvas, shot, seed);
} else {
  boot();
}

function boot() {
  const game = createGame(seed);
  game.best = loadBest();
  game.mouseX = 640;
  game.mouseY = 360;
  const input = demo ? createScriptedInput() : createInput(canvas);
  const audio = createAudio();
  if (demo) game.speed = 3;

  window.__HIGHWATER__ = {
    game,
    demo,
    stats() {
      return {
        mode: game.mode,
        wave: game.wave,
        score: game.score,
        kills: game.kills,
        lives: game.lives,
        gold: game.gold,
        towers: game.towers.length,
        enemies: game.enemies.length,
        playTime: Math.round(game.playTime),
        upgradesTaken: game.stats.upgradesTaken,
        boonsTaken: game.stats.boonsTaken,
        speed: game.speed,
      };
    },
  };

  function startPlaying(difficultyId) {
    audio.ensure();
    audio.startMusic();
    startRun(game, difficultyId, audio);
  }

  function togglePause() {
    if (game.mode === MODES.PLAYING) {
      game.prevMode = MODES.PLAYING;
      game.mode = MODES.PAUSED;
    } else if (game.mode === MODES.PAUSED) {
      game.mode = MODES.PLAYING;
    }
  }

  function handleClick(x, y) {
    audio.ensure();
    if (game.mode === MODES.TITLE) {
      const d = titleDifficultyAt(x, y);
      if (d) startPlaying(d);
      return;
    }
    if (game.mode === MODES.BOON) {
      const i = boonCardAt(game, x, y);
      if (i >= 0 && game.draft[i]) applyBoon(game, game.draft[i], audio);
      return;
    }
    if (game.mode === MODES.PAUSED) {
      const b = pauseButtonAt(x, y);
      if (b === 'resume') game.mode = MODES.PLAYING;
      else if (b === 'restart') startPlaying(game.difficulty);
      else if (b === 'quit') quitToTitle(game);
      else if (b === 'mute') {
        game.muted = audio.toggleMuted();
      }
      return;
    }
    if (game.mode === MODES.VICTORY || game.mode === MODES.GAMEOVER) {
      const b = endButtonAt(x, y);
      if (b === 'retry') startPlaying(game.difficulty);
      else if (b === 'title') quitToTitle(game);
      return;
    }
    if (game.mode !== MODES.PLAYING) return;
    // HUD buttons first.
    const hb = hudButtonAt(x, y);
    if (hb === 'speed') {
      game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
      audio.click();
      return;
    }
    if (hb === 'pause') {
      togglePause();
      return;
    }
    if (hb === 'mute') {
      game.muted = audio.toggleMuted();
      return;
    }
    // Selected-tower buttons.
    if (game.selectedTower) {
      if (upgradeButtonAt(x, y)) {
        upgradeTower(game, game.selectedTower, audio);
        return;
      }
      if (sellButtonAt(x, y)) {
        sellTower(game, game.selectedTower, audio);
        return;
      }
    }
    // Build bar.
    const towerId = buildBarAt(x, y);
    if (towerId) {
      game.buildSel = game.buildSel === towerId ? null : towerId;
      game.selectedTower = null;
      audio.click();
      return;
    }
    // Board: plots and towers.
    if (x < 960) boardClick(game, x, y, audio);
  }

  function handleKey(code) {
    if (code === 'KeyM') {
      game.muted = audio.toggleMuted();
      return;
    }
    if (game.mode === MODES.TITLE) {
      if (code === 'Enter' || code === 'Space') startPlaying('dusk');
      else if (code === 'Digit1') startPlaying('calm');
      else if (code === 'Digit2') startPlaying('dusk');
      else if (code === 'Digit3') startPlaying('storm');
      return;
    }
    if (game.mode === MODES.BOON) {
      if (code === 'Digit1' && game.draft[0]) applyBoon(game, game.draft[0], audio);
      else if (code === 'Digit2' && game.draft[1]) applyBoon(game, game.draft[1], audio);
      else if (code === 'Digit3' && game.draft[2]) applyBoon(game, game.draft[2], audio);
      return;
    }
    if (game.mode === MODES.PAUSED) {
      if (code === 'KeyP' || code === 'Escape') game.mode = MODES.PLAYING;
      else if (code === 'KeyR') startPlaying(game.difficulty);
      else if (code === 'KeyQ') quitToTitle(game);
      return;
    }
    if (game.mode === MODES.VICTORY || game.mode === MODES.GAMEOVER) {
      if (code === 'KeyR' || code === 'Enter') startPlaying(game.difficulty);
      else if (code === 'KeyQ') quitToTitle(game);
      return;
    }
    if (game.mode !== MODES.PLAYING) return;
    if (code === 'Space') {
      if (!game.waveActive) startWave(game, audio);
    } else if (code === 'KeyF') {
      game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
    } else if (code === 'KeyP' || code === 'Escape') {
      togglePause();
    } else if (code === 'KeyU' && game.selectedTower) {
      upgradeTower(game, game.selectedTower, audio);
    } else if (code === 'KeyX' && game.selectedTower) {
      sellTower(game, game.selectedTower, audio);
    } else if (code.startsWith('Digit')) {
      const n = Number(code.slice(5));
      if (n >= 1 && n <= 6) {
        const id = TOWER_ORDER[n - 1];
        game.buildSel = game.buildSel === id ? null : id;
        game.selectedTower = null;
      }
    }
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    game.mouseX = input.mouseX;
    game.mouseY = input.mouseY;
    // Keyboard.
    if (!demo) {
      for (const code of Object.keys(input.pressed)) handleKey(code);
      if (input.clicked) handleClick(input.clicked.x, input.clicked.y);
    }
    acc += dt;
    let batches = 0;
    while (acc >= STEP && batches < 9) {
      if (demo) autopilot(game, input, audio);
      // The speed toggle (F / HUD button) runs that many sim steps per frame.
      for (let s = 0; s < game.speed; s++) update(game, STEP, input, audio);
      acc -= STEP;
      batches++;
    }
    if (batches >= 9) acc = 0;
    draw(ctx, game);
    if (!demo) input.endFrame();
  }
  requestAnimationFrame(frame);
}
