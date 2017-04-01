'use strict';

var Cel = (function (x, y, state) {
    this.x = x;
    this.y = y;
    this.state = state;
    this.age = 0;
    this.livingNeighbours = 0;
    this.statePrevGen = null;
});

var life = (function () {
    var verboseMode, extremeVerboseMode = false;
    var showLabels = false;
    var gridEnabled = true;

    var canvas;
    var context;
    var startStopButtonSelector;

    // var fillColorLiveCells = '#AB23CC';
    var fillColorLiveCells = 'rgba(240, 80, 235, 1)';
    var generationOverlayColor = "rgba(0, 0, 0, 0.4)"
    // var fillColorLiveCells = 'rgba(220, 90, 255, 1)';
    var fillColorDeadCells = '#000';
    var fillColorRecentlyDeadCells = "rgba(0, 0, 0, 0.9)";
    var fillColorLabels = '#777';
    var fillColorGrid = "rgba(255, 255, 255, 0.5)";

    var universeWidth = 0;
    var universeHeight = 0;
    var xCapacityUniverse = 0;
    var yCapacityUniverse = 0;

    var celSize = 40;
    var cycleTime = 1000;
    var maxAge = 20;

    var cellsCurrentGen = [];
    var cellsNextGen = [];
    var generation = 0;

    var evolutionTimer = null;
    var suppressRendering = false;

    // Calculate the endAngle of full circle once for extra performance
    var endAngle = 2 * Math.PI;
    // Calculate the maxAgeAnimationThreshold once for extra performance
    var maxAgeAnimationThreshold = maxAge * 0.98;


    function createUniverse(universeSelector, options) {
        var options = options || {};
        verboseMode = (typeof options.debugMode !== 'undefined') ? options.debugMode : verboseMode;
        extremeVerboseMode = (typeof options.extremeVerboseMode !== 'undefined') ? options.extremeVerboseMode : extremeVerboseMode;
        gridEnabled = (typeof options.hasGrid !== 'undefined') ? options.hasGrid : gridEnabled;
        celSize = (typeof options.celSize !== 'undefined') ? options.celSize : celSize;
        cycleTime = (typeof options.cycleTime !== 'undefined') ? options.cycleTime : cycleTime;
        startStopButtonSelector = (typeof options.startStopButtonSelector !== 'undefined') ? options.startStopButtonSelector : '';
        canvas = $(universeSelector).get(0);
        context = canvas.getContext('2d');

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
        evolutionTimer = setInterval(evolve, cycleTime);
    }

    function stopEvolving() {
        log("Halting evolution.");
        $(startStopButtonSelector).html('Start');
        clearInterval(evolutionTimer);
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

        var randomRed = Math.ceil(Math.random() * 255);
        var randomGreen = Math.ceil(Math.random() * 255);
        var randomBlue = Math.ceil(Math.random() * 255);
        fillColorLiveCells = 'rgba(' + randomRed + ', ' + randomGreen + ', ' + randomBlue + ', 1)';
        console.log(fillColorLiveCells);

        seedUniverse();
        evolve();
        evolve();
    }

    function seedUniverse() {
        cellsCurrentGen = [xCapacityUniverse];
        cellsNextGen = [xCapacityUniverse];

        for (var x = 0; x < xCapacityUniverse; x++) {
            cellsCurrentGen[x] = [yCapacityUniverse];
            cellsNextGen[x] = [yCapacityUniverse];
            for (var y = 0; y < yCapacityUniverse; y++) {
                cellsCurrentGen[x][y] = new Cel(x, y, Math.round(Math.random()), -1);
                cellsNextGen[x][y] = new Cel(x, y, cellsCurrentGen[x][y].state);
            }
        }

        log('Universe now holds ' + (xCapacityUniverse * yCapacityUniverse) + ' cells.');
    }

    function evolve() {
        var t0 = performance.now();

        scaleUniverse();

        for (var x = 0; x < cellsCurrentGen.length; x++) {
            for (var y = 0; y < cellsCurrentGen[x].length; y++) {
                var newState = 0;
                var cel = cellsCurrentGen[x][y];

                var livingNeighbours = countLivingNeighbours(cel, cellsCurrentGen);
                cel.livingNeighbours = livingNeighbours;

                // Evaluate living cell
                if (cel.state === 1) {
                    if (livingNeighbours == 2 || livingNeighbours == 3) {
                        // Living cell proceed to the next generation
                        newState = 1;
                        cel.age = cel.age + 1;
                    } else {
                        // Living cell dies of either overcrowding / under-population
                        newState = 0;
                        cel.age = 0;
                    }
                } else {
                    // Evaluate dead cell
                    if (livingNeighbours == 3) {
                        newState = 1;
                        cel.age = 0;
                    }
                }

                var nextGenCel = cellsNextGen[x][y];
                nextGenCel.state = newState;
                nextGenCel.statePrevGen = cel.state;
                nextGenCel.age = cel.age;
            }
        }


        // Move Next generation in place for rendering.
        var tmp;
        tmp = cellsCurrentGen;
        cellsCurrentGen = cellsNextGen;
        cellsNextGen = tmp;

        var t1 = performance.now();
        log("Call to evolving took " + Math.round(t1 - t0) + " milliseconds.", 'trivial');

        if (generation > 0 && !suppressRendering) {
            drawUniverse();
        }

        generation++;
    }

    function countLivingNeighbours(cel, generation) {
        // Wrapping the universe
        var xStart = ((cel.x - 1) < 0) ? xCapacityUniverse - 1 : (cel.x - 1);
        var yStart = ((cel.y - 1) < 0) ? yCapacityUniverse - 1 : (cel.y - 1);
        var xStop = ((cel.x + 1) >= xCapacityUniverse) ? 0 : (cel.x + 1);
        var yStop = ((cel.y + 1) >= yCapacityUniverse) ? 0 : (cel.y + 1);

        // This is quicker then using for loops.
        return (
            generation[xStart][yStart].state
            + generation[cel.x][yStart].state
            + generation[xStop][yStart].state
            + generation[xStart][cel.y].state
            + generation[xStop][cel.y].state
            + generation[xStart][yStop].state
            + generation[cel.x][yStop].state
            + generation[xStop][yStop].state
        );
    }

    function scaleUniverse(force) {
        force = force || false;

        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;
        if (force || newWidth != universeWidth || newHeight != universeHeight) {
            context.canvas.width = newWidth;
            context.canvas.height = newHeight;

            universeWidth = newWidth;
            universeHeight = newHeight;
            var xCapacityPrevUniverse = xCapacityUniverse;
            var yCapacityPrevUniverse = yCapacityUniverse;
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
        var t0 = performance.now();

        //var phases = ['dead', 'diedRecently', 'alive'];
        //var phases = [3, 2, 1];
        var phases = [1];
        phases.forEach(_render);

        if (gridEnabled) {
            drawGrid();
        }

        var t1 = performance.now();
        log("Call to drawUniverse took " + Math.round(t1 - t0) + " milliseconds.", 'trivial');
    }

    function _render(renderPhase) {
        //Moving this BG paint code insde draw() will help remove the trail
        //of the particle
        //Lets paint the canvas black
        //But the BG paint shouldn't blend with the previous frame
        context.globalCompositeOperation = "source-over";
        //Lets reduce the opacity of the BG paint to give the final touch
        context.fillStyle = generationOverlayColor;
        context.fillRect(0, 0, universeWidth, universeHeight);

        //Lets blend the particle with the BG
        context.beginPath();  // path commands must begin with beginPath
        context.fillStyle = fillColorLiveCells;

        //context.globalCompositeOperation = "source-over";
        context.globalCompositeOperation = "lighter";


        var celColor, celInnerColor, cel, render;
        for (var x = 0; x < xCapacityUniverse; x++) {
            for (var y = 0; y < yCapacityUniverse; y++) {
                render = false;
                cel = cellsCurrentGen[x][y];

                if (renderPhase === 1 && cel.state) { // Alive
                    render = true;
                    celColor = fillColorLiveCells;
                    //celColor = 'rgba(125, 125, ' + (125 + cel.age * 3) + ', 0.5)';
                }
                else if (renderPhase == 2 && cel.statePrevGen == 0 && cel.state == 0) { // Dead
                    render = false;
                    celColor = fillColorDeadCells;
                    celInnerColor = "#000";
                } else if (renderPhase == 3 && cel.statePrevGen == 1 && cel.state == 0) { // DiedRecently
                    render = true;
                    celColor = fillColorRecentlyDeadCells;
                    celInnerColor = "#000";
                }

                if (render) {
                    if (celSize < 5) {
                        //_renderCell(x, y, cel, celColor, celInnerColor);
                        context.rect(x * celSize, y * celSize, celSize, celSize);
                    } else {
                        var xPos = x * celSize + (celSize / 2)
                        var yPos = y * celSize + (celSize / 2)
                        context.moveTo(xPos, yPos);
                        context.arc(xPos, yPos, celSize / 3, 0, endAngle, true);
                    }

                }

                //if (showLabels) {
                //    //var label = x + "," + y;
                //    var label = cel.livingNeighbours + ' (' + cel.livingNeighboursPrevGen + ')';
                //    var labelX = x * agedCelSize + 3.5
                //    var labelY = y * agedCelSize + 14.5
                //    context.font = "14px sans-serif";
                //    context.fillStyle = fillColorLabels;
                //    context.fillText(label, labelX, labelY);
                //}
            }
        }

        context.fill();
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
            var xPos = x * celSize + (celSize / 2)
            var yPos = y * celSize + (celSize / 2)
            context.arc(xPos, yPos, celSize / 20, 0, endAngle, false);
            context.fillStyle = celInnerColor;
            context.fill();

            // Fading Circles
            var innerRadius = 0;
            var outerRadius = 3 * celSize / ((maxAge / 0.4) / cel.age);

            // if (renderPhase == 'alive' || renderPhase == 'diedRecently') {
            //     if (renderPhase == 'alive') {
            outerRadius = (Math.random() / 2 + 1) * outerRadius;
            // }

            var gradient = context.createRadialGradient(xPos, yPos, innerRadius, xPos, yPos, outerRadius);
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
            var xPos = x * celSize + (celSize / 2)
            var yPos = y * celSize + (celSize / 2)
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
        for (var y = 0.5; y < universeHeight; y += celSize) {
            context.moveTo(0, y);
            context.lineTo(universeWidth, y);
        }

        // Vertical lines
        for (var x = 0.5; x < universeWidth; x += celSize) {
            context.moveTo(x, 0);
            context.lineTo(x, universeHeight);
        }

        context.strokeStyle = fillColorGrid;
        context.stroke();
    }

    function log(message, level) {
        level = (typeof level !== 'undefined') ? level : "debug";

        var shouldLog = false;
        if (verboseMode && level == 'debug') {
            shouldLog = true;
        } else if (extremeVerboseMode) {
            shouldLog = true;
        } else if (level == 'error') {
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
        setCelSize: setCelSize
    }
}());