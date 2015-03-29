'use strict';

var Cel = (function(x, y, state){
    this.x = x;
    this.y = y;
    this.state = state;
    this.age = 0;
});

var life = (function(){
    var debugMode = true;
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
        debugMode = (typeof options.debugMode !== 'undefined') ? options.debugMode : debugMode;
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
            }
        }
    }

    function evolve() {
        scaleUniverse();

        for(var x = 0; x < cellsCurrentGen.length; x++) {
            for (var y = 0; y < cellsCurrentGen[x].length; y++) {
                var newState = 0;
                var cel = cellsCurrentGen[x][y];

                // TODO: fill neighbour data in an earlier stage
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

                var nextGenCel = new Cel(x, y, newState);
                nextGenCel.livingNeighboursPrevGen = cel.livingNeighbours;
                if(generation > 1) {
                    nextGenCel.statePrevGen = cel.state;
                    nextGenCel.age = cel.age;
                }
                cellsNextGen[x][y] = nextGenCel;
            }
        }

        for(var x = 0; x < cellsNextGen.length; x++) {
            for (var y = 0; y < cellsNextGen[x].length; y++) {
                var cel = cellsNextGen[x][y];

                // Living neighbours in next generation.
                var livingNeighbours = countLivingNeighbours(cel, cellsNextGen);
                cel.livingNeighbours = livingNeighbours;


            }
        }

        // Move Next generation in place for rendering.
        var tmp;
        tmp = cellsCurrentGen;
        cellsCurrentGen = cellsNextGen;
        cellsNextGen = tmp;

        if(generation > 0 && !suppressRendering) {
            drawUniverse();
        }
        generation++;
    }

    function countLivingNeighbours(cel, generation){
        var livingNeighbours = 0;

        var xStart = ((cel.x-1)<0)? 0 : (cel.x-1);
        var yStart = ((cel.y-1)<0)? 0 : (cel.y-1);
        var xStop = ((cel.x+1)>=xCapacityUniverse)? xCapacityUniverse-1 : (cel.x+1);
        var yStop = ((cel.y+1)>=yCapacityUniverse)? yCapacityUniverse-1 : (cel.y+1);

        for(var x = xStart; x <= xStop; x++) {
            for(var y = yStart; y <= yStop; y++) {
                // Do not count self
                if(x !== cel.x || y !== cel.y){
                    if(generation[x][y].state === 1){
                        livingNeighbours++;
                    }
                }
            }
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
        var phases = ['dead', 'diedRecently', 'alive'];
        phases.forEach(function(phase) {
            _render(phase);
        });

        if(gridEnabled){
            drawGrid();
        }
    }

    function _render(renderPhase){
        //Moving this BG paint code insde draw() will help remove the trail
        //of the particle
        //Lets paint the canvas black
        //But the BG paint shouldn't blend with the previous frame
        context.globalCompositeOperation = "source-over";
        //Lets reduce the opacity of the BG paint to give the final touch
        context.fillStyle = "rgba(0, 0, 0, 0.3)";
        context.fillRect(0, 0, universeWidth, universeHeight);

        //Lets blend the particle with the BG
        context.globalCompositeOperation = "lighter";


        if(renderPhase == 'alive'){
            context.globalAlpha=1;
        }else{
            //context.globalAlpha=0.3;
        }

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
                    // Increase cel size with age
                    //var agedCelSize = Math.min((0.8+(cel.age/40)), 4) * celSize;
                    var agedCelSize = celSize;


                    context.fillStyle = celColor;

                    //// Squares
                    //context.fillRect(x*celSize - (agedCelSize-celSize), y*celSize - (agedCelSize-celSize), agedCelSize, agedCelSize);

                    // Circles
                    context.beginPath();
                    var xPos = x * celSize + (celSize / 2)
                    var yPos = y * celSize + (celSize / 2)
                    context.arc(xPos, yPos, agedCelSize/3, 0, 2 * Math.PI, true);
                    context.fill();


                    //context.beginPath();
                    //var xPos = x * celSize + (celSize / 2)
                    //var yPos = y * celSize + (celSize / 2)
                    //context.arc(xPos, yPos, agedCelSize/20, 0, 2 * Math.PI, false);
                    //context.fillStyle = celInnerColor;
                    //context.fill();

                    //// Fading Circles
                    //var innerRadius = 0;
                    //var outerRadius = agedCelSize / 1.4;
                    //var xPos = x * agedCelSize + (agedCelSize / 2)
                    //var yPos = y * agedCelSize + (agedCelSize / 2)
                    //
                    //if(state == 'alive' || state == 'diedRecently') {
                    //    if(state == 'alive'){
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
                    //context.arc(xPos, yPos, outerRadius, 0, 2 * Math.PI, false);
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

    function log(message, isCritical){
        isCritical = (typeof isCritical !== 'undefined') ? isCritical : false;
        if(debugMode || isCritical){
            console.log(message)
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