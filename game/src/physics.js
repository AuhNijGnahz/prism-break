// PRISM BREAK — simulation: paddle and ball movement, circle-vs-brick collision,
// explosion chains, laser bolts, the boss wall, particles and floating score text.
// Pure rules, no drawing: render.js reads the state this module mutates.

import { BALL, BOSS, FIELD, PADDLE, SCORING } from './config.js';
import { breakableRemaining, splitChildren } from './levels.js';
import { ballSpeed, currentSpeed, maybeDrop, rescaleBall, updatePowerups } from './powerups.js';
import { sfx } from './audio.js';

export function makeBall(x, y, angle, speed) {
  return { x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, r: BALL.radius, stuck: true, trail: [] };
}

export function launchBalls(state) {
  let launched = false;
  for (const ball of state.balls) {
    if (ball.stuck) {
      ball.stuck = false;
      const speed = ballSpeed(state);
      const angle = (Math.random() * 0.5 - 0.25);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      launched = true;
    }
  }
  if (launched) sfx.launch();
  return launched;
}

function addScore(state, base, x, y) {
  const gained = Math.round(base * (1 + state.combo * 0.1));
  state.score += gained;
  state.floaters.push({ x, y, text: `+${gained}`, life: 0.7, color: '#ffe9a8' });
  return gained;
}

function burst(state, x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.45 + Math.random() * 0.3, maxLife: 0.75, color, size: 2 + Math.random() * 3 });
  }
}

export function damageBrick(state, brick, queue) {
  if (!brick.alive || brick.kind === 'steel') return;
  brick.hp -= 1;
  brick.flash = 0.12;
  if (brick.hp > 0) { sfx.hard(); return; }
  brick.alive = false;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2;
  burst(state, cx, cy, '#ffffff', brick.kind === 'boom' ? 22 : 9);
  if (brick.kind === 'boom') {
    addScore(state, SCORING.boom, cx, cy);
    sfx.boom();
    state.shake = Math.max(state.shake, 7);
    queue.push(brick);
  } else if (brick.kind === 'split') {
    addScore(state, SCORING.split, cx, cy);
    sfx.split();
    state.bricks.push(...splitChildren(brick));
  } else {
    addScore(state, brick.kind === 'hard' ? SCORING.hard : brick.kind === 'mini' ? SCORING.mini : SCORING.normal, cx, cy);
    sfx.brick(state.combo);
  }
  maybeDrop(state, cx, cy);
  // Every broken brick nudges the rally speed up a touch.
  state.ballSpeedBase = Math.min(BALL.maxSpeed, state.ballSpeedBase + BALL.speedPerBrick);
}

// Explosion chains are resolved iteratively: a boom brick damages every brick
// whose centre is within its blast radius, which may set off further booms.
export function explodeFrom(state, first) {
  const pending = [first];
  const seen = new Set([first]);
  while (pending.length > 0) {
    const src = pending.shift();
    const cx = src.x + src.w / 2;
    const cy = src.y + src.h / 2;
    for (const other of state.bricks) {
      if (!other.alive || other === src || other.kind === 'steel') continue;
      const ox = other.x + other.w / 2;
      const oy = other.y + other.h / 2;
      if (Math.hypot(ox - cx, oy - cy) > 105) continue;
      const wasBoom = other.kind === 'boom';
      // Blast deals 2 damage: enough to crack a fresh hard brick once, kill most else.
      other.hp -= 2;
      other.flash = 0.12;
      if (other.hp <= 0 && other.alive) {
        other.alive = false;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        burst(state, ox, oy, '#ffb37c', 10);
        if (other.kind === 'split') state.bricks.push(...splitChildren(other));
        else addScore(state, SCORING.normal, ox, oy);
        maybeDrop(state, ox, oy);
        if (wasBoom && !seen.has(other)) { seen.add(other); pending.push(other); }
      }
    }
    if (state.boss && state.boss.alive) {
      const bx = state.boss.x + state.boss.w / 2;
      const by = state.boss.y + state.boss.h / 2;
      if (Math.hypot(bx - cx, by - cy) < 240) damageBoss(state, 2);
    }
  }
}

