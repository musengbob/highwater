// HIGHWATER — static data: board geometry, towers, enemies, waves, boons.
// Nothing here changes at runtime; sim.js reads it, render.js draws it.

export const W = 1280;
export const H = 720;
export const TOP_H = 64; // HUD bar height
export const PANEL_X = 960; // right panel starts here
export const BOARD_W = 960;

// The road the drowned walk: a serpentine from the sea (left) to the keep.
export const PATH = [
  [-20, 140],
  [840, 140],
  [840, 290],
  [120, 290],
  [120, 440],
  [840, 440],
  [840, 590],
  [906, 590],
];
export const KEEP = { x: 906, y: 590, r: 44 };

// Build plots. mud: true plots sit on the mudflats and can only be built
// on during LOW tide; their towers fire at half rate while stranded at
// HIGH tide. A Beacon has no fire rate, so it is never stranded.
export const PLOTS = [
  { x: 200, y: 215, mud: false },
  { x: 380, y: 215, mud: false },
  { x: 560, y: 215, mud: false },
  { x: 740, y: 215, mud: false },
  { x: 200, y: 365, mud: false },
  { x: 380, y: 365, mud: false },
  { x: 560, y: 365, mud: false },
  { x: 740, y: 365, mud: false },
  { x: 200, y: 515, mud: false },
  { x: 380, y: 515, mud: false },
  { x: 560, y: 515, mud: false },
  { x: 740, y: 515, mud: false },
  { x: 80, y: 665, mud: true },
  { x: 280, y: 665, mud: true },
  { x: 480, y: 665, mud: true },
  { x: 680, y: 665, mud: true },
];
export const PLOT_R = 26;

// Tide cycle: LOW 20s -> RISING 10s -> HIGH 20s -> FALLING 10s, looping.
export const TIDE_DUR = { low: 20, rising: 10, high: 20, falling: 10 };
export const TIDE_ORDER = ['low', 'rising', 'high', 'falling'];
export const TIDE_NAME = { low: 'LOW TIDE', rising: 'RISING TIDE', high: 'HIGH TIDE', falling: 'FALLING TIDE' };

export const TOWERS = {
  harpoon: {
    id: 'harpoon', name: 'Harpoon', key: '1', cost: 50,
    desc: 'Fast harpoons. Cheap and reliable.',
    dmg: 9, rate: 2.0, range: 115, color: '#ffd166', proj: 'bolt',
  },
  cannon: {
    id: 'cannon', name: 'Cannon', key: '2', cost: 100,
    desc: 'Splash damage. Cracks shells and swarms.',
    dmg: 26, rate: 0.7, range: 105, splash: 52, color: '#ff7b54', proj: 'shell',
  },
  net: {
    id: 'net', name: 'Net Snare', key: '3', cost: 60,
    desc: 'Slows enemies in radius by 45%.',
    dmg: 2, rate: 1.0, range: 95, slow: 0.55, aura: 95, color: '#80ed99', proj: 'aura',
  },
  storm: {
    id: 'storm', name: 'Stormcaller', key: '4', cost: 150,
    desc: 'Chain lightning, 3 targets.',
    dmg: 15, rate: 1.1, range: 135, chain: 3, color: '#7dd3fc', proj: 'zap',
  },
  breakwall: {
    id: 'breakwall', name: 'Breakwall', key: '5', cost: 80,
    desc: 'Slowing aura + grind damage.',
    dmg: 5, rate: 1.0, range: 85, slow: 0.7, aura: 85, color: '#c77dff', proj: 'aura',
  },
  beacon: {
    id: 'beacon', name: 'Beacon', key: '6', cost: 200,
    desc: 'Buffs nearby towers +25%.',
    dmg: 0, rate: 0, range: 190, buff: true, color: '#ffe66d', proj: 'none',
  },
};
export const TOWER_ORDER = ['harpoon', 'cannon', 'net', 'storm', 'breakwall', 'beacon'];
// Upgrade multipliers per level (L1 -> L2 -> L3).
export const UPGRADE = [
  null,
  { costMul: 0.75, dmgMul: 1.6, rangeMul: 1.1 },
  { costMul: 1.5, dmgMul: 1.6, rangeMul: 1.1 },
];

