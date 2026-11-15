// HIGHWATER — the game itself: state, waves, tide, combat, economy,
// boons, boss, win/lose, and the autopilot that plays it end to end.
// Deterministic: all randomness flows through game.rng (seeded).

import { createRng } from './rng.js';
import {
  W, H, PLOTS, PLOT_R, TIDE_DUR, TIDE_ORDER, TIDE_NAME, TOWERS, TOWER_ORDER,
  UPGRADE, ENEMIES, WAVES, TOTAL_WAVES, BOONS, BOON_IDS, DIFFICULTIES,
  PATH_GEOM, pointOnPath, KEEP,
} from './data.js';

export const MODES = {
  TITLE: 'title',
  PLAYING: 'playing',
  BOON: 'boon',
  PAUSED: 'paused',
  VICTORY: 'victory',
  GAMEOVER: 'gameover',
};

export function loadBest() {
  try {
    return Number(localStorage.getItem('highwater-best') || 0) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(v) {
  try {
    localStorage.setItem('highwater-best', String(v));
  } catch {
    // Storage is a nicety, never a crash.
  }
}

export function createGame(seed) {
  const rng = createRng(seed);
  const game = {
    seed,
    rng,
    mode: MODES.TITLE,
    prevMode: MODES.TITLE,
    difficulty: 'dusk',
    lives: 20,
    maxLives: 25,
    gold: 180,
    score: 0,
    kills: 0,
    wave: 0,
    waveActive: false,
    waveName: '',
    spawnQueue: [],
    spawnT: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    tracers: [],
    particles: [],
    floaters: [],
    wrecks: [],
    log: [],
    tide: { phase: 'low', t: TIDE_DUR.low, dur: { ...TIDE_DUR }, flood: 0 },
    beamAngle: -Math.PI / 2,
    time: 0,
    playTime: 0,
    speed: 1,
    muted: false,
    selectedPlot: -1,
    selectedTower: null,
    buildSel: null,
    draft: [],
    banner: null,
    boss: null,
    bossPhase: 0,
    stats: { wavesCleared: 0, upgradesTaken: 0, goldEarned: 0, towersBuilt: 0, boonsTaken: 0, salvage: 0 },
    best: 0,
    rain: [],
    buildDelay: 0,
    over: false,
    shake: 0,
    titleT: 0,
  };
  for (let i = 0; i < 90; i++) {
    game.rain.push({ x: rng.range(0, W), y: rng.range(0, H), len: rng.range(8, 18), sp: rng.range(380, 620) });
  }
  return game;
}

export function logLine(game, text) {
  game.log.unshift(text);
  if (game.log.length > 5) game.log.length = 5;
}

export function startRun(game, difficultyId, audio) {
  const d = DIFFICULTIES[difficultyId] || DIFFICULTIES.dusk;
  game.difficulty = d.id;
  game.mode = MODES.PLAYING;
  game.lives = d.lives;
  game.maxLives = 25;
  game.gold = d.gold;
  game.score = 0;
  game.kills = 0;
  game.wave = 0;
  game.waveActive = false;
  game.spawnQueue = [];
  game.enemies = [];
  game.towers = [];
  game.projectiles = [];
  game.tracers = [];
  game.particles = [];
  game.floaters = [];
  game.wrecks = [];
  game.log = [];
  game.tide = { phase: 'low', t: TIDE_DUR.low, dur: { ...TIDE_DUR }, flood: 0 };
  game.beamAngle = -Math.PI / 2;
  game.playTime = 0;
  game.selectedPlot = -1;
  game.selectedTower = null;
  game.buildSel = null;
  game.draft = [];
  game.banner = { text: 'HOLD SALTSPIRE', sub: 'The sea took the coast. Twelve waves. One king beneath them.', t: 3 };
  game.boss = null;
  game.bossPhase = 0;
  game.stats = { wavesCleared: 0, upgradesTaken: 0, goldEarned: 0, towersBuilt: 0, boonsTaken: 0, salvage: 0 };
  game.over = false;
  game.buildDelay = 0.6;
  logLine(game, `Tidekeeper takes ${d.name}. ${d.gold}g in the coffers.`);
  if (audio) audio.wave();
}

export function quitToTitle(game) {
  game.mode = MODES.TITLE;
  game.titleT = 0;
  game.enemies = [];
  game.towers = [];
  game.projectiles = [];
  game.tracers = [];
  game.particles = [];
  game.floaters = [];
  game.wrecks = [];
  game.spawnQueue = [];
  game.waveActive = false;
  game.draft = [];
  game.banner = null;
  game.boss = null;
  game.selectedPlot = -1;
  game.selectedTower = null;
  game.buildSel = null;
  game.over = false;
}

export function hpMul(wave) {
  return Math.pow(1.30, wave - 1);
}

export function waveComp(wave) {
  const w = WAVES[wave - 1];
  const out = [];
  for (const [type, count] of w.comp) {
    for (let i = 0; i < count; i++) out.push(type);
  }
  return out;
}

export function startWave(game, audio) {
  if (game.wave >= TOTAL_WAVES || game.waveActive || game.mode !== MODES.PLAYING) return false;
  game.wave++;
  const w = WAVES[game.wave - 1];
  game.waveName = w.name;
  // Interleave types so the stream is mixed, not one block per type.
  const comp = waveComp(game.wave);
  const mixed = [];
  const buckets = {};
  for (const t of comp) (buckets[t] = buckets[t] || []).push(t);
  const keys = Object.keys(buckets);
  let added = true;
  while (added) {
    added = false;
    for (const k of keys) {
      if (buckets[k].length) {
        mixed.push(buckets[k].pop());
        added = true;
      }
    }
  }
  // The King always enters last.
  const kings = mixed.filter((t) => t === 'king');
  const rest = mixed.filter((t) => t !== 'king');
  const ordered = [...rest, ...kings];
  game.spawnQueue = ordered.map((type, i) => ({ type, at: 0.4 + i * 0.55 }));
  game.spawnT = 0;
  game.waveActive = true;
  game.banner = { text: `WAVE ${game.wave} — ${w.name.toUpperCase()}`, sub: w.boss ? 'Something huge stirs beneath the waves.' : `${mixed.length} drowned approach from the sea.`, t: 2.6 };
  logLine(game, `Wave ${game.wave}: ${w.name} (${mixed.length} foes).`);
  if (audio) {
    if (w.boss) audio.boss();
    else audio.wave();
  }
  return true;
}

export function spawnEnemy(game, type, dist) {
  const def = ENEMIES[type];
  const mul = type === 'king' ? 1 : hpMul(game.wave);
  const hp = Math.round(def.hp * mul);
  const p = pointOnPath(dist || 0);
  const e = {
    type,
    name: def.name,
    hp,
    maxHp: hp,
    dist: dist || 0,
    x: p.x,
    y: p.y,
    speed: def.speed,
    gold: Math.round(def.gold * (1 + 0.08 * (game.wave - 1))),
    lives: def.lives,
    r: def.r,
    color: def.color,
    slowMul: 1,
    auraSlow: 1,
    wob: game.rng.range(0, Math.PI * 2),
    flash: 0,
    bossPhase: 0,
    dead: false,
  };
  game.enemies.push(e);
  if (type === 'king') {
    game.boss = e;
    game.bossPhase = 1;
  }
  return e;
}

function waveClearBonus(game) {
  const interest = Math.floor(game.gold * 0.05);
  return 25 + 5 * game.wave + interest;
}

function onWaveCleared(game, audio) {
  game.waveActive = false;
  game.stats.wavesCleared++;
  const bonus = waveClearBonus(game);
  game.gold += bonus;
  game.stats.goldEarned += bonus;
  game.score += bonus * 10 + game.wave * 50;
  logLine(game, `Wave ${game.wave} held! +${bonus}g (incl. ${Math.floor(game.gold * 0.05)}g interest).`);
  addFloater(game, KEEP.x - 60, KEEP.y - 60, `+${bonus}g wave bonus`, '#ffd166');
  if (game.wave >= TOTAL_WAVES) {
    winGame(game, audio);
    return;
  }
  if (game.wave === 3 || game.wave === 6 || game.wave === 9) {
    openBoonDraft(game);
    return;
  }
  game.banner = { text: 'WAVE HELD', sub: `Press SPACE for wave ${game.wave + 1} — ${WAVES[game.wave].name}.`, t: 2.2 };
  game.buildDelay = 0.8;
  if (audio) audio.coin();
}

export function openBoonDraft(game) {
  game.draft = game.rng.shuffle(BOON_IDS).slice(0, 3);
  game.mode = MODES.BOON;
  game.banner = null;
  logLine(game, 'The tide offers a boon — choose one.');
}

export function applyBoon(game, boonId, audio) {
  if (!game.draft.includes(boonId)) return false;
  const b = BOONS[boonId];
  if (boonId === 'salted') game.boonDmg = (game.boonDmg || 1) * 1.15;
  if (boonId === 'pockets') {
    game.gold += 100;
    game.stats.goldEarned += 100;
  }
  if (boonId === 'stormfav') game.boonStorm = (game.boonStorm || 1) * 1.5;
  if (boonId === 'secondwind') game.lives = Math.min(game.maxLives, game.lives + 5);
  if (boonId === 'mastery') game.tide.dur.low += 10;
  if (boonId === 'thrifty') game.boonCost = (game.boonCost || 1) * 0.85;
  game.stats.boonsTaken++;
  logLine(game, `Boon taken: ${b.name}.`);
  addFloater(game, 640, 300, b.name, '#80ed99');
  game.draft = [];
  game.mode = MODES.PLAYING;
  game.buildDelay = 0.8;
  game.banner = { text: 'WAVE HELD', sub: `Press SPACE for wave ${game.wave + 1} — ${WAVES[game.wave].name}.`, t: 2.2 };
  if (audio) audio.boon();
  return true;
}

export function towerCost(game, towerId) {
  const base = TOWERS[towerId].cost;
  return Math.round(base * (game.boonCost || 1));
}
export function upgradeCost(game, tower) {
  const up = UPGRADE[tower.level];
  if (!up) return null;
  return Math.round(TOWERS[tower.type].cost * up.costMul * (game.boonCost || 1));
}
export function sellValue(tower) {
  let invested = TOWERS[tower.type].cost;
  for (let l = 1; l < tower.level; l++) invested += TOWERS[tower.type].cost * UPGRADE[l].costMul;
  return Math.floor(invested * 0.7);
}

export function canBuildOn(game, plotIndex) {
  const plot = PLOTS[plotIndex];
  if (!plot) return false;
  if (game.towers.some((t) => t.plot === plotIndex)) return false;
  if (plot.mud && game.tide.phase !== 'low') return false;
  return true;
}

export function buildTower(game, plotIndex, towerId, audio) {
  if (!canBuildOn(game, plotIndex)) return false;
  const cost = towerCost(game, towerId);
  if (game.gold < cost) return false;
  game.gold -= cost;
  const plot = PLOTS[plotIndex];
  game.towers.push({
    plot: plotIndex, type: towerId, level: 1, cd: 0, angle: -Math.PI / 2,
    x: plot.x, y: plot.y, mud: plot.mud, kills: 0, lit: false, buffed: false,
  });
  game.stats.towersBuilt++;
  game.selectedPlot = -1;
  game.selectedTower = game.towers[game.towers.length - 1];
  spawnBurst(game, plot.x, plot.y, TOWERS[towerId].color, 14);
  if (audio) audio.build();
  return true;
}

export function upgradeTower(game, tower, audio) {
  const cost = upgradeCost(game, tower);
  if (cost === null || game.gold < cost) return false;
  game.gold -= cost;
  tower.level++;
  game.stats.upgradesTaken++;
  spawnBurst(game, tower.x, tower.y, '#ffe66d', 18);
  addFloater(game, tower.x, tower.y - 30, `LEVEL ${tower.level}!`, '#ffe66d');
  if (audio) audio.build();
  return true;
}

export function sellTower(game, tower, audio) {
  const v = sellValue(tower);
  game.gold += v;
  game.towers = game.towers.filter((t) => t !== tower);
  game.selectedTower = null;
  addFloater(game, tower.x, tower.y - 30, `+${v}g`, '#ffd166');
  if (audio) audio.coin();
  return v;
}

export function addFloater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color: color || '#ffffff', t: 1.4 });
  if (game.floaters.length > 24) game.floaters.shift();
}

