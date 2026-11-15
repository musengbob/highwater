// HIGHWATER — all drawing: the drowned coast, the keep, towers, enemies,
// the dense HUD, and every screen (title, boon draft, pause, victory, loss).

import {
  W, H, TOP_H, PANEL_X, PATH, PLOTS, PLOT_R, TIDE_NAME, TOWERS, TOWER_ORDER,
  ENEMIES, WAVES, TOTAL_WAVES, BOONS, DIFFICULTIES, DIFF_ORDER,
  PATH_GEOM, pointOnPath, KEEP,
} from './data.js';
import { MODES, towerCost, upgradeCost, sellValue, plotAt } from './sim.js';

// Right-panel layout (hit helpers below use these exact numbers).
export const CARD = { x: 972, y: 100, w: 144, h: 88, gapX: 8, gapY: 8 };
export const HUD_BTN = {
  speed: { x: 1000, y: 12, w: 74, h: 40 },
  pause: { x: 1082, y: 12, w: 74, h: 40 },
  mute: { x: 1164, y: 12, w: 100, h: 40 },
};
const DIFF_BTN = { y: 560, w: 220, h: 56, gap: 24 };
const BOON_CARD = { y: 250, w: 260, h: 240, gap: 30 };
const PAUSE_BTN = { x: 490, w: 300, h: 52, gap: 14, y0: 300 };
const END_BTN = { y: 520, w: 220, h: 52, gap: 24 };
const SEL_BTN = { upgrade: { x: 972, y: 582, w: 144, h: 30 }, sell: { x: 1124, y: 582, w: 144, h: 30 } };

function wrapText(s, maxChars) {
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function cardRect(i) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {
    x: CARD.x + col * (CARD.w + CARD.gapX),
    y: CARD.y + row * (CARD.h + CARD.gapY),
    w: CARD.w,
    h: CARD.h,
  };
}

export function buildBarAt(x, y) {
  for (let i = 0; i < TOWER_ORDER.length; i++) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return TOWER_ORDER[i];
  }
  return null;
}
export function hudButtonAt(x, y) {
  for (const k of Object.keys(HUD_BTN)) {
    const b = HUD_BTN[k];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return k;
  }
  return null;
}
export function titleDifficultyAt(x, y) {
  const total = DIFF_ORDER.length * DIFF_BTN.w + (DIFF_ORDER.length - 1) * DIFF_BTN.gap;
  const x0 = (W - total) / 2;
  for (let i = 0; i < DIFF_ORDER.length; i++) {
    const bx = x0 + i * (DIFF_BTN.w + DIFF_BTN.gap);
    if (x >= bx && x <= bx + DIFF_BTN.w && y >= DIFF_BTN.y && y <= DIFF_BTN.y + DIFF_BTN.h) return DIFF_ORDER[i];
  }
  return null;
}
export function boonCardAt(game, x, y) {
  if (game.mode !== MODES.BOON) return -1;
  const total = 3 * BOON_CARD.w + 2 * BOON_CARD.gap;
  const x0 = (W - total) / 2;
  for (let i = 0; i < 3; i++) {
    const bx = x0 + i * (BOON_CARD.w + BOON_CARD.gap);
    if (x >= bx && x <= bx + BOON_CARD.w && y >= BOON_CARD.y && y <= BOON_CARD.y + BOON_CARD.h) return i;
  }
  return -1;
}
export function pauseButtonAt(x, y) {
  const labels = ['resume', 'restart', 'quit', 'mute'];
  for (let i = 0; i < labels.length; i++) {
    const by = PAUSE_BTN.y0 + i * (PAUSE_BTN.h + PAUSE_BTN.gap);
    if (x >= PAUSE_BTN.x && x <= PAUSE_BTN.x + PAUSE_BTN.w && y >= by && y <= by + PAUSE_BTN.h) return labels[i];
  }
  return null;
}
export function endButtonAt(x, y) {
  const total = 2 * END_BTN.w + END_BTN.gap;
  const x0 = (W - total) / 2;
  for (let i = 0; i < 2; i++) {
    const bx = x0 + i * (END_BTN.w + END_BTN.gap);
    if (x >= bx && x <= bx + END_BTN.w && y >= END_BTN.y && y <= END_BTN.y + END_BTN.h) return i === 0 ? 'retry' : 'title';
  }
  return null;
}
export function upgradeButtonAt(x, y) {
  const b = SEL_BTN.upgrade;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
export function sellButtonAt(x, y) {
  const b = SEL_BTN.sell;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color || '#e8f1f2';
  ctx.font = `${weight || ''} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || 'rgba(8, 24, 38, 0.88)';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---- board ----

function drawSea(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1a2e');
  g.addColorStop(0.55, '#0b2436');
  g.addColorStop(1, '#081826');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Rolling swell lines.
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = 90 + i * 92;
    ctx.beginPath();
    for (let x = 0; x <= PANEL_X; x += 16) {
      const yy = y + Math.sin(x * 0.02 + game.time * 1.1 + i * 1.7) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Rain.
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of game.rain) {
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - r.len * 0.25, r.y + r.len);
  }
  ctx.stroke();
}

function drawRoad(ctx, game) {
  const flood = game.tide.flood;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Road bed.
  ctx.strokeStyle = '#3a2f28';
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.moveTo(PATH[0][0], PATH[0][1]);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1]);
  ctx.stroke();
  ctx.strokeStyle = '#57453a';
  ctx.lineWidth = 38;
  ctx.stroke();
  // Centre dashes (the old coast road).
  ctx.strokeStyle = 'rgba(255, 230, 180, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 18]);
  ctx.beginPath();
  ctx.moveTo(PATH[0][0], PATH[0][1]);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Flood water over the road.
  if (flood > 0.03) {
    ctx.strokeStyle = `rgba(56, 150, 220, ${0.55 * flood})`;
    ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.moveTo(PATH[0][0], PATH[0][1]);
    for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1]);
    ctx.stroke();
    ctx.strokeStyle = `rgba(200, 235, 255, ${0.35 * flood})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const p = pointOnPath((game.time * 30 + i * 500) % PATH_GEOM.total);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14 + 6 * Math.sin(game.time * 2 + i), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Sea edge on the left.
  ctx.fillStyle = 'rgba(20, 80, 130, 0.5)';
  ctx.fillRect(0, TOP_H, 6, H - TOP_H);
}

function drawPlots(ctx, game) {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    const hasTower = game.towers.some((t) => t.plot === i);
    const selected = game.selectedPlot === i;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLOT_R, 0, Math.PI * 2);
    if (p.mud) {
      ctx.fillStyle = game.tide.phase === 'low' ? 'rgba(120, 100, 60, 0.85)' : 'rgba(60, 70, 60, 0.7)';
      ctx.fill();
      ctx.strokeStyle = game.tide.phase === 'low' ? '#ffd166' : 'rgba(160, 180, 160, 0.5)';
      ctx.setLineDash(p.mud && game.tide.phase !== 'low' ? [4, 4] : []);
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      if (!hasTower) {
        text(ctx, p.mud && game.tide.phase === 'low' ? 'MUDFLAT' : 'FLOODED', p.x, p.y + 4, 9, game.tide.phase === 'low' ? '#ffd166' : '#9fb3a8', 'center', 'bold');
      }
    } else {
      ctx.fillStyle = hasTower ? 'rgba(40, 60, 70, 0.9)' : 'rgba(30, 55, 45, 0.85)';
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffe66d' : 'rgba(125, 211, 252, 0.45)';
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.stroke();
      if (!hasTower) {
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y);
        ctx.lineTo(p.x + 8, p.y);
        ctx.moveTo(p.x, p.y - 8);
        ctx.lineTo(p.x, p.y + 8);
        ctx.stroke();
      }
    }
  }
}

