// PRISM BREAK — falling power-up capsules and the real effects they apply.
// Effects are timed state on the game object (wideUntil, laserUntil, slowUntil),
// so what the capsule promises is exactly what the physics and renderer read.

import { BALL, PADDLE, POWERUPS } from './config.js';
import { sfx } from './audio.js';

let nextId = 1;

export function maybeDrop(state, x, y, forceType = null) {
  if (!forceType && Math.random() > POWERUPS.dropChance) return;
  const type = forceType || POWERUPS.types[Math.floor(Math.random() * POWERUPS.types.length)];
  state.powerups.push({
    id: nextId++,
    type,
    x,
    y,
    w: POWERUPS.width,
    h: POWERUPS.height,
    vy: POWERUPS.fallSpeed,
    spin: Math.random() * Math.PI * 2,
    alive: true,
  });
}

export function updatePowerups(state, dt) {
  const now = state.time;
  for (const p of state.powerups) {
    p.y += p.vy * dt;
    p.spin += dt * 3;
    if (p.y > 660) { p.alive = false; continue; }
    const paddle = state.paddle;
    const caught =
      p.y + p.h > paddle.y && p.y < paddle.y + PADDLE.height &&
      p.x + p.w > paddle.x && p.x < paddle.x + paddle.width;
    if (caught) {
      p.alive = false;
      applyPowerup(state, p.type);
    }
  }
  state.powerups = state.powerups.filter((p) => p.alive);
  // Expire timed effects.
  if (state.wideUntil && now > state.wideUntil) {
    state.wideUntil = 0;
    state.paddle.width = PADDLE.width;
  }
}

export function applyPowerup(state, type) {
  const now = state.time;
  sfx.power();
  state.floaters.push({ x: state.paddle.x + state.paddle.width / 2, y: state.paddle.y - 18, text: labelFor(type), life: 0.9, color: '#ffffff' });
  if (type === 'wide') {
    state.wideUntil = now + PADDLE.wideSeconds;
    state.paddle.width = Math.round(PADDLE.width * PADDLE.wideFactor);
  } else if (type === 'laser') {
    state.laserUntil = now + PADDLE.laserSeconds;
    state.laserTimer = 0;
  } else if (type === 'slow') {
    state.slowUntil = now + BALL.slowSeconds;
    for (const ball of state.balls) rescaleBall(ball, ballSpeed(state) / currentSpeed(ball));
  } else if (type === 'life') {
    state.lives = Math.min(5, state.lives + 1);
  } else if (type === 'multi') {
    const born = [];
    for (const ball of state.balls) {
      if (ball.stuck) continue;
      if (state.balls.length + born.length >= BALL.maxBalls) break;
      const speed = currentSpeed(ball);
      const angle = Math.atan2(ball.vy, ball.vx) + 0.55;
      born.push({
        x: ball.x, y: ball.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: ball.r, stuck: false, trail: [],
      });
    }
    state.balls.push(...born);
  }
}

export function labelFor(type) {
  return { wide: 'WIDE!', multi: 'MULTI-BALL!', laser: 'LASERS!', slow: 'SLOW-MO!', life: '+1 LIFE' }[type] || type;
}

export function currentSpeed(ball) {
  return Math.hypot(ball.vx, ball.vy);
}

export function ballSpeed(state) {
  const base = Math.min(BALL.maxSpeed, state.ballSpeedBase);
  return state.time < state.slowUntil ? base * BALL.slowFactor : base;
}

export function rescaleBall(ball, factor) {
  ball.vx *= factor;
  ball.vy *= factor;
}
