# PRISM BREAK

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/AuhNijGnahz/prism-break/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/AuhNijGnahz/prism-break/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An entry to make.fun's [“Make the best game” bounty (best-game-01)](https://make.fun/bounty/best-game-01).

A brick-breaker roguelite for the desktop browser: nine hand-built facets of
bricks, falling power-up capsules, combo scoring, and a moving, regenerating
boss wall every third level. Written in plain ES modules on a 2D canvas with
WebAudio-synthesised sound — no libraries, no build step, no network requests.

## Play

```sh
node serve.ts        # then open http://localhost:8080
```

- **Move:** mouse, or ← → / A D
- **Launch:** click or Space · **Pause:** P · **Restart:** Enter on the end screens

Break every breakable brick to clear a level. Grey bricks take 2–3 hits, ✸
bricks explode and damage their neighbours, ⋈ bricks split into two mini
bricks, and ▦ steel is unbreakable (and never required). Capsules drop from
broken bricks: **W** widens the paddle, **M** splits the ball, **L** mounts
laser cannons, **S** slows time, **+** adds a life. Consecutive breaks build
your combo multiplier; touching the paddle or losing the ball resets it.
Levels 3, 6 and 9 are boss walls that slide sideways and regenerate health
when left alone — keep the pressure on.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` via `vendor/makefun-game.ts`.
- `game/src/` — one job per file: `config` (tuning), `levels` (layouts and
  brick building), `physics` (ball, collisions, explosions, boss), `powerups`
  (capsules and effects), `render` (the world), `ui` (HUD and screens),
  `audio` (synth effects), `input`, `shots` (screenshot scenes), `main`
  (state and screen flow).

MIT licensed — see `LICENSE`.
