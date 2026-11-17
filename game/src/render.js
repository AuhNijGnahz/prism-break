// PRISM BREAK — canvas drawing of the play field: background, bricks, boss wall,
// paddle, balls, laser bolts, power-up capsules, particles and floating scores.
// Screens and the HUD live in ui.js; this file only draws the world itself.

import { COLORS, FIELD, PADDLE } from './config.js';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function brickColor(brick) {
  if (brick.kind === 'normal' || brick.kind === 'mini') {
    if (brick.kind === 'mini') return COLORS.brickByKind.mini;
    return COLORS.brickByKind.normal[brick.row % COLORS.brickByKind.normal.length];
  }
  if (brick.kind === 'hard') return brick.hp < brick.maxHp ? COLORS.brickByKind.hardCracked : COLORS.brickByKind.hard;
  return COLORS.brickByKind[brick.kind] || '#ffffff';
}

export function drawWorld(g, state) {
  const grad = g.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, FIELD.width, FIELD.height);

  // Faint prism beams behind the field.
  g.save();
  g.globalAlpha = 0.07;
  const beams = ['#ff5d8f', '#ffd94d', '#3ddc84', '#38b6ff', '#b388ff'];
  beams.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(120 + i * 40, 0);
    g.lineTo(340 + i * 150, FIELD.height);
    g.lineTo(430 + i * 150, FIELD.height);
    g.closePath();
    g.fill();
  });
  g.restore();

  // Walls.
  g.fillStyle = COLORS.wall;
  g.fillRect(0, 0, 6, FIELD.height);
  g.fillRect(FIELD.width - 6, 0, 6, FIELD.height);
  g.fillRect(0, 0, FIELD.width, 6);

  drawBoss(g, state);
  for (const brick of state.bricks) if (brick.alive) drawBrick(g, brick);
  for (const p of state.powerups) drawPowerup(g, state, p);
  drawPaddle(g, state);
  for (const bolt of state.bolts) {
    g.fillStyle = '#ff8fa8';
    g.fillRect(bolt.x - 2, bolt.y - 9, 4, 12);
  }
  for (const ball of state.balls) drawBall(g, ball);
  drawParticles(g, state);
  drawFloaters(g, state);
}

function drawBrick(g, brick) {
  const color = brick.flash > 0 ? '#ffffff' : brickColor(brick);
  g.fillStyle = color;
  roundRect(g, brick.x, brick.y, brick.w, brick.h, 5);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(g, brick.x + 3, brick.y + 3, brick.w - 6, 7, 3);
  g.fill();
  g.fillStyle = 'rgba(10,10,30,0.75)';
  g.font = 'bold 13px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2 + 1;
  if (brick.kind === 'hard') g.fillText(String(brick.hp), cx, cy);
  else if (brick.kind === 'boom') g.fillText('✸', cx, cy);
  else if (brick.kind === 'split') g.fillText('⋈', cx, cy);
  else if (brick.kind === 'steel') g.fillText('▦', cx, cy);
}

function drawBoss(g, state) {
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  const cx = boss.x + boss.w / 2;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 3);
  g.save();
  g.shadowColor = '#ff5470';
  g.shadowBlur = 18 + pulse * 10;
  g.fillStyle = boss.flash > 0 ? '#ffffff' : '#5a1030';
  roundRect(g, boss.x, boss.y, boss.w, boss.h, 10);
  g.fill();
  g.restore();
  g.strokeStyle = '#ff5470';
  g.lineWidth = 3;
  roundRect(g, boss.x, boss.y, boss.w, boss.h, 10);
  g.stroke();
  // Prism core that brightens as the boss weakens.
  const coreR = 9 + (1 - boss.hp / boss.maxHp) * 7 + pulse * 2;
  g.fillStyle = '#ffd94d';
  g.beginPath();
  g.moveTo(cx, boss.y + boss.h / 2 - coreR);
  g.lineTo(cx + coreR, boss.y + boss.h / 2);
  g.lineTo(cx, boss.y + boss.h / 2 + coreR);
  g.lineTo(cx - coreR, boss.y + boss.h / 2);
  g.closePath();
  g.fill();
  // HP bar above the boss.
  const barW = boss.w;
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(boss.x, boss.y - 16, barW, 8);
  g.fillStyle = boss.sinceHit > 2.5 && boss.hp < boss.maxHp ? '#3ddc84' : '#ff5470';
  g.fillRect(boss.x, boss.y - 16, barW * Math.max(0, boss.hp / boss.maxHp), 8);
  g.fillStyle = COLORS.text;
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(state.bossName || 'BOSS WALL', cx, boss.y - 24);
  if (boss.sinceHit > 2.5 && boss.hp < boss.maxHp) {
    g.fillStyle = '#3ddc84';
    g.font = '11px system-ui, sans-serif';
    g.fillText('REGENERATING — KEEP HITTING IT', cx, boss.y + boss.h + 14);
  }
}

function drawPaddle(g, state) {
  const p = state.paddle;
  g.save();
  g.shadowColor = COLORS.paddleEdge;
  g.shadowBlur = 14;
  g.fillStyle = COLORS.paddle;
  roundRect(g, p.x, p.y, p.width, PADDLE.height, 7);
  g.fill();
  g.restore();
  if (state.time < state.laserUntil) {
    g.fillStyle = COLORS.danger;
    roundRect(g, p.x + 2, p.y - 8, 10, 10, 3);
    g.fill();
    roundRect(g, p.x + p.width - 12, p.y - 8, 10, 10, 3);
    g.fill();
  }
  // A stuck ball invites the launch.
  if (state.balls.some((b) => b.stuck) && state.screen === 'play') {
    g.fillStyle = COLORS.dim;
    g.font = '14px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('Click or press Space to launch', p.x + p.width / 2, p.y + 36);
  }
}

function drawBall(g, ball) {
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i];
    const a = (i / ball.trail.length) * 0.25;
    g.fillStyle = `rgba(124,231,255,${a})`;
    g.beginPath();
    g.arc(t.x, t.y, ball.r * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  g.shadowColor = COLORS.ballGlow;
  g.shadowBlur = 12;
  g.fillStyle = COLORS.ball;
  g.beginPath();
  g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawPowerup(g, state, p) {
  const color = COLORS.powerByType[p.type];
  g.save();
  g.translate(p.x + p.w / 2, p.y + p.h / 2);
  g.rotate(Math.sin(p.spin) * 0.18);
  g.shadowColor = color;
  g.shadowBlur = 10;
  g.fillStyle = color;
  roundRect(g, -p.w / 2, -p.h / 2, p.w, p.h, 8);
  g.fill();
  g.restore();
  g.fillStyle = '#10142a';
  g.font = 'bold 12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(COLORS.powerLabel[p.type], p.x + p.w / 2, p.y + p.h / 2 + 1);
  g.textBaseline = 'alphabetic';
}

function drawParticles(g, state) {
  for (const pt of state.particles) {
    g.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    g.fillStyle = pt.color;
    g.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  g.globalAlpha = 1;
}

function drawFloaters(g, state) {
  g.font = 'bold 14px system-ui, sans-serif';
  g.textAlign = 'center';
  for (const f of state.floaters) {
    g.globalAlpha = Math.min(1, f.life * 2);
    g.fillStyle = f.color;
    g.fillText(f.text, f.x, f.y);
  }
  g.globalAlpha = 1;
}
