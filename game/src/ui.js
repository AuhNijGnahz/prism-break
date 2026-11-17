// PRISM BREAK — the HUD (score, level, lives, combo, active-effect timers) and
// every full-screen state: title, pause, level banner, game over and victory.
// The HUD is drawn on every frame of play so the four readouts never disappear.

import { BALL, COLORS, FIELD, TOTAL_LEVELS } from './config.js';
import { levelName } from './levels.js';

function centerText(g, text, y, font, color) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.fillText(text, FIELD.width / 2, y);
}

export function drawHud(g, state) {
  g.fillStyle = 'rgba(5,8,20,0.55)';
  g.fillRect(6, 6, FIELD.width - 12, 40);
  g.textAlign = 'left';
  g.font = 'bold 19px system-ui, sans-serif';
  g.fillStyle = COLORS.text;
  g.fillText(`SCORE ${state.score}`, 20, 33);
  g.textAlign = 'center';
  g.fillText(`LEVEL ${state.level}/${TOTAL_LEVELS}`, FIELD.width / 2, 33);
  g.textAlign = 'right';
  const hearts = '♥'.repeat(Math.max(0, state.lives));
  g.fillStyle = COLORS.danger;
  g.fillText(hearts || '—', FIELD.width - 20, 33);
  g.fillStyle = state.combo >= 5 ? COLORS.accent : COLORS.dim;
  g.font = 'bold 17px system-ui, sans-serif';
  g.fillText(`COMBO ×${(1 + state.combo * 0.1).toFixed(1)} (${state.combo})`, FIELD.width - 130, 33);
  g.textAlign = 'left';

  // Active effect timers, small and factual.
  const effects = [];
  if (state.time < state.wideUntil) effects.push(['WIDE', state.wideUntil - state.time, COLORS.powerByType.wide]);
  if (state.time < state.laserUntil) effects.push(['LASER', state.laserUntil - state.time, COLORS.powerByType.laser]);
  if (state.time < state.slowUntil) effects.push(['SLOW', state.slowUntil - state.time, COLORS.powerByType.slow]);
  effects.forEach(([label, left, color], i) => {
    g.font = 'bold 13px system-ui, sans-serif';
    g.fillStyle = color;
    g.fillText(`${label} ${left.toFixed(0)}s`, 20 + i * 92, 66);
  });
  if (state.balls.length > 1) {
    g.font = 'bold 13px system-ui, sans-serif';
    g.fillStyle = COLORS.powerByType.multi;
    g.fillText(`BALLS ×${state.balls.length}`, FIELD.width - 110, 66);
  }
}

function dim(g, alpha = 0.72) {
  g.fillStyle = `rgba(4,6,16,${alpha})`;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawTitle(g, state) {
  dim(g, 0.45);
  // Rainbow prism wordmark, one hue per letter band.
  const title = 'PRISM BREAK';
  g.font = '900 84px system-ui, sans-serif';
  g.textAlign = 'center';
  const hues = ['#ff5d8f', '#ff9f43', '#ffd94d', '#3ddc84', '#38b6ff', '#b388ff'];
  const totalW = g.measureText(title).width;
  let x = FIELD.width / 2 - totalW / 2;
  g.textAlign = 'left';
  [...title].forEach((ch, i) => {
    g.fillStyle = hues[i % hues.length];
    g.fillText(ch, x, 208);
    x += g.measureText(ch).width;
  });
  g.textAlign = 'center';
  centerText(g, 'A brick-breaker roguelite — nine facets, three boss walls, zero mercy.', 258, '18px system-ui, sans-serif', COLORS.dim);
  centerText(g, 'Move: mouse or ← → / A D      Launch: click or Space      Pause: P', 330, '17px system-ui, sans-serif', COLORS.text);
  centerText(g, 'Bricks drop capsules:  W wide · M multi-ball · L lasers · S slow-mo · + extra life', 362, '16px system-ui, sans-serif', COLORS.text);
  centerText(g, '✸ bricks explode · ⋈ bricks split · grey bricks are hard · boss walls regenerate', 392, '16px system-ui, sans-serif', COLORS.text);
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
  g.globalAlpha = pulse;
  centerText(g, 'Press Enter or click to play', 470, 'bold 24px system-ui, sans-serif', COLORS.accent);
  g.globalAlpha = 1;
  if (state.bestScore > 0) centerText(g, `Best score: ${state.bestScore}`, 520, '16px system-ui, sans-serif', COLORS.dim);
}

export function drawPaused(g) {
  dim(g);
  centerText(g, 'PAUSED', 300, '900 52px system-ui, sans-serif', COLORS.text);
  centerText(g, 'Press P to resume', 350, '18px system-ui, sans-serif', COLORS.dim);
}

export function drawLevelBanner(g, state) {
  dim(g, 0.5);
  centerText(g, `LEVEL ${state.level}`, 280, '900 56px system-ui, sans-serif', COLORS.accent);
  centerText(g, levelName(state.level), 330, '22px system-ui, sans-serif', COLORS.text);
  if (state.boss) centerText(g, 'Break the boss wall before it regenerates!', 368, '17px system-ui, sans-serif', COLORS.danger);
}

export function drawGameOver(g, state) {
  dim(g, 0.8);
  centerText(g, 'SHATTERED', 240, '900 64px system-ui, sans-serif', COLORS.danger);
  centerText(g, `Final score: ${state.score}`, 310, 'bold 26px system-ui, sans-serif', COLORS.text);
  centerText(g, `Reached level ${state.level} · Best combo ×${(1 + state.bestCombo * 0.1).toFixed(1)}`, 350, '18px system-ui, sans-serif', COLORS.dim);
  if (state.score >= state.bestScore && state.score > 0) centerText(g, 'New best score!', 386, 'bold 18px system-ui, sans-serif', COLORS.accent);
  centerText(g, 'Press Enter to play again', 460, 'bold 22px system-ui, sans-serif', COLORS.accent);
}

export function drawVictory(g, state) {
  dim(g, 0.78);
  centerText(g, 'PRISM CLEARED!', 230, '900 60px system-ui, sans-serif', COLORS.accent);
  centerText(g, 'All nine facets broken — the light is free.', 276, '19px system-ui, sans-serif', COLORS.text);
  centerText(g, `Final score: ${state.score}`, 336, 'bold 28px system-ui, sans-serif', COLORS.text);
  centerText(g, `Lives left: ${state.lives} · Best combo ×${(1 + state.bestCombo * 0.1).toFixed(1)}`, 376, '18px system-ui, sans-serif', COLORS.dim);
  centerText(g, 'Press Enter to play again', 460, 'bold 22px system-ui, sans-serif', COLORS.accent);
}