export function spawnBurst(game, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = game.rng.angle();
    const sp = game.rng.range(40, 220);
    game.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: game.rng.range(0.3, 0.8), max: 0.8, color, size: game.rng.range(1.5, 3.5),
    });
  }
  if (game.particles.length > 400) game.particles.splice(0, game.particles.length - 400);
}

function winGame(game, audio) {
  game.mode = MODES.VICTORY;
  game.over = true;
  game.score += game.lives * 500;
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
  logLine(game, 'THE DROWNED KING IS DEAD. Saltspire stands!');
  if (audio) audio.win();
}

function loseGame(game, audio) {
  game.mode = MODES.GAMEOVER;
  game.over = true;
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
  logLine(game, 'The keep has fallen. The sea takes Saltspire.');
  if (audio) audio.lose();
}

// ---- combat helpers ----

function towerRange(game, tower) {
  const def = TOWERS[tower.type];
  let r = def.range * (tower.level > 1 ? 1.1 : 1) * (tower.level > 2 ? 1.1 : 1);
  if (tower.buffed) r += 15;
  return r;
}
function towerDamage(game, tower) {
  const def = TOWERS[tower.type];
  let d = def.dmg;
  if (tower.level > 1) d *= 1.6;
  if (tower.level > 2) d *= 1.6;
  d *= game.boonDmg || 1;
  if (tower.lit) d *= 1.5;
  if (tower.buffed) d *= 1.25;
  if (tower.type === 'storm') {
    d *= game.boonStorm || 1;
    if (game.tide.flood > 0.5) d *= 1.5;
  }
  return d;
}
function beaconBuffed(game, tower) {
  for (const t of game.towers) {
    if (t.type === 'beacon' && t !== tower) {
      const d = Math.hypot(t.x - tower.x, t.y - tower.y);
      if (d <= 190) return true;
    }
  }
  return false;
}
function beamLit(game, tower) {
  const dx = tower.x - KEEP.x;
  const dy = tower.y - KEEP.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 720) return false;
  let diff = Math.atan2(dy, dx) - game.beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < 0.21;
}