export function damageBoss(state, amount) {
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  boss.hp -= amount;
  boss.flash = 0.1;
  boss.sinceHit = 0;
  if (boss.hp <= 0) {
    boss.alive = false;
    state.score += SCORING.bossDown;
    burst(state, boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffd94d', 42);
    state.shake = Math.max(state.shake, 12);
    sfx.bossDown();
    state.floaters.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h + 30, text: `BOSS DOWN +${SCORING.bossDown}`, life: 1.4, color: '#ffd94d' });
  } else {
    sfx.bossHit();
  }
}

function circleRectHit(ball, rect) {
  const nx = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  const dx = ball.x - nx;
  const dy = ball.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 > ball.r * ball.r) return null;
  if (d2 === 0) return { nx: 0, ny: ball.vy > 0 ? -1 : 1 };
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d };
}

function reflect(ball, n) {
  const dot = ball.vx * n.nx + ball.vy * n.ny;
  if (dot >= 0) return false;
  ball.vx -= 2 * dot * n.nx;
  ball.vy -= 2 * dot * n.ny;
  return true;
}

function moveBall(state, ball, dt, events) {
  const steps = Math.max(1, Math.ceil((currentSpeed(ball) * dt) / (ball.r * 0.9)));
  const sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    ball.x += ball.vx * sdt;
    ball.y += ball.vy * sdt;
    // Walls.
    if (ball.x < ball.r + 6) { ball.x = ball.r + 6; ball.vx = Math.abs(ball.vx); sfx.wall(); }
    if (ball.x > FIELD.width - ball.r - 6) { ball.x = FIELD.width - ball.r - 6; ball.vx = -Math.abs(ball.vx); sfx.wall(); }
    if (ball.y < ball.r + 6) { ball.y = ball.r + 6; ball.vy = Math.abs(ball.vy); sfx.wall(); }
    // Paddle: the hit position steers the rebound angle.
    const p = state.paddle;
    if (ball.vy > 0 && ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + PADDLE.height && ball.x >= p.x - ball.r && ball.x <= p.x + p.width + ball.r) {
      const rel = Math.max(-1, Math.min(1, (ball.x - (p.x + p.width / 2)) / (p.width / 2)));
      const angle = rel * BALL.maxBounceAngle;
      const speed = ballSpeed(state);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = p.y - ball.r - 0.5;
      state.combo = 0;
      sfx.paddle();
      continue;
    }
    // Boss.
    if (state.boss && state.boss.alive && state.bossHitCooldown <= 0) {
      const hit = circleRectHit(ball, state.boss);
      if (hit && reflect(ball, hit)) {
        ball.x += hit.nx * 2;
        ball.y += hit.ny * 2;
        state.bossHitCooldown = 0.09;
        addScore(state, SCORING.bossHit, ball.x, ball.y - 10);
        damageBoss(state, 1);
        continue;
      }
    }
    // Bricks.
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      if (ball.x + ball.r < brick.x || ball.x - ball.r > brick.x + brick.w || ball.y + ball.r < brick.y || ball.y - ball.r > brick.y + brick.h) continue;
      const hit = circleRectHit(ball, brick);
      if (!hit) continue;
      if (brick.kind !== 'steel') {
        const boomQueue = [];
        const wasBoom = brick.kind === 'boom';
        // damageBrick records score/drops; boom chains run right after.
        const hpBefore = brick.hp;
        damageBrick(state, brick, boomQueue);
        if (wasBoom && hpBefore === 1) explodeFrom(state, brick);
      } else {
        sfx.hard();
      }
      reflect(ball, hit);
      ball.x += hit.nx * 2;
      ball.y += hit.ny * 2;
      break;
    }
  }
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 9) ball.trail.shift();
}

