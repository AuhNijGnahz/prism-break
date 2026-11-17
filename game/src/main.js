// PRISM BREAK — entry point: owns the game state and the screen flow
// (title → banner → play → pause / level clear → game over / victory),
// runs the frame loop, and wires input actions to state transitions.

import { BALL, FIELD, PADDLE, SCORING, START_LIVES, TOTAL_LEVELS } from './config.js';
import { createInput } from './input.js';
import { buildLevel, isBossLevel, levelName } from './levels.js';
import { launchBalls, makeBall, updatePlay } from './physics.js';
import { drawWorld } from './render.js';
import { drawGameOver, drawHud, drawLevelBanner, drawPaused, drawTitle, drawVictory } from './ui.js';
import { setupShot } from './shots.js';
import { sfx, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const status = document.getElementById('status');
const input = createInput(canvas);

function freshState() {
  return {
    screen: 'title',
    time: 0,
    score: 0,
    bestScore: Number(localStorage.getItem('prismBreakBest') || 0),
    lives: START_LIVES,
    level: 1,
    combo: 0,
    bestCombo: 0,
    paddle: { x: (FIELD.width - PADDLE.width) / 2, y: PADDLE.y, width: PADDLE.width },
    balls: [],
    bricks: [],
    boss: null,
    bossName: '',
    powerups: [],
    bolts: [],
    particles: [],
    floaters: [],
    wideUntil: 0,
    laserUntil: 0,
    slowUntil: 0,
    laserTimer: 0,
    ballSpeedBase: BALL.baseSpeed,
    bossHitCooldown: 0,
    shake: 0,
    bannerLeft: 0,
    frozen: false,
  };
}

const state = freshState();

function startLevel(level) {
  state.level = level;
  const { bricks, boss } = buildLevel(level);
  state.bricks = bricks;
  state.boss = boss;
  state.bossName = isBossLevel(level) ? levelName(level).split('—')[1]?.trim() || 'BOSS WALL' : '';
  state.powerups = [];
  state.bolts = [];
  state.combo = 0;
  state.wideUntil = 0;
  state.laserUntil = 0;
  state.slowUntil = 0;
  state.paddle.width = PADDLE.width;
  state.paddle.x = (FIELD.width - PADDLE.width) / 2;
  state.ballSpeedBase = BALL.baseSpeed + (level - 1) * BALL.speedPerLevel;
  state.balls = [makeBall(state.paddle.x + state.paddle.width / 2, PADDLE.y - BALL.radius - 1, 0, 0)];
  state.screen = 'banner';
  state.bannerLeft = 1.5;
}

function startRun() {
  state.score = 0;
  state.lives = START_LIVES;
  state.bestCombo = 0;
  startLevel(1);
}

function saveBest() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    try { localStorage.setItem('prismBreakBest', String(state.bestScore)); } catch { /* private mode */ }
  }
}

function onBallLost() {
  state.lives -= 1;
  state.combo = 0;
  state.bolts = [];
  state.powerups = [];
  state.wideUntil = 0;
  state.laserUntil = 0;
  state.slowUntil = 0;
  state.paddle.width = PADDLE.width;
  if (state.lives <= 0) {
    state.screen = 'gameover';
    saveBest();
    sfx.gameOver();
    return;
  }
  sfx.loseLife();
  state.ballSpeedBase = BALL.baseSpeed + (state.level - 1) * BALL.speedPerLevel;
  state.balls = [makeBall(state.paddle.x + state.paddle.width / 2, PADDLE.y - BALL.radius - 1, 0, 0)];
}

function onLevelClear() {
  state.score += SCORING.levelClear;
  saveBest();
  if (state.level >= TOTAL_LEVELS) {
    state.screen = 'victory';
    sfx.victory();
    return;
  }
  sfx.levelClear();
  startLevel(state.level + 1);
}

function confirmAction() {
  unlockAudio();
  if (state.screen === 'title' || state.screen === 'gameover' || state.screen === 'victory') startRun();
  else if (state.screen === 'play') launchBalls(state);
}

input.on('confirm', confirmAction);
input.on('launch', () => {
  unlockAudio();
  if (state.screen === 'title' || state.screen === 'gameover' || state.screen === 'victory') startRun();
  else if (state.screen === 'play') launchBalls(state);
});
input.on('pause', () => {
  if (state.screen === 'play') state.screen = 'paused';
  else if (state.screen === 'paused') state.screen = 'play';
});
canvas.addEventListener('mousedown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

let lastScreen = '';
function announce() {
  if (state.screen === lastScreen) return;
  lastScreen = state.screen;
  const messages = {
    title: 'PRISM BREAK title screen. Press Enter to play.',
    banner: `Level ${state.level}: ${levelName(state.level)}`,
    play: 'Playing.',
    paused: 'Paused.',
    gameover: `Game over. Final score ${state.score}. Press Enter to play again.`,
    victory: `Victory! Final score ${state.score}. Press Enter to play again.`,
  };
  if (status && messages[state.screen]) status.textContent = messages[state.screen];
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0);
  last = now;

  if (!state.frozen) {
    if (state.screen === 'banner') {
      state.time += dt;
      state.bannerLeft -= dt;
      if (state.bannerLeft <= 0) state.screen = 'play';
    } else if (state.screen === 'play') {
      const events = updatePlay(state, dt, input);
      if (events.includes('ballLost')) onBallLost();
      else if (events.includes('levelClear')) onLevelClear();
    } else {
      state.time += dt; // visual clock for the title pulse and boss glow
    }
  }

  g.save();
  if (state.shake > 0) {
    g.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawWorld(g, state);
  g.restore();
  if (state.screen !== 'title') drawHud(g, state);
  if (state.screen === 'title') drawTitle(g, state);
  else if (state.screen === 'banner') drawLevelBanner(g, state);
  else if (state.screen === 'paused') drawPaused(g);
  else if (state.screen === 'gameover') drawGameOver(g, state);
  else if (state.screen === 'victory') drawVictory(g, state);
  announce();
  requestAnimationFrame(frame);
}

// Boot: a shot scene when ?shot= names one, otherwise the title over level 1.
const shotName = new URLSearchParams(location.search).get('shot');
startLevel(1);
state.screen = 'title';
if (shotName && setupShot(state, shotName, (lv) => { startLevel(lv); })) {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
requestAnimationFrame(frame);

// Handle for the automated play-test: it reads state and nudges timers/hp to
// reach late-game screens quickly; it changes no game rules.
window.__prism = { state, startRun, startLevel };
