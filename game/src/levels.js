// PRISM BREAK — the nine level layouts and the brick objects built from them.
// Layout legend, one character per cell of the 12-column grid:
//   . empty    N normal (1 hp, colour cycles by row)    H hard (2-3 hp)
//   B boom (explodes, damaging its neighbours)         S split (breaks into two mini bricks)
//   X steel (unbreakable; never required for a clear)
// Levels 3, 6 and 9 are boss walls: a moving, regenerating boss brick guarded
// by the rows listed under `guards`.

import { BRICKS, BOSS } from './config.js';

const LAYOUTS = [
  null, // levels are 1-based
  {
    name: 'First Facet',
    rows: [
      'NNNNNNNNNNNN',
      'N..NNNNNN..N',
      'N.N......N.N',
      'NNNNNNNNNNNN',
      '.....SS.....',
    ],
  },
  {
    name: 'Cross Cut',
    rows: [
      'HH..NNNN..HH',
      '.HH.NNNN.HH.',
      '..NNNNNNNN..',
      'NNN.B..B.NNN',
      '..NNNNNNNN..',
      '.HH..SS..HH.',
    ],
  },
  {
    name: 'Boss Wall I — The Warden',
    boss: true,
    guards: [
      'N..N....N..N',
      '.S..NNNN..S.',
    ],
  },
  {
    name: 'Diamond Mine',
    rows: [
      '.....NN.....',
      '....NNNN....',
      '...NNHHNN...',
      '..NNHBBHNN..',
      '.NNNHHHHNNN.',
      'NNN.N..N.NNN',
      '.S...XX...S.',
    ],
  },
  {
    name: 'The Anvil',
    rows: [
      'HHHHHHHHHHHH',
      'HNNN....NNNH',
      'HN.HHHHHH.NH',
      'H..B.SS.B..H',
      'HHHHHHHHHHHH',
      '..XX....XX..',
    ],
  },
  {
    name: 'Boss Wall II — The Twin Engine',
    boss: true,
    guards: [
      'HH..NNNN..HH',
      '.B..N..N..B.',
      '..S......S..',
    ],
  },
  {
    name: 'Prism Stair',
    rows: [
      'N...........',
      'NN..HH......',
      'NNN..HH..S..',
      '.NNN..HHHH..',
      '..NNN.B..HH.',
      '...NNN..HHHH',
      '....SS..B..N',
    ],
  },
  {
    name: 'The Vault',
    rows: [
      'XXXXXXXXXXXX',
      'XHHHHHHHHHHX',
      'XHNNNBBNNNHX',
      'XHN.HHHH.NHX',
      'XHN.H..H.NHX',
      'XHHN.SS.NHHX',
      '..B......B..',
    ],
  },
  {
    name: 'Boss Wall III — The Prism Heart',
    boss: true,
    guards: [
      'HHHHHHHHHHHH',
      '.B.N.SS.N.B.',
      '..X..NN..X..',
    ],
  },
];

const KIND_BY_CHAR = { N: 'normal', H: 'hard', B: 'boom', S: 'split', X: 'steel' };

export function isBossLevel(level) {
  return Boolean(LAYOUTS[level] && LAYOUTS[level].boss);
}

export function levelName(level) {
  return LAYOUTS[level] ? LAYOUTS[level].name : `Level ${level}`;
}

function makeBrick(col, row, kind, level) {
  const hp = kind === 'hard' ? (level >= 5 ? 3 : 2) : kind === 'steel' ? Infinity : 1;
  return {
    x: BRICKS.originX + col * (BRICKS.width + BRICKS.gap),
    y: BRICKS.top + row * (BRICKS.height + BRICKS.gap),
    w: BRICKS.width,
    h: BRICKS.height,
    kind,
    hp,
    maxHp: hp,
    row,
    alive: true,
    flash: 0,
  };
}

// Builds the brick list for a level. Boss levels also return a boss object;
// their guard rows sit below the boss so the ball can reach both.
export function buildLevel(level) {
  const def = LAYOUTS[level];
  const bricks = [];
  let boss = null;
  if (def.boss) {
    boss = {
      x: (960 - BOSS.width) / 2,
      y: BOSS.y,
      w: BOSS.width,
      h: BOSS.height,
      hp: BOSS.hpByLevel[level] || 30,
      maxHp: BOSS.hpByLevel[level] || 30,
      dir: 1,
      sinceHit: 99,
      flash: 0,
      alive: true,
      isBoss: true,
    };
    def.guards.forEach((rowStr, r) => {
      [...rowStr].forEach((ch, c) => {
        if (ch === '.') return;
        const brick = makeBrick(c, r, KIND_BY_CHAR[ch], level);
        brick.y += BOSS.height + 64; // guards hang below the boss wall
        bricks.push(brick);
      });
    });
  } else {
    def.rows.forEach((rowStr, r) => {
      [...rowStr].forEach((ch, c) => {
        if (ch === '.') return;
        bricks.push(makeBrick(c, r, KIND_BY_CHAR[ch], level));
      });
    });
  }
  return { bricks, boss };
}

// A split brick dies into two half-width mini bricks in the same cell.
export function splitChildren(brick) {
  const halfW = (brick.w - 4) / 2;
  return [0, 1].map((i) => ({
    x: brick.x + i * (halfW + 4),
    y: brick.y,
    w: halfW,
    h: brick.h,
    kind: 'mini',
    hp: 1,
    maxHp: 1,
    row: brick.row,
    alive: true,
    flash: 0,
  }));
}

export function breakableRemaining(bricks) {
  return bricks.filter((b) => b.alive && b.kind !== 'steel').length;
}