function drawKeepAt(ctx, game, kx, ky, kr, label) {
  // Beacon beam: a sweeping wedge from the keep.
  const a = game.beamAngle;
  const grad = ctx.createRadialGradient(kx, ky, 10, kx, ky, 700);
  grad.addColorStop(0, 'rgba(255, 230, 109, 0.34)');
  grad.addColorStop(1, 'rgba(255, 230, 109, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.arc(kx, ky, 700, a - 0.21, a + 0.21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 230, 109, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(kx + Math.cos(a - 0.21) * 700, ky + Math.sin(a - 0.21) * 700);
  ctx.moveTo(kx, ky);
  ctx.lineTo(kx + Math.cos(a + 0.21) * 700, ky + Math.sin(a + 0.21) * 700);
  ctx.stroke();
  // The keep itself: stone tower with a lit lamp room.
  ctx.fillStyle = '#2b3a4a';
  ctx.beginPath();
  ctx.arc(kx, ky, kr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#3d5266';
  ctx.beginPath();
  ctx.arc(kx, ky, kr - 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(kx, ky, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 230, 109, 0.25)';
  ctx.beginPath();
  ctx.arc(kx, ky, 22, 0, Math.PI * 2);
  ctx.fill();
  if (label) text(ctx, label, kx, ky + kr + 16, 11, '#e8f1f2', 'center', 'bold');
}

function drawKeep(ctx, game) {
  drawKeepAt(ctx, game, KEEP.x, KEEP.y, KEEP.r, 'SALTSPIRE');
}

function drawTower(ctx, game, t) {
  const def = TOWERS[t.type];
  // Range ring when selected.
  if (game.selectedTower === t) {
    let range = def.range * (t.level > 1 ? 1.1 : 1) * (t.level > 2 ? 1.1 : 1);
    if (t.buffed) range += 15;
    ctx.fillStyle = 'rgba(125, 211, 252, 0.08)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
    ctx.stroke();
  }
  if (t.type === 'beacon') {
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 190, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Base.
  ctx.fillStyle = '#22303e';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.lit ? '#ffe66d' : def.color;
  ctx.lineWidth = t.lit ? 3 : 2;
  ctx.stroke();
  if (t.lit) {
    ctx.fillStyle = 'rgba(255, 230, 109, 0.22)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glyph per tower.
  ctx.fillStyle = def.color;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 2;
  if (t.type === 'harpoon') {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (t.type === 'cannon') {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillRect(-4, -4, 20, 8);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.type === 'net') {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t.x - 10, t.y);
    ctx.lineTo(t.x + 10, t.y);
    ctx.moveTo(t.x, t.y - 10);
    ctx.lineTo(t.x, t.y + 10);
    ctx.stroke();
  } else if (t.type === 'storm') {
    ctx.beginPath();
    ctx.moveTo(t.x + 3, t.y - 12);
    ctx.lineTo(t.x - 5, t.y + 1);
    ctx.lineTo(t.x + 1, t.y + 1);
    ctx.lineTo(t.x - 3, t.y + 12);
    ctx.lineTo(t.x + 6, t.y - 1);
    ctx.lineTo(t.x, t.y - 1);
    ctx.closePath();
    ctx.fill();
  } else if (t.type === 'breakwall') {
    ctx.fillRect(t.x - 11, t.y - 8, 22, 16);
    ctx.fillStyle = '#22303e';
    ctx.fillRect(t.x - 6, t.y - 12, 4, 8);
    ctx.fillRect(t.x + 2, t.y - 12, 4, 8);
  } else if (t.type === 'beacon') {
    ctx.fillRect(t.x - 3, t.y - 12, 6, 24);
    ctx.beginPath();
    ctx.arc(t.x, t.y - 14, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff7cc';
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(t.x - 8 + i * 8, t.y + 24, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t.mud && game.tide.flood > 0.5) {
    text(ctx, 'STRANDED ½', t.x, t.y - 26, 9, '#9fb3a8', 'center', 'bold');
  }
}

function drawEnemy(ctx, game, e) {
  const bob = Math.sin(e.wob) * 2;
  const x = e.x;
  const y = e.y + bob;
  ctx.fillStyle = e.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  if (e.type === 'shambler') {
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f6212';
    ctx.beginPath();
    ctx.moveTo(x - e.r, y - 4);
    ctx.lineTo(x - e.r - 8, y - 10);
    ctx.moveTo(x + e.r, y - 4);
    ctx.lineTo(x + e.r + 8, y - 10);
    ctx.stroke();
    ctx.fillStyle = '#dcfce7';
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'runner') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(0, 1));
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (e.type === 'shellback') {
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, e.r - 4, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (e.type === 'murk') {
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'eel') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(e.wob * 2) * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (e.type === 'knight') {
    ctx.fillRect(x - 12, y - 12, 24, 24);
    ctx.fillStyle = '#495057';
    ctx.fillRect(x - 12, y - 12, 24, 8);
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(x - 2, y - 18, 4, 8);
  } else if (e.type === 'king') {
    ctx.fillStyle = 'rgba(255, 214, 10, 0.18)';
    ctx.beginPath();
    ctx.arc(x, y, e.r + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
    // Crown spikes.
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.35;
      ctx.lineTo(x + Math.cos(a) * (e.r + 12), y + Math.sin(a) * (e.r + 12));
      ctx.lineTo(x + Math.cos(a + 0.17) * (e.r - 2), y + Math.sin(a + 0.17) * (e.r - 2));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x - 9, y - 4, 3, 0, Math.PI * 2);
    ctx.arc(x + 9, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // HP bar when hurt.
  if (e.hp < e.maxHp) {
    const w = Math.max(22, e.r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2, y - e.r - 10, w, 4);
    ctx.fillStyle = e.type === 'king' ? '#ffd60a' : '#80ed99';
    ctx.fillRect(x - w / 2, y - e.r - 10, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

// ---- HUD + right panel ----

function drawTopBar(ctx, game) {
  ctx.fillStyle = '#06121f';
  ctx.fillRect(0, 0, W, TOP_H);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, TOP_H);
  ctx.lineTo(W, TOP_H);
  ctx.stroke();
  text(ctx, '⚓ HIGHWATER', 14, 26, 17, '#ffe66d', 'left', 'bold');
  text(ctx, DIFFICULTIES[game.difficulty].name, 14, 46, 11, '#7dd3fc', 'left', 'bold');
  text(ctx, `◉ ${game.gold}g`, 168, 30, 17, '#ffd166', 'left', 'bold');
  text(ctx, `❤ ${game.lives}`, 268, 30, 17, game.lives <= 5 ? '#ff4d6d' : '#ff8fa3', 'left', 'bold');
  text(ctx, `SCORE ${game.score}`, 360, 30, 14, '#e8f1f2', 'left');
  text(ctx, `BEST ${Math.max(game.best, game.score)}`, 360, 50, 11, '#7dd3fc', 'left');
  const waveLabel = game.wave === 0 ? 'BUILD — press SPACE' : `WAVE ${game.wave}/${TOTAL_WAVES} — ${game.waveName.toUpperCase()}`;
  text(ctx, waveLabel, 500, 30, 13, '#e8f1f2', 'left', 'bold');
  const left = game.waveActive ? game.enemies.length + game.spawnQueue.length : 0;
  text(ctx, game.waveActive ? `${left} drowned remain` : game.wave >= TOTAL_WAVES ? 'The King is dead' : 'No wave running', 500, 50, 11, '#9fb3a8', 'left');
  // Tide gauge.
  const gx = 768;
  const gw = 200;
  const tide = game.tide;
  text(ctx, `🌊 ${TIDE_NAME[tide.phase]}`, gx, 24, 13, tide.phase === 'high' ? '#7dd3fc' : tide.phase === 'low' ? '#ffd166' : '#e8f1f2', 'left', 'bold');
  text(ctx, `${Math.ceil(tide.t)}s`, gx + gw - 4, 24, 13, '#e8f1f2', 'right', 'bold');
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  rr(ctx, gx, 32, gw, 12, 6);
  ctx.fill();
  const frac = 1 - tide.t / tide.dur[tide.phase];
  ctx.fillStyle = tide.phase === 'high' ? '#38bdf8' : tide.phase === 'low' ? '#b08968' : '#7dd3fc';
  if (frac > 0.01) {
    rr(ctx, gx, 32, Math.max(8, gw * frac), 12, 6);
    ctx.fill();
  }
  text(ctx, `Flood ${Math.round(tide.flood * 100)}%`, gx, 58, 10, '#9fb3a8', 'left');
  // Buttons.
  for (const k of Object.keys(HUD_BTN)) {
    const b = HUD_BTN[k];
    const label = k === 'speed' ? `${game.speed}x` : k === 'pause' ? '❚❚ PAUSE' : game.muted ? '🔇 MUTED' : '🔊 SOUND';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.4)';
    ctx.stroke();
    text(ctx, label, b.x + b.w / 2, b.y + 26, 13, '#e8f1f2', 'center', 'bold');
  }
  // Boss bar.
  if (game.boss && !game.boss.dead) {
    const bw = 420;
    const bx = (PANEL_X - bw) / 2;
    const by = TOP_H + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    rr(ctx, bx - 8, by - 4, bw + 16, 30, 6);
    ctx.fill();
    text(ctx, `👑 THE DROWNED KING — PHASE ${game.bossPhase}`, bx + bw / 2, by + 8, 12, '#ffd60a', 'center', 'bold');
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(bx, by + 14, bw, 7);
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(bx, by + 14, bw * Math.max(0, game.boss.hp / game.boss.maxHp), 7);
  }
}

function drawRightPanel(ctx, game) {
  ctx.fillStyle = '#081826';
  ctx.fillRect(PANEL_X, TOP_H, W - PANEL_X, H - TOP_H);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.3)';
  ctx.beginPath();
  ctx.moveTo(PANEL_X, TOP_H);
  ctx.lineTo(PANEL_X, H);
  ctx.stroke();
  // Build bar.
  text(ctx, 'BUILD  —  click a card, then a plot  ·  1–6 hotkeys', CARD.x, 88, 12, '#7dd3fc', 'left', 'bold');
  for (let i = 0; i < TOWER_ORDER.length; i++) {
    const id = TOWER_ORDER[i];
    const def = TOWERS[id];
    const r = cardRect(i);
    const cost = towerCost(game, id);
    const afford = game.gold >= cost;
    const sel = game.buildSel === id;
    ctx.fillStyle = sel ? 'rgba(255, 230, 109, 0.2)' : 'rgba(125, 211, 252, 0.07)';
    rr(ctx, r.x, r.y, r.w, r.h, 7);
    ctx.fill();
    ctx.strokeStyle = sel ? '#ffe66d' : afford ? 'rgba(125, 211, 252, 0.45)' : 'rgba(125, 211, 252, 0.15)';
    ctx.lineWidth = sel ? 2 : 1;
    ctx.stroke();
    ctx.lineWidth = 1;
    text(ctx, `[${def.key}] ${def.name}`, r.x + 8, r.y + 18, 12, afford ? '#e8f1f2' : '#7a8a94', 'left', 'bold');
    text(ctx, `${cost}g`, r.x + r.w - 8, r.y + 18, 12, afford ? '#ffd166' : '#7a8a94', 'right', 'bold');
    const descLines = wrapText(def.desc, 24).slice(0, 2);
    descLines.forEach((ln, li) => text(ctx, ln, r.x + 8, r.y + 34 + li * 13, 10, '#9fb3a8', 'left'));
    text(ctx, def.buff ? 'BUFF · no attack' : `DMG ${def.dmg} · RNG ${def.range}`, r.x + 8, r.y + 64, 10, '#7dd3fc', 'left');
    if (id === 'storm') text(ctx, '+50% dmg at HIGH tide', r.x + 8, r.y + 79, 10, '#38bdf8', 'left');
    if (id === 'beacon') text(ctx, 'Buffs towers within 190', r.x + 8, r.y + 79, 10, '#ffe66d', 'left');
    if (id === 'net' || id === 'breakwall') text(ctx, `Slows ${Math.round((1 - def.slow) * 100)}% in radius`, r.x + 8, r.y + 79, 10, '#80ed99', 'left');
    if (id === 'harpoon') text(ctx, 'Fast · cheap · reliable', r.x + 8, r.y + 79, 10, '#ffd166', 'left');
    if (id === 'cannon') text(ctx, `Splash ${def.splash}`, r.x + 8, r.y + 79, 10, '#ff7b54', 'left');
  }
  // INCOMING panel.
  const iy = 392;
  panel(ctx, CARD.x, iy, 296, 118, 'rgba(8, 24, 38, 0.88)');
  const next = game.wave < TOTAL_WAVES ? WAVES[game.wave] : null;
  if (next) {
    text(ctx, `INCOMING — WAVE ${game.wave + 1}: ${next.name.toUpperCase()}`, CARD.x + 10, iy + 20, 12, '#ffd166', 'left', 'bold');
    const counts = {};
    for (const [t, c] of next.comp) counts[t] = c;
    let line = 0;
    for (const [t, c] of Object.entries(counts)) {
      text(ctx, `${ENEMIES[t].name} ×${c}`, CARD.x + 10, iy + 42 + line * 17, 12, '#e8f1f2', 'left');
      line++;
    }
    if (next.boss) text(ctx, '⚠ BOSS: THE DROWNED KING — 3 phases!', CARD.x + 10, iy + 42 + line * 17, 12, '#ff4d6d', 'left', 'bold');
  } else {
    text(ctx, 'INCOMING — none. The King is dead.', CARD.x + 10, iy + 20, 12, '#80ed99', 'left', 'bold');
    text(ctx, 'Saltspire stands.', CARD.x + 10, iy + 44, 12, '#e8f1f2', 'left');
  }
  // Selected tower / plot.
  const sy = 522;
  panel(ctx, CARD.x, sy, 296, 100, 'rgba(8, 24, 38, 0.88)');
  const t = game.selectedTower;
  if (t) {
    const def = TOWERS[t.type];
    text(ctx, `${def.name} — LEVEL ${t.level} · ${t.kills} kills`, CARD.x + 10, sy + 20, 12, '#e8f1f2', 'left', 'bold');
    text(ctx, def.desc, CARD.x + 10, sy + 38, 11, '#9fb3a8', 'left');
    const uc = upgradeCost(game, t);
    const sv = sellValue(t);
    const ub = SEL_BTN.upgrade;
    const sb = SEL_BTN.sell;
    ctx.fillStyle = uc !== null && game.gold >= uc ? 'rgba(255, 230, 109, 0.22)' : 'rgba(125, 211, 252, 0.07)';
    rr(ctx, ub.x, ub.y, ub.w, ub.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.5)';
    ctx.stroke();
    text(ctx, uc === null ? 'MAX LEVEL' : `U UPGRADE ${uc}g`, ub.x + ub.w / 2, ub.y + 20, 12, '#ffe66d', 'center', 'bold');
    ctx.fillStyle = 'rgba(255, 77, 109, 0.14)';
    rr(ctx, sb.x, sb.y, sb.w, sb.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 77, 109, 0.5)';
    ctx.stroke();
    text(ctx, `X SELL +${sv}g`, sb.x + sb.w / 2, sb.y + 20, 12, '#ff8fa3', 'center', 'bold');
  } else if (game.selectedPlot >= 0) {
    const p = PLOTS[game.selectedPlot];
    text(ctx, p.mud ? 'MUDFLAT PLOT' : 'BUILD PLOT', CARD.x + 10, sy + 20, 12, '#e8f1f2', 'left', 'bold');
    text(ctx, p.mud ? (game.tide.phase === 'low' ? 'Buildable now — LOW tide.' : 'Buildable only at LOW tide.') : 'Pick a tower card (1–6), then click here.', CARD.x + 10, sy + 40, 11, '#9fb3a8', 'left');
    if (game.buildSel) text(ctx, `Placing: ${TOWERS[game.buildSel].name} (${towerCost(game, game.buildSel)}g)`, CARD.x + 10, sy + 60, 11, '#ffd166', 'left', 'bold');
  } else {
    text(ctx, 'No tower selected', CARD.x + 10, sy + 20, 12, '#e8f1f2', 'left', 'bold');
    text(ctx, 'Click a tower to upgrade or sell it.', CARD.x + 10, sy + 40, 11, '#9fb3a8', 'left');
    text(ctx, 'Click an empty plot to build.', CARD.x + 10, sy + 58, 11, '#9fb3a8', 'left');
  }
  // Log.
  const ly = 634;
  text(ctx, 'TIDE LOG', CARD.x, ly, 11, '#7dd3fc', 'left', 'bold');
  game.log.slice(0, 4).forEach((line, i) => {
    text(ctx, line, CARD.x, ly + 18 + i * 15, 10.5, i === 0 ? '#e8f1f2' : '#7a8a94', 'left');
  });
  // Controls footer.
  text(ctx, 'SPACE wave · F speed · P pause · M mute · U upgrade · X sell', CARD.x, 712, 10, '#5b7a8c', 'left');
}

function drawBanner(ctx, game) {
  if (!game.banner) return;
  const a = Math.min(1, game.banner.t * 2);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(4, 12, 20, 0.72)';
  ctx.fillRect(0, 250, PANEL_X, 86);
  text(ctx, game.banner.text, PANEL_X / 2, 292, 26, '#ffe66d', 'center', 'bold');
  text(ctx, game.banner.sub, PANEL_X / 2, 320, 14, '#e8f1f2', 'center');
  ctx.restore();
}

function drawFloaters(ctx, game) {
  for (const f of game.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t);
    text(ctx, f.text, f.x, f.y, 13, f.color, 'center', 'bold');
    ctx.restore();
  }
}

function drawWrecks(ctx, game) {
  for (const w of game.wrecks) {
    if (w.collected) continue;
    const bob = Math.sin(game.time * 3 + w.x) * 2;
    ctx.fillStyle = '#8d6e63';
    ctx.save();
    ctx.translate(w.x, w.y + bob);
    ctx.rotate(0.4);
    ctx.fillRect(-14, -4, 28, 8);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text(ctx, '+25g', w.x, w.y - 14 + bob, 11, '#80ed99', 'center', 'bold');
  }
}

// ---- screens ----

function drawTitle(ctx, game) {
  drawSea(ctx, game);
  // The keep and its beam in the top-right corner, clear of the buttons.
  drawKeepAt(ctx, game, 1215, 52, 26, null);
  ctx.fillStyle = 'rgba(4, 12, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'HIGHWATER', W / 2, 118, 64, '#ffe66d', 'center', 'bold');
  text(ctx, 'The drowned coast · the last dry town · you are the Tidekeeper', W / 2, 152, 16, '#7dd3fc', 'center');
  text(ctx, '“The sea took the coast. Hold Saltspire. Twelve waves. One king beneath them.”', W / 2, 182, 15, '#e8f1f2', 'center', 'italic');
  // Five info panels.
  const panels = [
    ['GOAL', 'Hold the keep through 12 waves. Foes that reach Saltspire cost lives.'],
    ['BUILD', 'Click a plot, pick a tower (1–6). Upgrade twice, sell for 70%.'],
    ['TIDE', 'LOW opens mudflat plots · HIGH floods the road (foes −35%) and washes salvage ashore.'],
    ['BEACON', 'The keep’s beam sweeps the board — towers caught in it deal ×1.5 damage.'],
    ['WIN / LOSE', 'Kill THE DROWNED KING on wave 12 to win. Lose all lives and the sea takes Saltspire.'],
  ];
  const pw = 226;
  const gap = 12;
  const x0 = (W - (5 * pw + 4 * gap)) / 2;
  for (let i = 0; i < panels.length; i++) {
    const x = x0 + i * (pw + gap);
    panel(ctx, x, 214, pw, 108, 'rgba(8, 24, 38, 0.92)');
    text(ctx, panels[i][0], x + 12, 240, 13, '#ffd166', 'left', 'bold');
    const words = panels[i][1].split(' ');
    let line = '';
    let ly = 262;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) {
        text(ctx, line.trim(), x + 12, ly, 12, '#e8f1f2', 'left');
        line = w;
        ly += 17;
      } else line += ' ' + w;
    }
    if (line.trim()) text(ctx, line.trim(), x + 12, ly, 12, '#e8f1f2', 'left');
  }
  // Towers strip.
  text(ctx, 'SIX TOWERS', W / 2, 352, 13, '#7dd3fc', 'center', 'bold');
  const strip = TOWER_ORDER.map((id) => `${TOWERS[id].name} ${TOWERS[id].cost}g`).join('   ·   ');
  text(ctx, strip, W / 2, 376, 13, '#e8f1f2', 'center');
  text(ctx, 'Harpoon fast · Cannon splash · Net slow · Stormcaller chain (+50% at HIGH tide) · Breakwall aura · Beacon buffs neighbours', W / 2, 398, 12, '#9fb3a8', 'center');
  text(ctx, 'Boons after waves 3, 6 and 9 — choose 1 of 3. Wave-clear bonus + 5% interest on saved gold.', W / 2, 420, 12, '#9fb3a8', 'center');
  // Difficulty buttons.
  const total = DIFF_ORDER.length * DIFF_BTN.w + (DIFF_ORDER.length - 1) * DIFF_BTN.gap;
  const bx0 = (W - total) / 2;
  text(ctx, 'CHOOSE YOUR TIDE', W / 2, 540, 14, '#ffe66d', 'center', 'bold');
  for (let i = 0; i < DIFF_ORDER.length; i++) {
    const d = DIFFICULTIES[DIFF_ORDER[i]];
    const bx = bx0 + i * (DIFF_BTN.w + DIFF_BTN.gap);
    ctx.fillStyle = DIFF_ORDER[i] === 'dusk' ? 'rgba(255, 230, 109, 0.22)' : 'rgba(125, 211, 252, 0.12)';
    rr(ctx, bx, DIFF_BTN.y, DIFF_BTN.w, DIFF_BTN.h, 9);
    ctx.fill();
    ctx.strokeStyle = DIFF_ORDER[i] === 'dusk' ? '#ffe66d' : 'rgba(125, 211, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    text(ctx, `[${i + 1}] ${d.name}`, bx + DIFF_BTN.w / 2, DIFF_BTN.y + 24, 16, '#e8f1f2', 'center', 'bold');
    text(ctx, d.desc, bx + DIFF_BTN.w / 2, DIFF_BTN.y + 44, 11, '#9fb3a8', 'center');
  }
  text(ctx, 'Mouse: build & select  ·  1–6 towers  ·  SPACE start wave  ·  F speed  ·  P pause  ·  M mute  ·  U upgrade  ·  X sell', W / 2, 648, 12, '#7dd3fc', 'center');
  if (game.best > 0) text(ctx, `BEST SCORE ${game.best}`, W / 2, 676, 12, '#ffd166', 'center', 'bold');
  text(ctx, 'An original game built for make.fun — best-game-01 · $1,000', W / 2, 700, 11, '#5b7a8c', 'center');
}

function drawBoon(ctx, game) {
  ctx.fillStyle = 'rgba(4, 12, 20, 0.78)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'THE TIDE OFFERS A BOON', W / 2, 200, 30, '#ffe66d', 'center', 'bold');
  text(ctx, `Wave ${game.wave} held. Choose one — click a card or press 1, 2, 3.`, W / 2, 228, 14, '#e8f1f2', 'center');
  const total = 3 * BOON_CARD.w + 2 * BOON_CARD.gap;
  const x0 = (W - total) / 2;
  for (let i = 0; i < 3; i++) {
    const id = game.draft[i];
    const b = BOONS[id];
    const bx = x0 + i * (BOON_CARD.w + BOON_CARD.gap);
    const hover = game.mouseX >= bx && game.mouseX <= bx + BOON_CARD.w && game.mouseY >= BOON_CARD.y && game.mouseY <= BOON_CARD.y + BOON_CARD.h;
    panel(ctx, bx, BOON_CARD.y, BOON_CARD.w, BOON_CARD.h, hover ? 'rgba(255, 230, 109, 0.14)' : 'rgba(8, 24, 38, 0.95)');
    ctx.strokeStyle = hover ? '#ffe66d' : 'rgba(125, 211, 252, 0.4)';
    ctx.lineWidth = hover ? 2 : 1;
    rr(ctx, bx, BOON_CARD.y, BOON_CARD.w, BOON_CARD.h, 8);
    ctx.stroke();
    ctx.lineWidth = 1;
    text(ctx, `[${i + 1}]`, bx + BOON_CARD.w / 2, BOON_CARD.y + 36, 13, '#7dd3fc', 'center', 'bold');
    text(ctx, '✦', bx + BOON_CARD.w / 2, BOON_CARD.y + 84, 34, '#ffe66d', 'center');
    text(ctx, b.name, bx + BOON_CARD.w / 2, BOON_CARD.y + 130, 18, '#e8f1f2', 'center', 'bold');
    text(ctx, b.desc, bx + BOON_CARD.w / 2, BOON_CARD.y + 160, 13, '#9fb3a8', 'center');
  }
}

function drawPause(ctx, game) {
  ctx.fillStyle = 'rgba(4, 12, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, 240, 40, '#ffe66d', 'center', 'bold');
  text(ctx, `Wave ${game.wave} · ${game.gold}g · ${game.lives} lives · ${game.kills} kills`, W / 2, 272, 14, '#e8f1f2', 'center');
  const labels = ['RESUME  (P)', 'RESTART RUN  (R)', 'QUIT TO TITLE  (Q)', game.muted ? 'SOUND: OFF  (M)' : 'SOUND: ON  (M)'];
  for (let i = 0; i < labels.length; i++) {
    const by = PAUSE_BTN.y0 + i * (PAUSE_BTN.h + PAUSE_BTN.gap);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.12)';
    rr(ctx, PAUSE_BTN.x, by, PAUSE_BTN.w, PAUSE_BTN.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.4)';
    ctx.stroke();
    text(ctx, labels[i], PAUSE_BTN.x + PAUSE_BTN.w / 2, by + 33, 15, '#e8f1f2', 'center', 'bold');
  }
}

function drawEnd(ctx, game) {
  const win = game.mode === MODES.VICTORY;
  ctx.fillStyle = win ? 'rgba(4, 20, 12, 0.72)' : 'rgba(20, 4, 8, 0.78)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, win ? 'SALTSPIRE STANDS!' : 'THE SEA TAKES SALTSPIRE', W / 2, 180, 38, win ? '#80ed99' : '#ff4d6d', 'center', 'bold');
  text(ctx, win ? 'The Drowned King is dead. The tide recedes — the town is yours.' : 'The keep has fallen. The drowned walk the dry streets now.', W / 2, 214, 15, '#e8f1f2', 'center');
  panel(ctx, 390, 250, 500, 210, 'rgba(8, 24, 38, 0.95)');
  const rows = [
    ['SCORE', String(game.score)],
    ['BEST', String(Math.max(game.best, game.score))],
    ['WAVES HELD', `${game.stats.wavesCleared} / ${TOTAL_WAVES}`],
    ['DROWNED SLAIN', String(game.kills)],
    ['TOWERS BUILT', String(game.stats.towersBuilt)],
    ['UPGRADES', String(game.stats.upgradesTaken)],
    ['BOONS TAKEN', String(game.stats.boonsTaken)],
    ['GOLD EARNED', `${game.stats.goldEarned}g  (salvage ${game.stats.salvage}g)`],
    ['LIVES LEFT', String(game.lives)],
    ['TIME', `${Math.floor(game.playTime / 60)}:${String(Math.floor(game.playTime % 60)).padStart(2, '0')}`],
    ['DIFFICULTY', DIFFICULTIES[game.difficulty].name],
  ];
  rows.forEach(([k, v], i) => {
    const y = 282 + i * 17;
    text(ctx, k, 420, y, 12, '#7dd3fc', 'left', 'bold');
    text(ctx, v, 850, y, 12, '#e8f1f2', 'right');
  });
  const total = 2 * END_BTN.w + END_BTN.gap;
  const x0 = (W - total) / 2;
  const labels = ['PLAY AGAIN  (R)', 'TITLE SCREEN  (Q)'];
  for (let i = 0; i < 2; i++) {
    const bx = x0 + i * (END_BTN.w + END_BTN.gap);
    ctx.fillStyle = i === 0 ? 'rgba(255, 230, 109, 0.22)' : 'rgba(125, 211, 252, 0.12)';
    rr(ctx, bx, END_BTN.y, END_BTN.w, END_BTN.h, 9);
    ctx.fill();
    ctx.strokeStyle = i === 0 ? '#ffe66d' : 'rgba(125, 211, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    text(ctx, labels[i], bx + END_BTN.w / 2, END_BTN.y + 33, 15, '#e8f1f2', 'center', 'bold');
  }
}

// ---- main draw ----

export function draw(ctx, game) {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((game.rng.next() - 0.5) * game.shake * 8, (game.rng.next() - 0.5) * game.shake * 8);
  }
  if (game.mode === MODES.TITLE) {
    drawTitle(ctx, game);
    ctx.restore();
    return;
  }
  drawSea(ctx, game);
  drawRoad(ctx, game);
  drawPlots(ctx, game);
  drawWrecks(ctx, game);
  drawKeep(ctx, game);
  for (const t of game.towers) drawTower(ctx, game, t);
  for (const e of game.enemies) drawEnemy(ctx, game, e);
  // Projectiles.
  for (const p of game.projectiles) {
    ctx.fillStyle = '#ff7b54';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const tr of game.tracers) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, tr.t / tr.max);
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.width;
    ctx.beginPath();
    ctx.moveTo(tr.x1, tr.y1);
    ctx.lineTo(tr.x2, tr.y2);
    ctx.stroke();
    ctx.restore();
  }
  for (const p of game.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Build ghost: the tower type being placed, following the mouse.
  if (game.buildSel && game.mode === MODES.PLAYING) {
    const def = TOWERS[game.buildSel];
    const plot = plotAt(game.mouseX, game.mouseY);
    if (plot >= 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(PLOTS[plot].x, PLOTS[plot].y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawFloaters(ctx, game);
  drawTopBar(ctx, game);
  drawRightPanel(ctx, game);
  if (game.mode === MODES.PLAYING) drawBanner(ctx, game);
  if (game.mode === MODES.BOON) drawBoon(ctx, game);
  else if (game.mode === MODES.PAUSED) drawPause(ctx, game);
  else if (game.mode === MODES.VICTORY || game.mode === MODES.GAMEOVER) drawEnd(ctx, game);
  ctx.restore();
}