function damageEnemy(game, e, dmg, audio) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.hp <= 0) {
    e.dead = true;
    game.kills++;
    game.gold += e.gold;
    game.stats.goldEarned += e.gold;
    game.score += e.gold * 5;
    spawnBurst(game, e.x, e.y, e.color, e.type === 'king' ? 60 : 12);
    addFloater(game, e.x, e.y - 16, `+${e.gold}g`, '#ffd166');
    if (audio) audio.kill();
    if (e.type === 'king') {
      game.boss = null;
      game.banner = { text: 'THE DROWNED KING IS DEAD', sub: 'Saltspire stands. The tide recedes.', t: 3 };
    }
  }
}

function fireTower(game, tower, dt, audio) {
  const def = TOWERS[tower.type];
  if (def.proj === 'none' || def.proj === 'aura') return;
  // Target: the enemy furthest along the path within range.
  let target = null;
  const range = towerRange(game, tower);
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= range && (!target || e.dist > target.dist)) target = e;
  }
  if (!target) return;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  const dmg = towerDamage(game, tower);
  if (def.proj === 'shell') {
    game.projectiles.push({
      kind: 'shell', x: tower.x, y: tower.y, tx: target.x, ty: target.y,
      dmg, splash: def.splash * (tower.level > 1 ? 1.3 : 1), speed: 340, tower,
    });
    if (audio) audio.cannon();
  } else if (def.proj === 'zap') {
    // Chain lightning: hit the target and the nearest others.
    const hit = [target];
    let from = target;
    for (let c = 1; c < (def.chain || 1); c++) {
      let next = null;
      let best = 130;
      for (const e of game.enemies) {
        if (e.dead || hit.includes(e)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < best) {
          best = d;
          next = e;
        }
      }
      if (!next) break;
      hit.push(next);
      from = next;
    }
    let px = tower.x;
    let py = tower.y;
    for (const e of hit) {
      game.tracers.push({ x1: px, y1: py, x2: e.x, y2: e.y, t: 0.14, max: 0.14, color: '#7dd3fc', width: 2 });
      damageEnemy(game, e, dmg, audio);
      px = e.x;
      py = e.y;
    }
    if (audio) audio.zap();
  } else {
    // Harpoon: instant hit + tracer.
    game.tracers.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, t: 0.1, max: 0.1, color: '#ffd166', width: 2 });
    damageEnemy(game, target, dmg, audio);
    tower.kills++;
    if (audio) audio.shoot();
  }
  tower.cd = 1 / def.rate;
}