function updateBolts(state, dt) {
  if (state.time < state.laserUntil) {
    state.laserTimer -= dt;
    if (state.laserTimer <= 0) {
      state.laserTimer = PADDLE.laserCooldown;
      const p = state.paddle;
      state.bolts.push({ x: p.x + 8, y: p.y - 8, alive: true });
      state.bolts.push({ x: p.x + p.width - 8, y: p.y - 8, alive: true });
      sfx.laser();
    }
  }
  for (const bolt of state.bolts) {
    bolt.y -= 760 * dt;
    if (bolt.y < 0) { bolt.alive = false; continue; }
    if (state.boss && state.boss.alive && bolt.x >= state.boss.x && bolt.x <= state.boss.x + state.boss.w && bolt.y >= state.boss.y && bolt.y <= state.boss.y + state.boss.h) {
      bolt.alive = false;
      damageBoss(state, 1);
      continue;
    }
    for (const brick of state.bricks) {
      if (!brick.alive || brick.kind === 'steel') continue;
      if (bolt.x >= brick.x && bolt.x <= brick.x + brick.w && bolt.y >= brick.y && bolt.y <= brick.y + brick.h) {
        bolt.alive = false;
        const wasBoom = brick.kind === 'boom' && brick.hp === 1;
        damageBrick(state, brick, []);
        if (wasBoom) explodeFrom(state, brick);
        break;
      }
    }
  }
  state.bolts = state.bolts.filter((b) => b.alive);
}

function updateBoss(state, dt) {
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  boss.x += boss.dir * BOSS.moveSpeed * dt;
  if (boss.x < 18) { boss.x = 18; boss.dir = 1; }
  if (boss.x + boss.w > FIELD.width - 18) { boss.x = FIELD.width - 18 - boss.w; boss.dir = -1; }
  boss.sinceHit += dt;
  if (boss.sinceHit > BOSS.regenDelay && boss.hp < boss.maxHp) {
    boss.hp = Math.min(boss.maxHp, boss.hp + BOSS.regenPerSecond * dt);
  }
  if (boss.flash > 0) boss.flash -= dt;
}

// Advances one frame of play. Returns event strings for the main module:
// 'ballLost' (all balls gone), 'levelClear'.
export function updatePlay(state, dt, input) {
  const events = [];
  state.time += dt;
  if (state.bossHitCooldown > 0) state.bossHitCooldown -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

  // Paddle: mouse wins when it has moved, keys always apply on top.
  const p = state.paddle;
  if (input.mouseX !== null && input.mouseX !== undefined) {
    p.x += (input.mouseX - p.width / 2 - p.x) * Math.min(1, dt * 22);
  }
  if (input.keys.left) p.x -= PADDLE.keySpeed * dt;
  if (input.keys.right) p.x += PADDLE.keySpeed * dt;
  p.x = Math.max(6, Math.min(FIELD.width - 6 - p.width, p.x));

  for (const ball of state.balls) {
    if (ball.stuck) {
      ball.x = p.x + p.width / 2;
      ball.y = p.y - ball.r - 1;
      ball.trail.length = 0;
    } else {
      moveBall(state, ball, dt, events);
    }
  }
  state.balls = state.balls.filter((ball) => {
    if (ball.y - ball.r > FIELD.height + 8) {
      events.push('ballGone');
      return false;
    }
    return true;
  });
  if (state.balls.length === 0) events.push('ballLost');

  updateBolts(state, dt);
  updateBoss(state, dt);
  updatePowerups(state, dt);

  for (const brick of state.bricks) if (brick.flash > 0) brick.flash -= dt;
  state.particles = state.particles.filter((pt) => {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 300 * dt;
    return pt.life > 0;
  });
  state.floaters = state.floaters.filter((f) => {
    f.life -= dt;
    f.y -= 34 * dt;
    return f.life > 0;
  });
  state.bricks = state.bricks.filter((b) => b.alive || b.flash > -0.2);

  const cleared = state.boss
    ? !state.boss.alive
    : breakableRemaining(state.bricks) === 0;
  if (cleared && !events.includes('ballLost')) events.push('levelClear');
  return events;
}
