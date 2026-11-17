// PRISM BREAK — deterministic screenshot scenes behind ?shot=<name>.
// Each scene arranges a real game state with the game's own builders (a level
// mid-rally, the second boss wall under laser fire, the victory screen), then
// freezes the simulation so the captured frame is exactly the arranged one.
// The scenes double as a smoke test: they only use states real play can reach.

import { BALL } from './config.js';
import { makeBall } from './physics.js';

function flyBall(state, x, y, angleDeg, speedScale = 1) {
  const angle = (angleDeg * Math.PI) / 180;
  const ball = makeBall(x, y, 0, 0);
  const speed = state.ballSpeedBase * speedScale;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
  ball.stuck = false;
  return ball;
}

export function setupShot(state, scene, startLevel) {
  if (scene === 'title') {
    startLevel(1);
    state.screen = 'title';
  } else if (scene === 'play') {
    startLevel(2);
    state.screen = 'play';
    state.score = 2350;
    state.combo = 7;
    state.bestCombo = 9;
    // A rally in progress: some bricks already gone, one capsule falling.
    state.bricks.forEach((b, i) => { if (i % 5 === 0) b.alive = false; });
    state.balls = [flyBall(state, 430, 380, -28), flyBall(state, 610, 300, 35)];
    state.paddle.x = 400;
    state.powerups.push({ id: 901, type: 'laser', x: 520, y: 240, w: 34, h: 16, vy: 0, spin: 1, alive: true });
    state.floaters.push({ x: 350, y: 150, text: '+135', life: 5, color: '#ffe9a8' });
  } else if (scene === 'boss') {
    startLevel(6);
    state.screen = 'play';
    state.score = 12400;
    state.combo = 11;
    state.bestCombo = 14;
    state.lives = 2;
    state.boss.hp = 17;
    state.boss.x = 300;
    state.laserUntil = state.time + 6;
    state.wideUntil = state.time + 4;
    state.paddle.width = 185;
    state.paddle.x = 330;
    state.balls = [flyBall(state, 470, 330, -18), flyBall(state, 250, 430, 42)];
    state.bolts.push({ x: 338, y: 420, alive: true }, { x: 505, y: 300, alive: true });
    state.floaters.push({ x: 480, y: 190, text: 'BOSS 17 HP', life: 5, color: '#ffd94d' });
  } else if (scene === 'win') {
    startLevel(9);
    state.screen = 'victory';
    state.score = 28750;
    state.lives = 2;
    state.bestCombo = 23;
    state.combo = 0;
    if (state.boss) state.boss.alive = false;
    state.bricks.forEach((b, i) => { if (i % 3 !== 0) b.alive = false; });
  } else {
    return false;
  }
  state.frozen = true;
  return true;
}

export { BALL };