function applyAuras(game, dt, audio) {
  for (const tower of game.towers) {
    const def = TOWERS[tower.type];
    if (def.proj !== 'aura') continue;
    const range = def.aura * (tower.level > 1 ? 1.15 : 1);
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= range) {
        e.auraSlow = Math.min(e.auraSlow, def.slow);
        if (def.dmg > 0) {
          e.hp -= def.dmg * (tower.level > 1 ? 1.6 : 1) * dt;
          e.flash = 0.05;
          if (e.hp <= 0) damageEnemy(game, e, 0, audio);
        }
      }
    }
  }
}

function updateTide(game, dt) {
  const tide = game.tide;
  tide.t -= dt;
  if (tide.t <= 0) {
    const idx = TIDE_ORDER.indexOf(tide.phase);
    tide.phase = TIDE_ORDER[(idx + 1) % TIDE_ORDER.length];
    tide.t = tide.dur[tide.phase];
    if (tide.phase === 'high') {
      // Wrecks wash ashore: up to 3, +25g each, auto-collected.
      const n = game.rng.int(2, 3);
      for (let i = 0; i < n; i++) {
        const p = pointOnPath(game.rng.range(200, PATH_GEOM.total - 200));
        game.wrecks.push({ x: p.x + game.rng.range(-30, 30), y: p.y + game.rng.range(-24, 24), t: 0 });
      }
      game.banner = { text: 'HIGH TIDE — THE SEA RISES', sub: 'The road floods: the drowned slow. Wrecks wash ashore.', t: 2.4 };
      logLine(game, 'High tide! The road floods — foes slow 35%.');
    } else if (tide.phase === 'low') {
      game.banner = { text: 'LOW TIDE — THE MUDFLATS BARE', sub: 'Mudflat plots are buildable now. Build cheap, build fast.', t: 2.4 };
      logLine(game, 'Low tide — mudflat plots open.');
    }
  }
  // Flood level: 0 at low, ramps in rising, 1 at high, drains in falling.
  const target = tide.phase === 'high' ? 1 : tide.phase === 'low' ? 0 : tide.phase === 'rising' ? 1 - tide.t / tide.dur.rising : tide.t / tide.dur.falling;
  tide.flood += (target - tide.flood) * Math.min(1, dt * 1.5);
  if (tide.phase === 'low') tide.flood = Math.max(0, tide.flood - dt * 0.5);
}

