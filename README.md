# Living Canvas

Conway's Game of Life on an HTML5 canvas, full-screen, with a trails/decay effect. No framework, no build step beyond SCSS.

## Run

Static site, but `index.html` uses absolute paths (`/css/universe.css`, `/js/life.js`), so serve the repo root over HTTP — `file://` breaks it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Build CSS

CSS is compiled from SCSS with dart-sass. `css/universe.css` is generated **and committed** (the site is served straight from the repo) — never edit it by hand.

```bash
npm install
npm run css     # one-off build
npm run watch   # recompile on change
```

## Controls

Hover the footer to expand the settings panel.

- **start/stop** — toggle evolution (also: <kbd>Space</kbd>)
- **next** — single generation
- **reset** — reseed the universe (picks a new live-cell colour)
- **Generation lifetime** — 15–1000ms, lower bound per generation
- **Cel Size** — 1–60px (changing it restarts the simulation)
- **Decay Speed** — 1–60 generations before a dead cell fades out

FPS is shown bottom-right.

## Usage

```js
const myLife = life.createUniverse('#universe', {
    celSize: 5,                          // px per cell
    cycleTime: 30,                       // ms lower bound per generation
    decayGenerations: 8,                 // trail length
    hasGrid: false,
    debugMode: false,                    // console logging
    extremeVerboseMode: false,
    startStopButtonSelector: '#startstop',
    fpsSelector: '#fps'
});
myLife.startEvolving();
```

`life` is a singleton module — one universe per page. Public API: `evolve`, `startEvolving`, `stopEvolving`, `toggleEvolution`, `resetUniverse`, `scaleUniverse`, `drawGrid`, `setGridEnabled`, `setCycleTime`, `setCelSize`, `setDecayGenerations`, `log`.

## Notes

- The grid **wraps** at the edges.
- The canvas resizes to the window on every generation; growing past current capacity triggers a full reset.
- Rendering is additive: one semi-transparent black rect over the previous frame, then all live cells in a single path with `globalCompositeOperation = "lighter"`.
- Evolution is driven by `requestAnimationFrame`, so `cycleTime` is quantised to whole display frames.
- UI is jQuery 1.5.1 from the Google CDN, wired inline in `index.html`.

See `CLAUDE.md` for deeper architecture notes.
