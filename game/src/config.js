// PRISM BREAK — shared constants: field geometry, tuning and the colour palette.
// Every other module reads its numbers from here so the game stays tunable in one place.

export const FIELD = { width: 960, height: 640 };

export const PADDLE = {
  width: 112,
  height: 14,
  y: FIELD.height - 38,
  keySpeed: 620,
  wideFactor: 1.65,
  wideSeconds: 12,
  laserSeconds: 10,
  laserCooldown: 0.22,
};

export const BALL = {
  radius: 7,
  baseSpeed: 430,
  speedPerLevel: 22,
  speedPerBrick: 1.6,
  maxSpeed: 760,
  maxBounceAngle: (68 * Math.PI) / 180,
  slowFactor: 0.62,
  slowSeconds: 8,
  maxBalls: 6,
};

export const BRICKS = {
  cols: 12,
  width: 72,
  height: 24,
  gap: 5,
  top: 86,
  get originX() {
    return (FIELD.width - (this.cols * this.width + (this.cols - 1) * this.gap)) / 2;
  },
};

export const POWERUPS = {
  fallSpeed: 150,
  width: 34,
  height: 16,
  dropChance: 0.24,
  types: ['wide', 'multi', 'laser', 'slow', 'life'],
};

export const BOSS = {
  width: 320,
  height: 46,
  y: 92,
  hpByLevel: { 3: 26, 6: 40, 9: 58 },
  moveSpeed: 66,
  regenPerSecond: 1.4,
  regenDelay: 2.5,
};

export const SCORING = {
  normal: 50,
  hard: 80,
  boom: 90,
  split: 70,
  mini: 40,
  bossHit: 25,
  bossDown: 1500,
  levelClear: 250,
};

export const COLORS = {
  bgTop: '#0b1026',
  bgBottom: '#1b0f2e',
  wall: '#3b4470',
  paddle: '#e8f6ff',
  paddleEdge: '#39c2ff',
  ball: '#ffffff',
  ballGlow: '#7ce7ff',
  text: '#eef4ff',
  dim: '#93a4c8',
  accent: '#ffd94d',
  danger: '#ff5470',
  brickByKind: {
    normal: ['#ff5d8f', '#38b6ff', '#3ddc84', '#ffd94d', '#b388ff', '#ff9f43'],
    hard: '#8d9bb5',
    hardCracked: '#c3cede',
    boom: '#ff7847',
    split: '#4de3ff',
    mini: '#9df2ff',
    steel: '#525d7a',
  },
  powerByType: {
    wide: '#3ddc84',
    multi: '#ffd94d',
    laser: '#ff5470',
    slow: '#38b6ff',
    life: '#ff8fb2',
  },
  powerLabel: { wide: 'W', multi: 'M', laser: 'L', slow: 'S', life: '+' },
};

export const TOTAL_LEVELS = 9;
export const START_LIVES = 3;
