'use strict';

const Cel = (function (x, y, state) {
    this.x = x;
    this.y = y;
    this.state = state;
    this.age = 0;
    this.livingNeighbours = 0;
    this.statePrevGen = null;
});

const life = (function () {
    let verboseMode, extremeVerboseMode = false;
    const showLabels = false;
    let gridEnabled = true;

    let canvas;
    let context;
    let startStopButtonSelector;

    // var fillColorLiveCells = '#AB23CC';
    let fillColorLiveCells = 'rgba(240, 80, 235, 1)';
    let decayGenerations = 8;
    let generationOverlayColor = "rgba(0, 0, 0, 0.4)";
    // var fillColorLiveCells = 'rgba(220, 90, 255, 1)';
    const fillColorDeadCells = '#000';
    const fillColorRecentlyDeadCells = "rgba(0, 0, 0, 0.9)";
    const fillColorLabels = '#777';
    const fillColorGrid = "rgba(255, 255, 255, 0.5)";

    let universeWidth = 0;
    let universeHeight = 0;
    let xCapacityUniverse = 0;
    let yCapacityUniverse = 0;

    let celSize = 40;
    let cycleTime = 1000;
    const maxAge = 20;

    let cellsCurrentGen = [];
    let cellsNextGen = [];
    let generation = 0;

    let evolutionTimer = null;
    let lastEvolvedAt = 0;
    const suppressRendering = false;

    // FPS counter
    let fpsSelector;
    let fpsFrames = 0;
    let fpsLastSample = 0;
    const fpsSampleInterval = 500;

    // Calculate the endAngle of full circle once for extra performance
    const endAngle = 2 * Math.PI;
    // Calculate the maxAgeAnimationThreshold once for extra performance
    const maxAgeAnimationThreshold = maxAge * 0.98;


    function createUniverse(universeSelector, options) {
        options = options || {};
        verboseMode = (typeof options.debugMode !== 'undefined') ? options.debugMode : verboseMode;
        extremeVerboseMode = (typeof options.extremeVerboseMode !== 'undefined') ? options.extremeVerboseMode : extremeVerboseMode;
        gridEnabled = (typeof options.hasGrid !== 'undefined') ? options.hasGrid : gridEnabled;
        celSize = (typeof options.celSize !== 'undefined') ? options.celSize : celSize;
        cycleTime = (typeof options.cycleTime !== 'undefined') ? options.cycleTime : cycleTime;
        decayGenerations = (typeof options.decayGenerations !== 'undefined') ? options.decayGenerations : decayGenerations;
        startStopButtonSelector = (typeof options.startStopButtonSelector !== 'undefined') ? options.startStopButtonSelector : '';
        fpsSelector = (typeof options.fpsSelector !== 'undefined') ? options.fpsSelector : '';
        canvas = $(universeSelector).get(0);
        context = canvas.getContext('2d');

        updateGenerationOverlayColor();
        scaleUniverse();

        return this;
    }

    function toggleEvolution() {
        if (!isEvolving()) {
            startEvolving();
        } else {
            stopEvolving();
        }
    }

    function isEvolving() {
        if (evolutionTimer != null) {
            return true;
        } else {
            return false;
        }
    }

    function startEvolving() {
        log("Starting Evolution...");
        $(startStopButtonSelector).html('Stop');
        // Don't average over the time we were paused.
        fpsFrames = 0;
        fpsLastSample = 0;
        lastEvolvedAt = 0;
        evolutionTimer = requestAnimationFrame(scheduleEvolve);
    }

    /**
     * Drives evolution off the display's refresh rate instead of setInterval, so we
     * never compute a generation the screen won't show, and a generation that runs
     * long can't queue up back-to-back callbacks. cycleTime acts as a lower bound
     * and is therefore quantised to whole frames.
     */
    function scheduleEvolve(now) {
        evolutionTimer = requestAnimationFrame(scheduleEvolve);

        if (now - lastEvolvedAt < cycleTime) {
            return;
        }

        lastEvolvedAt = now;
        evolve();
    }

    function stopEvolving() {
        log("Halting evolution.");
        $(startStopButtonSelector).html('Start');
        cancelAnimationFrame(evolutionTimer);
        evolutionTimer = null;
    }

    function setCycleTime(newCycleTime) {
        cycleTime = newCycleTime;

        // If evolution is in progress we need to reset the timer.
        if (isEvolving()) {
            stopEvolving();
            startEvolving();
        }
    }

    function setDecayGenerations(newDecayGenerations) {
        decayGenerations = newDecayGenerations;

        updateGenerationOverlayColor();
    }

    /**
     * The overlay is painted once per generation, so the residual brightness of a
     * cell after n generations is (1 - alpha)^n. Solve for a 2% residual to get the
     * alpha that makes a trail visually gone after decayGenerations generations.
     */
    function updateGenerationOverlayColor() {
        const generations = Number(decayGenerations);

        if (generations <= 1) {
            generationOverlayColor = "rgba(0, 0, 0, 1)";
            return;
        }

        generationOverlayColor = "rgba(0, 0, 0, " + (1 - Math.pow(0.02, 1 / generations)) + ")";
    }

    function setCelSize(newCelSize) {
        celSize = newCelSize;

        scaleUniverse(true);
        resetUniverse();
    }

    function resetUniverse() {
        generation = 0;

        // An empty universe looks like dead cells.
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
        context.fillStyle = fillColorDeadCells;
        context.fillRect(0, 0, universeWidth, universeHeight);

        const randomRed = Math.ceil(Math.random() * 255);
        const randomGreen = Math.ceil(Math.random() * 255);
        const randomBlue = Math.ceil(Math.random() * 255);
        fillColorLiveCells = 'rgba(' + randomRed + ', ' + randomGreen + ', ' + randomBlue + ', 1)';
        console.log(fillColorLiveCells);

        seedUniverse();
        evolve();
        evolve();
    }

    function seedUniverse() {
        cellsCurrentGen = [xCapacityUniverse];
        cellsNextGen = [xCapacityUniverse];

        for (let x = 0; x < xCapacityUniverse; x++) {
            cellsCurrentGen[x] = [yCapacityUniverse];
            cellsNextGen[x] = [yCapacityUniverse];
            for (let y = 0; y < yCapacityUniverse; y++) {
                cellsCurrentGen[x][y] = new Cel(x, y, Math.round(Math.random()), -1);
                cellsNextGen[x][y] = new Cel(x, y, cellsCurrentGen[x][y].state);
            }
        }

        log('Universe now holds ' + (xCapacityUniverse * yCapacityUniverse) + ' cells.');
    }

    function evolve() {
        const t0 = performance.now();

        scaleUniverse();

        const xMax = xCapacityUniverse - 1;
        const yMax = yCapacityUniverse - 1;

        for (let x = 0; x < xCapacityUniverse; x++) {
            // The wrapped x neighbours only change once per column, not per cell.
            const colPrev = cellsCurrentGen[(x === 0) ? xMax : x - 1];
            const col = cellsCurrentGen[x];
            const colNext = cellsCurrentGen[(x === xMax) ? 0 : x + 1];
            const nextGenCol = cellsNextGen[x];

            for (let y = 0; y < yCapacityUniverse; y++) {
                const yPrev = (y === 0) ? yMax : y - 1;
                const yNext = (y === yMax) ? 0 : y + 1;

                // Unrolled on purpose: quicker than looping over the 8 neighbours.
                const livingNeighbours = colPrev[yPrev].state
                    + col[yPrev].state
                    + colNext[yPrev].state
                    + colPrev[y].state
                    + colNext[y].state
                    + colPrev[yNext].state
                    + col[yNext].state
                    + colNext[yNext].state;

                const cel = col[y];
                const state = cel.state;
                let newState = 0;

                // Evaluate living cell
                if (state === 1) {
                    if (livingNeighbours === 2 || livingNeighbours === 3) {
                        // Living cell proceeds to the next generation
                        newState = 1;
                        cel.age = cel.age + 1;
                    } else {
                        // Living cell dies of either overcrowding / under-population
                        cel.age = 0;
                    }
                } else {
                    // Evaluate dead cell
                    if (livingNeighbours === 3) {
                        newState = 1;
                        cel.age = 0;
                    }
                }

                const nextGenCel = nextGenCol[y];
                nextGenCel.state = newState;
                nextGenCel.statePrevGen = state;
                nextGenCel.age = cel.age;
            }
        }

        // Move Next generation in place for rendering.
        const tmp = cellsCurrentGen;
        cellsCurrentGen = cellsNextGen;
        cellsNextGen = tmp;

        const t1 = performance.now();
        log("Call to evolving took " + Math.round(t1 - t0) + " milliseconds.", 'trivial');

        if (generation > 0 && !suppressRendering) {
            drawUniverse();
        }

        generation++;
    }

    function scaleUniverse(force) {
        force = force || false;

        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        if (force || newWidth != universeWidth || newHeight != universeHeight) {
            context.canvas.width = newWidth;
            context.canvas.height = newHeight;

            universeWidth = newWidth;
            universeHeight = newHeight;
            const xCapacityPrevUniverse = xCapacityUniverse;
            const yCapacityPrevUniverse = yCapacityUniverse;
            xCapacityUniverse = Math.ceil(universeWidth / celSize);
            yCapacityUniverse = Math.ceil(universeHeight / celSize);
            log('Canvas size changed to: ' + universeWidth + 'px x ' + universeHeight + 'px');

            // Reset the universe when it expands.
            if (xCapacityUniverse > xCapacityPrevUniverse || yCapacityUniverse > yCapacityPrevUniverse) {
                resetUniverse();
            }
        }
    }

    function drawUniverse() {
        const t0 = performance.now();

        //var phases = ['dead', 'diedRecently', 'alive'];
        //var phases = [3, 2, 1];
        const phases = [1];
        phases.forEach(_render);

        if (gridEnabled) {
            drawGrid();
        }

        const t1 = performance.now();
        log("Call to drawUniverse took " + Math.round(t1 - t0) + " milliseconds.", 'trivial');

        sampleFps(t1);
    }

    // Counts rendered frames and publishes an averaged rate every fpsSampleInterval ms.
    function sampleFps(now) {
        if (!fpsSelector) {
            return;
        }

        fpsFrames++;

        if (fpsLastSample === 0) {
            fpsLastSample = now;
            return;
        }

        const elapsed = now - fpsLastSample;
        if (elapsed >= fpsSampleInterval) {
            $(fpsSelector).html(Math.round(fpsFrames * 1000 / elapsed) + ' fps');
            fpsFrames = 0;
            fpsLastSample = now;
        }
    }

    function _render(renderPhase) {
        // Moving this BG paint code inside draw() will help remove the trail of the particles
        // Paint the canvas black but the BG paint shouldn't blend with the previous frame
        context.globalCompositeOperation = "source-over";
        // Reduce the opacity of the BG paint to give the final touch
        context.fillStyle = generationOverlayColor;
        context.fillRect(0, 0, universeWidth, universeHeight);

        // Blend the particle with the BG
        context.beginPath();  // path commands must begin with beginPath
        context.fillStyle = fillColorLiveCells;

        //context.globalCompositeOperation = "source-over";
        context.globalCompositeOperation = "lighter";

        // Hoisted out of the cell loop: these never change within a frame.
        const asRects = celSize < 5;
        const celOffset = celSize / 2;
        const celRadius = celSize / 3;

        for (let x = 0; x < xCapacityUniverse; x++) {
            const col = cellsCurrentGen[x];
            const xPix = x * celSize;

            for (let y = 0; y < yCapacityUniverse; y++) {
                if (!isRenderable(col[y], renderPhase)) {
                    continue;
                }

                if (asRects) {
                    //_renderCell(x, y, cel, celColor, celInnerColor);
                    context.rect(xPix, y * celSize, celSize, celSize);
                } else {
                    const xPos = xPix + celOffset;
                    const yPos = y * celSize + celOffset;
                    context.moveTo(xPos, yPos);
                    context.arc(xPos, yPos, celRadius, 0, endAngle, true);
                }
            }
        }

        context.fill();
    }

    /**
     * Phase 1 = alive, 2 = dead, 3 = died recently. Only phase 1 is drawn today;
     * dead cells are left to the semi-transparent overlay that creates the trails.
     */
    function isRenderable(cel, renderPhase) {
        if (renderPhase === 1) {
            return cel.state === 1;
        }

        if (renderPhase === 3) {
            return cel.statePrevGen === 1 && cel.state === 0;
        }

        return false;
    }

    /**
     * Deprecated due to negative performance impact.
     */
    function _renderCell(x, y, cel, celColor, celInnerColor) {
        context.fillStyle = celColor;

        // Squares
        //context.fillRect(x*celSize - (agedCelSize-celSize), y*celSize - (agedCelSize-celSize), agedCelSize, agedCelSize);

        // Circles
        if (cel.age >= maxAgeAnimationThreshold) {
            context.beginPath();
            const xPos = x * celSize + (celSize / 2)
            const yPos = y * celSize + (celSize / 2)
            context.arc(xPos, yPos, celSize / 20, 0, endAngle, false);
            context.fillStyle = celInnerColor;
            context.fill();

            // Fading Circles
            const innerRadius = 0;
            let outerRadius = 3 * celSize / ((maxAge / 0.4) / cel.age);

            // if (renderPhase == 'alive' || renderPhase == 'diedRecently') {
            //     if (renderPhase == 'alive') {
            outerRadius = (Math.random() / 2 + 1) * outerRadius;
            // }

            const gradient = context.createRadialGradient(xPos, yPos, innerRadius, xPos, yPos, outerRadius);
            gradient.addColorStop(0, celInnerColor);
            gradient.addColorStop(0.1, celInnerColor);
            gradient.addColorStop(0.8, "#000");
            gradient.addColorStop(0.9, celColor);
            gradient.addColorStop(1, "black");
            context.fillStyle = gradient;
            // }

            context.beginPath();
            context.arc(xPos, yPos, outerRadius, 0, endAngle, false);
            context.fill();
        }
        else if (celSize > 4) {
            context.beginPath();
            const xPos = x * celSize + (celSize / 2)
            const yPos = y * celSize + (celSize / 2)
            context.arc(xPos, yPos, celSize / 3, 0, endAngle, true);
            context.fill();
        } else {
            // Fall back to squares for extra  performance
            context.fillRect(x * celSize, y * celSize, celSize, celSize);
        }
    }

    function setGridEnabled(enabled) {
        gridEnabled = enabled;
    }

    function drawGrid() {
        // Horizontal lines
        for (let y = 0.5; y < universeHeight; y += celSize) {
            context.moveTo(0, y);
            context.lineTo(universeWidth, y);
        }

        // Vertical lines
        for (let x = 0.5; x < universeWidth; x += celSize) {
            context.moveTo(x, 0);
            context.lineTo(x, universeHeight);
        }

        context.strokeStyle = fillColorGrid;
        context.stroke();
    }

    function log(message, level) {
        level = (typeof level !== 'undefined') ? level : "debug";

        let shouldLog = false;
        if (verboseMode && level === 'debug') {
            shouldLog = true;
        } else if (extremeVerboseMode) {
            shouldLog = true;
        } else if (level === 'error') {
            shouldLog = true;
        }


        if (shouldLog) {
            console.log(message);
        }
    }

    return {
        createUniverse: createUniverse,
        evolve: evolve,
        scaleUniverse: scaleUniverse,
        drawGrid: drawGrid,
        log: log,
        setGridEnabled: setGridEnabled,
        toggleEvolution: toggleEvolution,
        resetUniverse: resetUniverse,
        startEvolving: startEvolving,
        stopEvolving: stopEvolving,
        setCycleTime: setCycleTime,
        setCelSize: setCelSize,
        setDecayGenerations: setDecayGenerations
    }
}());