function updateWrecks(game, dt) {
  for (const w of game.wrecks) {
    w.t += dt;
    if (w.t > 1.0 && !w.collected) {
      w.collected = true;
      game.gold += 25;
      game.stats.goldEarned += 25;
      game.stats.salvage += 25;
      game.score += 25;
      addFloater(game, w.x, w.y - 10, '+25g salvage', '#80ed99');
      logLine(game, 'Salvage washed ashore: +25g.');
    }
  }
  game.wrecks = game.wrecks.filter((w) => w.t < 2.2);
}

function updateBoss(game, audio) {
  const boss = game.boss;
  if (!boss || boss.dead) return;
  const frac = boss.hp / boss.maxHp;
  if (game.bossPhase === 1 && frac <= 0.66) {
    game.bossPhase = 2;
    game.banner = { text: 'THE KING CALLS HIS COURT', sub: 'Phase II — the Drowned King summons minions and quickens.', t: 2.6 };
    for (let i = 0; i < 4; i++) spawnEnemy(game, 'murk', Math.max(0, boss.dist - 60 - i * 20));
    if (audio) audio.boss();
  } else if (game.bossPhase === 2 && frac <= 0.33) {
    game.bossPhase = 3;
    game.banner = { text: 'THE KING ENRAGES', sub: 'Phase III — faster, crueller, and the sea itself boils.', t: 2.6 };
    for (let i = 0; i < 4; i++) spawnEnemy(game, 'runner', Math.max(0, boss.dist - 60 - i * 20));
    if (audio) audio.boss();
  }
}

