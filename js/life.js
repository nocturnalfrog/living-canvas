'use strict';

var Cel = (function(x, y, state){
    this.x = x;
    this.y = y;
    this.state = state;
    this.age = 0;
});

var life = (function(){
    var verboseMode, extremeVerboseMode = false;
    var showLabels = false;
    var gridEnabled = true;

    var canvas;
    var context;
    var fillColorLiveCells = '#AB23CC';
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
    var cellsCurrentGen = [];
    var cellsNextGen = [];
    var generation = 0;
    var evolutionTimer = null;
    var suppressRendering = false;


    function createUniverse(universeSelector, options){
        var options = options || {};
        verboseMode = (typeof options.debugMode !== 'undefined') ? options.debugMode : verboseMode;
        extremeVerboseMode = (typeof options.extremeVerboseMode !== 'undefined') ? options.extremeVerboseMode : extremeVerboseMode;
        gridEnabled = (typeof options.hasGrid !== 'undefined') ? options.hasGrid : gridEnabled;
        celSize = (typeof options.celSize !== 'undefined') ? options.celSize : celSize;
        cycleTime = (typeof options.cycleTime !== 'undefined') ? options.cycleTime : cycleTime;

        canvas = $(universeSelector).get(0);
        context = canvas.getContext("2d");

        scaleUniverse();
        resetUniverse();

        return this;
    }

    function toggleEvolution(){
        if(!isEvolving()){
            startEvolving();
        }else{
            stopEvolving();
        }
    }

    function isEvolving(){
        if(evolutionTimer != null){
            return true;
        }else{
            return false;
        }
    }

    function startEvolving(){
        log("Starting Evolution...");
        evolutionTimer = setInterval(evolve, cycleTime);
    }

    function stopEvolving(){
        log("Halting evolution.");
        clearInterval(evolutionTimer);
        evolutionTimer = null;
    }

    function setCycleTime(newCycleTime){
        cycleTime = newCycleTime;

        // If evolution is in progress we need to reset the timer.
        if(isEvolving()){
            stopEvolving();
            startEvolving();
        }
    }

    function setCelSize(newCelSize){
        celSize = newCelSize;

        scaleUniverse(true);
        resetUniverse();
    }

    function resetUniverse(){
        generation = 0;

        // An empty universe looks like dead cells.
        context.globalAlpha=1;
        context.fillStyle = fillColorDeadCells;
        context.fillRect(0, 0, universeWidth, universeHeight);

        seedUniverse();
        evolve();
        evolve();
    }

    function seedUniverse(){
        cellsCurrentGen = [];
        cellsNextGen = [];

        for(var x = 0; x < xCapacityUniverse; x++) {
            cellsCurrentGen[x] = [];
            cellsNextGen[x] = [];
            for(var y = 0; y < yCapacityUniverse; y++) {
                cellsCurrentGen[x][y] = new Cel(x, y, Math.round(Math.random()), -1);
                cellsNextGen[x][y] = new Cel(x, y, cellsCurrentGen[x][y].state);
            }
        }

        log('Universe now holds ' + (xCapacityUniverse * yCapacityUniverse) + ' cells.');
    }

    function evolve() {
        var t0 = performance.now();

        scaleUniverse();

        for(var x = 0; x < cellsCurrentGen.length; x++) {
            for (var y = 0; y < cellsCurrentGen[x].length; y++) {
                var newState = 0;
                var cel = cellsCurrentGen[x][y];

                var livingNeighbours = countLivingNeighbours(cel, cellsCurrentGen);
                cel.livingNeighbours = livingNeighbours;

                // Evaluate living cell
                if(cel.state === 1) {
                    if (livingNeighbours == 2 || livingNeighbours == 3) {
                        // Living cell proceed to the next generation
                        newState = 1;
                        cel.age = cel.age +1;
                    } else {
                        // Living cell dies of either overcrowding / under-population
                        newState = 0;
                        cel.age = 0;
                    }
                }else{
                    // Evaluate dead cell
                    if(livingNeighbours == 3){
                        newState = 1;
                    }
                }

                var nextGenCel = cellsNextGen[x][y];
                nextGenCel.state = newState;
                //nextGenCel.livingNeighboursPrevGen = cel.livingNeighbours;
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

        if(generation > 0 && !suppressRendering) {
            drawUniverse();
        }

        generation++;
    }

    function countLivingNeighbours(cel, generation){
        var livingNeighbours = 0;

        var xStart = ((cel.x-1)<0) ? 0 : (cel.x-1);
        var yStart = ((cel.y-1)<0) ? 0 : (cel.y-1);
        var xStop = ((cel.x+1)>=xCapacityUniverse) ? xCapacityUniverse-1 : (cel.x+1);
        var yStop = ((cel.y+1)>=yCapacityUniverse) ? yCapacityUniverse-1 : (cel.y+1);

        for(var x = xStart; x <= xStop; x++) {
            for(var y = yStart; y <= yStop; y++) {
                // Do not count self
                if(x !== cel.x || y !== cel.y){
                    if(generation[x][y].state === 1){
                        livingNeighbours++;
                    }
                }
                // Performance tweak
                if(livingNeighbours > 3) break;
            }
            // Performance tweak
            if(livingNeighbours > 3) break;
        }

        return livingNeighbours;
    }

    function scaleUniverse(force){
        force = force || false;

        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;
        if(force || newWidth != universeWidth || newHeight != universeHeight){
            context.canvas.width  = newWidth;
            context.canvas.height = newHeight;

            universeWidth = newWidth;
            universeHeight = newHeight;
            var xCapacityPrevUniverse = xCapacityUniverse;
            var yCapacityPrevUniverse = yCapacityUniverse;
            xCapacityUniverse = Math.ceil(universeWidth/celSize);
            yCapacityUniverse = Math.ceil(universeHeight/celSize);
            log('Canvas size changed to: ' + universeWidth + 'px x ' + universeHeight + 'px');

            // Reset the universe when it expands.
            if(xCapacityUniverse > xCapacityPrevUniverse  || yCapacityUniverse > yCapacityPrevUniverse) {
                resetUniverse();
            }
        }
    }

    function drawUniverse(){
        var t0 = performance.now();

        //var phases = ['dead', 'diedRecently', 'alive'];
        var phases = ['alive'];
        phases.forEach(function(phase) {
            _render(phase);
        });

        if(gridEnabled){
            drawGrid();
        }

        var t1 = performance.now();
        log("Call to drawUniverse took " + Math.round(t1 - t0) + " milliseconds.", 'trivial');
    }

    function _render(renderPhase){
        //Moving this BG paint code insde draw() will help remove the trail
        //of the particle
        //Lets paint the canvas black
        //But the BG paint shouldn't blend with the previous frame
        context.globalCompositeOperation = "source-over";
        //Lets reduce the opacity of the BG paint to give the final touch
        context.fillStyle = "rgba(0, 0, 0, 0.75)";
        context.fillRect(0, 0, universeWidth, universeHeight);

        //Lets blend the particle with the BG
        context.globalCompositeOperation = "lighter";

        // Calculate the endAngle of full circle once for extra performance
        var endAngle = 2 * Math.PI;

        for (var x = 0; x < cellsCurrentGen.length; x++) {
            for (var y = 0; y < cellsCurrentGen[x].length; y++) {
                var render = false;
                var celColor, celInnerColor;
                var cel = cellsCurrentGen[x][y];

                if(renderPhase == 'dead' && cel.statePrevGen == 0 && cel.state == 0){
                    render = true;
                    celColor = fillColorDeadCells;
                    celInnerColor = "#000";
                }
                if(renderPhase == 'diedRecently' && cel.statePrevGen == 1 && cel.state == 0){
                    render = true;
                    celColor = fillColorRecentlyDeadCells;
                    celInnerColor = "#000";
                }
                if(renderPhase == 'alive' && cel.state == 1){
                    render = true;
                    celColor = fillColorLiveCells;
                    celInnerColor = "#FFF";
                }

                if(render) {
                    context.fillStyle = celColor;

                    // Increase cel size with age
                    //var agedCelSize = Math.min((0.8+(cel.age/40)), 4) * celSize;
                    var agedCelSize = celSize;



                    // Squares
                    //context.fillRect(x*celSize - (agedCelSize-celSize), y*celSize - (agedCelSize-celSize), agedCelSize, agedCelSize);

                    // Circles
                    if(celSize >= 5){
                        context.beginPath();
                        var xPos = x * celSize + (celSize / 2)
                        var yPos = y * celSize + (celSize / 2)
                        context.arc(xPos, yPos, agedCelSize/3, 0, endAngle, true);
                        context.fill();
                    }else{
                        // Fall back to squares for extra  performance
                        context.fillRect(x*celSize - (agedCelSize-celSize), y*celSize - (agedCelSize-celSize), agedCelSize*0.8, agedCelSize*0.8);
                    }


                    //context.beginPath();
                    //var xPos = x * celSize + (celSize / 2)
                    //var yPos = y * celSize + (celSize / 2)
                    //context.arc(xPos, yPos, agedCelSize/20, 0, endAngle, false);
                    //context.fillStyle = celInnerColor;
                    //context.fill();
                    //
                    //// Fading Circles
                    //var innerRadius = 0;
                    //var outerRadius = agedCelSize / 1.4;
                    //var xPos = x * agedCelSize + (agedCelSize / 2)
                    //var yPos = y * agedCelSize + (agedCelSize / 2)
                    //
                    //if(renderPhase == 'alive' || renderPhase == 'diedRecently') {
                    //    if(renderPhase == 'alive'){
                    //        outerRadius = (Math.random()/2+1)*outerRadius;
                    //    }
                    //
                    //    var gradient = context.createRadialGradient(xPos, yPos, innerRadius, xPos, yPos, outerRadius);
                    //    gradient.addColorStop(0, celInnerColor);
                    //    gradient.addColorStop(0.1, celInnerColor);
                    //    gradient.addColorStop(0.8, "#000");
                    //    gradient.addColorStop(0.9, celColor);
                    //    gradient.addColorStop(1, "black");
                    //    context.fillStyle = gradient;
                    //}
                    //
                    //context.beginPath();
                    //context.arc(xPos, yPos, outerRadius, 0, endAngle, false);
                    //context.fill();
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
    }

    function setGridEnabled(enabled){
        gridEnabled = enabled;
    }

    function drawGrid(){
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

    function log(message, level){
        level = (typeof level !== 'undefined') ? level : "debug";

        var shouldLog = false;
        if(verboseMode && level == 'debug'){
            shouldLog = true;
        }else if(extremeVerboseMode){
            shouldLog = true;
        }else if(level == 'error'){
            shouldLog = true;
        }


        if(shouldLog){
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