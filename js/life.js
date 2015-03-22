'use strict';

var Cel = (function(x, y, state){
    this.x = x;
    this.y = y;
    this.state = state;
});

var life = (function(){
    var debugMode = true;
    var showLabels = false;
    var gridEnabled = true;

    var canvas;
    var context;
    var fillColorLiveCells = '#000';
    var fillColorDeadCells = '#FFF';
    var fillColorRecentlyDeadCells = '#CCC';
    var fillColorLabels = '#777';
    var fillColorGrid = "#FFF";

    var universeWidth = 0;
    var universeHeight = 0;
    var xCapacityUniverse = 0;
    var yCapacityUniverse = 0;

    var celSize = 40;
    var cycleTime = 1000;
    var cellsCurrentGen = [];
    var cellsNextGen = [];
    var generation = 0;


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

        setInterval(this.evolve, cycleTime);

        return this;
    }

    function resetUniverse(){
        generation = 0;

        seedUniverse();
        evolve();
        evolve();
    }

    function seedUniverse(){
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
            var col = cellsCurrentGen[x];
            for (var y = 0; y < col.length; y++) {
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
                    } else {
                        // Living cell dies of either overcrowding / under-population
                        newState = 0;
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

        if(generation > 0) {
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

    function scaleUniverse(){
        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;
        if(newWidth != universeWidth || newHeight != universeHeight){
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
        for(var x = 0; x < cellsCurrentGen.length; x++) {
            var col = cellsCurrentGen[x];
            for(var y = 0; y < col.length; y++) {
                var cel = cellsCurrentGen[x][y];

                if(cel.state === 1) {
                    context.fillStyle = fillColorLiveCells;
                }else{
                    if(cel.statePrevGen ===1){
                        context.fillStyle = fillColorRecentlyDeadCells;
                    }else{
                        context.fillStyle = fillColorDeadCells;
                    }
                }
                context.fillRect(x * celSize, y * celSize, celSize, celSize);

                if(showLabels) {
                    //var label = x + "," + y;
                    var label = cel.livingNeighbours + ' (' + cel.livingNeighboursPrevGen + ')';
                    var labelX = x * celSize + 3.5
                    var labelY = y * celSize + 14.5
                    context.font = "14px sans-serif";
                    context.fillStyle = fillColorLabels;
                    context.fillText(label, labelX, labelY);
                }
            }
        }

        if(gridEnabled){
            drawGrid();
        }
    }

    function setGridEnabled(enabled){
        gridEnabled = enabled;
        drawUniverse();
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
        setGridEnabled: setGridEnabled
    }
}());