// ---- main update ----

export function update(game, dt, input, audio) {
  game.time += dt;
  // Rain always drifts.
  for (const r of game.rain) {
    r.y += r.sp * dt;
    r.x -= r.sp * 0.25 * dt;
    if (r.y > H) {
      r.y = -20;
      r.x = game.rng.range(0, W);
    }
  }
  if (game.mode === MODES.TITLE) {
    game.titleT += dt;
    game.beamAngle += (Math.PI * 2 / 24) * dt;
    updateParticles(game, dt);
    return;
  }
  if (game.mode === MODES.PAUSED || game.mode === MODES.BOON) {
    updateParticles(game, dt);
    return;
  }
  if (game.mode === MODES.VICTORY || game.mode === MODES.GAMEOVER) {
    updateParticles(game, dt);
    if (game.rng.next() < dt * 2) {
      spawnBurst(game, game.rng.range(60, 900), game.rng.range(80, 620), game.rng.pick(['#ffd166', '#4cc9f0', '#ff4d6d', '#80ed99']), 10);
    }
    return;
  }
  if (game.mode !== MODES.PLAYING) return;

  game.playTime += dt;
  if (game.banner) {
    game.banner.t -= dt;
    if (game.banner.t <= 0) game.banner = null;
  }
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 3);

  updateTide(game, dt);
  game.beamAngle += (Math.PI * 2 / 24) * dt;
  updateWrecks(game, dt);

  // Spawning.
  if (game.waveActive) {
    game.spawnT += dt;
    while (game.spawnQueue.length && game.spawnQueue[0].at <= game.spawnT) {
      const s = game.spawnQueue.shift();
      spawnEnemy(game, s.type, -10);
    }
  }

  // Tower buff/lit flags, then firing.
  for (const t of game.towers) {
    t.buffed = beaconBuffed(game, t);
    t.lit = beamLit(game, t);
  }
  for (const t of game.towers) {
    const def = TOWERS[t.type];
    if (def.proj === 'none' || def.proj === 'aura') continue;
    let rateMul = 1;
    if (t.mud && game.tide.flood > 0.5) rateMul = 0.5;
    t.cd -= dt * rateMul;
    if (t.cd <= 0) fireTower(game, t, dt, audio);
  }
  applyAuras(game, dt, audio);

  // Projectiles (cannon shells).
  for (const p of game.projectiles) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step) {
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash) damageEnemy(game, e, p.dmg, audio);
      }
      spawnBurst(game, p.tx, p.ty, '#ff7b54', 10);
      p.done = true;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
  game.projectiles = game.projectiles.filter((p) => !p.done);

  // Enemies move along the path.
  const floodSlow = 1 - 0.35 * game.tide.flood;
  for (const e of game.enemies) {
    if (e.dead) continue;
    let mul = floodSlow * e.auraSlow;
    if (e.type === 'king') mul *= game.bossPhase === 3 ? 1.5 : game.bossPhase === 2 ? 1.25 : 1;
    e.dist += e.speed * mul * dt;
    const p = pointOnPath(e.dist);
    e.x = p.x;
    e.y = p.y;
    e.wob += dt * 6;
    if (e.flash > 0) e.flash -= dt;
    e.auraSlow = 1;
    if (e.dist >= PATH_GEOM.total) {
      e.dead = true;
      e.reached = true;
      game.lives -= e.lives;
      game.shake = 0.5;
      addFloater(game, KEEP.x - 40, KEEP.y - 60, e.type === 'king' ? 'THE KING ENTERS!' : `-${e.lives} ❤`, '#ff4d6d');
      logLine(game, `${e.name} reached the keep! -${e.lives} lives.`);
      if (audio) audio.leak();
      if (e.type === 'king' || game.lives <= 0) {
        game.lives = Math.max(0, game.lives);
        loseGame(game, audio);
        return;
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead);
  updateBoss(game, audio);

  // Wave clear?
  if (game.waveActive && game.spawnQueue.length === 0 && game.enemies.length === 0) {
    onWaveCleared(game, audio);
  }

  updateParticles(game, dt);
  for (const t of game.tracers) t.t -= dt;
  game.tracers = game.tracers.filter((t) => t.t > 0);
  for (const f of game.floaters) {
    f.t -= dt;
    f.y -= 22 * dt;
  }
  game.floaters = game.floaters.filter((f) => f.t > 0);

  // Autopilot / build-phase pacing.
  if (game.buildDelay > 0) game.buildDelay -= dt;
}

function updateParticles(game, dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

// ---- autopilot ----

// The build plan: plot indices from data.js PLOTS.
// 0-3 top row, 4-7 middle, 8-11 bottom, 12-15 mudflats.
const PLAN = [
  { kind: 'build', plot: 0, tower: 'harpoon' },
  { kind: 'build', plot: 1, tower: 'harpoon' },
  { kind: 'build', plot: 3, tower: 'harpoon' },
  { kind: 'build', plot: 2, tower: 'cannon' },
  { kind: 'upgrade', plot: 0, level: 2 },
  { kind: 'upgrade', plot: 1, level: 2 },
  { kind: 'build', plot: 4, tower: 'storm' },
  { kind: 'build', plot: 5, tower: 'cannon' },
  { kind: 'build', plot: 7, tower: 'net' },
  { kind: 'upgrade', plot: 2, level: 2 },
  { kind: 'upgrade', plot: 4, level: 2 },
  { kind: 'build', plot: 11, tower: 'breakwall' },
  { kind: 'build', plot: 9, tower: 'storm' },
  { kind: 'build', plot: 6, tower: 'beacon' },
  { kind: 'upgrade', plot: 5, level: 2 },
  { kind: 'upgrade', plot: 9, level: 2 },
  { kind: 'build', plot: 8, tower: 'cannon' },
  { kind: 'build', plot: 10, tower: 'harpoon' },
  { kind: 'upgrade', plot: 0, level: 3 },
  { kind: 'upgrade', plot: 2, level: 3 },
  { kind: 'upgrade', plot: 4, level: 3 },
  { kind: 'upgrade', plot: 5, level: 3 },
  { kind: 'build', plot: 12, tower: 'harpoon' },
  { kind: 'build', plot: 13, tower: 'cannon' },
  { kind: 'build', plot: 14, tower: 'storm' },
  { kind: 'build', plot: 15, tower: 'beacon' },
  { kind: 'upgrade', plot: 9, level: 3 },
  { kind: 'upgrade', plot: 10, level: 2 },
  { kind: 'upgrade', plot: 8, level: 2 },
  { kind: 'upgrade', plot: 13, level: 2 },
  { kind: 'upgrade', plot: 14, level: 2 },
  { kind: 'upgrade', plot: 1, level: 3 },
  { kind: 'upgrade', plot: 3, level: 2 },
  { kind: 'upgrade', plot: 3, level: 3 },
  { kind: 'upgrade', plot: 7, level: 2 },
  { kind: 'upgrade', plot: 11, level: 2 },
  { kind: 'upgrade', plot: 10, level: 3 },
  { kind: 'upgrade', plot: 8, level: 3 },
];

function planStepDone(game, step) {
  const tower = game.towers.find((t) => t.plot === step.plot);
  if (step.kind === 'build') return !!tower;
  if (step.kind === 'upgrade') return !!tower && tower.level >= step.level;
  return true;
}

function runPlan(game, audio) {
  let acted = false;
  for (const step of PLAN) {
    if (planStepDone(game, step)) continue;
    if (step.kind === 'build') {
      if (!canBuildOn(game, step.plot)) continue;
      if (game.gold < towerCost(game, step.tower)) continue;
      if (buildTower(game, step.plot, step.tower, audio)) acted = true;
    } else {
      const tower = game.towers.find((t) => t.plot === step.plot);
      if (!tower || tower.level >= step.level) continue;
      const cost = upgradeCost(game, tower);
      if (cost === null || game.gold < cost) continue;
      if (upgradeTower(game, tower, audio)) acted = true;
    }
  }
  return acted;
}

export function autopilot(game, input, audio) {
  if (game.mode === MODES.TITLE) {
    startRun(game, 'dusk', audio);
    return;
  }
  if (game.mode === MODES.BOON) {
    if (game.draft.length) {
      let best = game.draft[0];
      for (const id of game.draft) {
        if (BOONS[id].prio < BOONS[best].prio) best = id;
      }
      applyBoon(game, best, audio);
    }
    return;
  }
  if (game.mode !== MODES.PLAYING) return;
  runPlan(game, audio);
  if (!game.waveActive && game.buildDelay <= 0 && game.wave < TOTAL_WAVES) {
    startWave(game, audio);
  }
}

// ---- clicking ----

// Plot under a point (board area only), or -1.
export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    if (Math.hypot(x - p.x, y - p.y) <= PLOT_R + 6) return i;
  }
  return -1;
}

export function towerAt(game, x, y) {
  for (const t of game.towers) {
    if (Math.hypot(x - t.x, y - t.y) <= PLOT_R + 4) return t;
  }
  return null;
}

// A click on the board: select a plot/tower, or build with the chosen tower.
export function boardClick(game, x, y, audio) {
  const plot = plotAt(x, y);
  const tower = towerAt(game, x, y);
  if (tower) {
    game.selectedTower = tower;
    game.selectedPlot = -1;
    if (audio) audio.click();
    return 'tower';
  }
  if (plot >= 0) {
    if (game.buildSel) {
      if (buildTower(game, plot, game.buildSel, audio)) {
        game.buildSel = null;
        return 'built';
      }
      game.selectedPlot = plot;
      return 'plot';
    }
    game.selectedPlot = plot;
    game.selectedTower = null;
    if (audio) audio.click();
    return 'plot';
  }
  game.selectedPlot = -1;
  game.selectedTower = null;
  return 'empty';
}