export const ENEMIES = {
  shambler: { name: 'Drowned Shambler', hp: 30, speed: 55, gold: 6, lives: 1, r: 13, color: '#7fb069' },
  runner: { name: 'Tide Runner', hp: 22, speed: 88, gold: 7, lives: 1, r: 11, color: '#4cc9f0' },
  shellback: { name: 'Shellback', hp: 95, speed: 40, gold: 12, lives: 2, r: 16, color: '#b08968' },
  murk: { name: 'Murkspawn', hp: 12, speed: 72, gold: 4, lives: 1, r: 8, color: '#9d4edd' },
  eel: { name: 'Eel', hp: 18, speed: 98, gold: 7, lives: 1, r: 9, color: '#f72585' },
  knight: { name: 'Drowned Knight', hp: 230, speed: 45, gold: 22, lives: 3, r: 17, color: '#adb5bd' },
  king: { name: 'THE DROWNED KING', hp: 6500, speed: 30, gold: 500, lives: 99, r: 30, color: '#ffd60a' },
};

// Wave table: [type, count] entries; count is spawned in a steady stream.
// hpMul grows 32% per wave; the boss wave adds the King at the end.
export const WAVES = [
  { name: 'First Foam', comp: [['shambler', 8]] },
  { name: 'Shallow Runners', comp: [['shambler', 10], ['runner', 4]] },
  { name: 'Murk Rising', comp: [['shambler', 8], ['runner', 6], ['murk', 12]] },
  { name: 'Shellbreak', comp: [['shellback', 6], ['shambler', 10], ['runner', 6]] },
  { name: 'Eel Tide', comp: [['runner', 12], ['murk', 12], ['eel', 6]] },
  { name: 'The Grinding Sea', comp: [['shellback', 8], ['runner', 10], ['eel', 8], ['murk', 12]] },
  { name: 'Drowned March', comp: [['shambler', 14], ['runner', 10], ['shellback', 6], ['eel', 8]] },
  { name: 'Knights of the Deep', comp: [['shellback', 10], ['eel', 12], ['murk', 12], ['knight', 5]] },
  { name: 'Storm Surge', comp: [['runner', 16], ['shellback', 8], ['eel', 10], ['knight', 7]] },
  { name: 'The Hollow Host', comp: [['knight', 11], ['eel', 14], ['shellback', 10], ['murk', 14]] },
  { name: 'Last Light Fades', comp: [['runner', 20], ['knight', 10], ['shellback', 12], ['eel', 12]] },
  { name: 'THE DROWNED KING', comp: [['shambler', 8], ['runner', 6], ['king', 1]], boss: true },
];
export const TOTAL_WAVES = 12;

export const BOONS = {
  salted: { name: 'Salted Steel', desc: '+15% damage for all towers.', prio: 1 },
  pockets: { name: 'Deep Pockets', desc: '+100 gold, right now.', prio: 2 },
  stormfav: { name: "Storm's Favor", desc: 'Stormcallers deal +50% damage.', prio: 3 },
  secondwind: { name: 'Second Wind', desc: '+5 lives, up to 25.', prio: 4 },
  mastery: { name: 'Tide Mastery', desc: 'LOW tide lasts +10s each cycle.', prio: 5 },
  thrifty: { name: 'Thrifty Hands', desc: 'All towers cost 15% less.', prio: 6 },
};
export const BOON_IDS = ['salted', 'pockets', 'stormfav', 'secondwind', 'mastery', 'thrifty'];

export const DIFFICULTIES = {
  calm: { id: 'calm', name: 'CALM', lives: 25, gold: 220, desc: '25 lives · 220g · a gentle sea' },
  dusk: { id: 'dusk', name: 'DUSK', lives: 20, gold: 180, desc: '20 lives · 180g · the intended tide' },
  storm: { id: 'storm', name: 'STORM', lives: 15, gold: 150, desc: '15 lives · 150g · the sea is angry' },
};
export const DIFF_ORDER = ['calm', 'dusk', 'storm'];

// Path geometry, precomputed once.
export function pathSegments() {
  const segs = [];
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x1, y1] = PATH[i];
    const [x2, y2] = PATH[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, start: total });
    total += len;
  }
  return { segs, total };
}
export const PATH_GEOM = pathSegments();
export function pointOnPath(dist) {
  const d = Math.max(0, Math.min(dist, PATH_GEOM.total));
  for (const s of PATH_GEOM.segs) {
    if (d <= s.start + s.len || s === PATH_GEOM.segs[PATH_GEOM.segs.length - 1]) {
      const t = s.len === 0 ? 0 : Math.min(1, Math.max(0, (d - s.start) / s.len));
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
  }
  const last = PATH[PATH.length - 1];
  return { x: last[0], y: last[1] };
}
