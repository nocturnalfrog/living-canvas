# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

CSS is compiled from SCSS with **dart-sass** (`npm install` once). No other toolchain, no tests, no linter.

- `npm run watch` — recompile on change
- `npm run css` — one-off build

`css/universe.css` is generated and committed — the site is served straight from the repo, so a stale CSS commit ships a stale site. Never edit it by hand.

`scss/_color-util.scss` exists only to work around dart-sass emitting `rgb(23.67%, ...)` for non-integer channels: wrap `color.adjust()`/`color.mix()` results in `solid()` to get integer `rgb()` output.

## Run

Static site — serve the repo root over HTTP (paths in `index.html` are absolute: `/css/universe.css`, `/js/life.js`), e.g. `python3 -m http.server 8000`. Opening `index.html` via `file://` breaks those paths.

## Architecture

Three files matter: `index.html`, `js/life.js`, `scss/universe.scss`.

- `js/life.js` is an IIFE returning a **singleton** module. `life.createUniverse(selector, options)` returns `this` (the module itself), so state (`celSize`, `cycleTime`, `cellsCurrentGen`, `canvas`/`context`, colors) lives in closure vars — only one universe per page is possible.
- Two preallocated 2D arrays `cellsCurrentGen` / `cellsNextGen` of `Cel` objects are swapped each `evolve()` rather than reallocated; `seedUniverse()` is the only place they're built.
- The grid **wraps** at the edges. `evolve()` inlines the 8 neighbour lookups by hand (deliberate: faster than loops), hoisting the wrapped column references and `x` wrap indices out of the inner loop — they only change once per column.
- `scaleUniverse()` runs at the top of every `evolve()` and resizes the canvas to `window.innerWidth/Height`; growing capacity triggers a full `resetUniverse()`. Resizing or changing cell size therefore restarts the simulation.
- Rendering (`_render`) is a trails effect, not a redraw: a semi-transparent black rect is painted over the previous frame, then all live cells are added to a **single path** with `globalCompositeOperation = "lighter"` and one `fill()`. Cells < 5px render as rects, larger as arcs. Adding per-cell `fillStyle`/`fill()` calls kills performance — `_renderCell()` is kept only as a deprecated reference.
- `resetUniverse()` randomizes the live-cell colour on each reset.
- Evolution is driven by `requestAnimationFrame` (`scheduleEvolve()`), not `setInterval`: `cycleTime` is a **lower bound** quantised to whole display frames, so the sim never computes a generation the screen won't show and a slow generation can't queue up back-to-back callbacks. Measured cost is ~0.4ms compute + ~0.8ms canvas at `celSize` 5; `celSize` 1 (1.4M cells) is the only work-bound case.
- UI is jQuery (1.5.1, Google CDN) wired inline in `index.html`'s `<script>`; `life.js` only knows the start/stop button via the `startStopButtonSelector` option, used to toggle its label between Start/Stop.
- Settings panel is CSS-only: `footer .inner:hover` expands `.controls` via a `max-height` transition (`scss/universe.scss`).
- `log(msg, level)` is gated by the `debugMode` / `extremeVerboseMode` options passed to `createUniverse`.
