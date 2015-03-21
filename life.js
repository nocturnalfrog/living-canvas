'use strict';

var life = (function(){
    var debugMode = true;
    var hasGrid = true;
    var gridColor = "#FFF";
    var canvas;
    var context;
    var universeWidth = 0;
    var universeHeight = 0;
    var sizeOfCel = 20;
    var cycleTime = 500;

    function createUniverse(universeSelector){
        canvas = $(universeSelector).get(0);
        context = canvas.getContext("2d");

        setInterval(this.evolve, cycleTime);
    }

    function evolve() {
        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;
        if(newWidth != universeWidth || newHeight != universeHeight){
            context.canvas.width  = newWidth;
            context.canvas.height = newHeight;

            universeWidth = newWidth;
            universeHeight = newHeight;
            log('Canvas size changed to: ' + universeWidth + 'px x ' + universeHeight + 'px');
        }

        context.fillRect(sizeOfCel*5, sizeOfCel*5, sizeOfCel, sizeOfCel);

        if(hasGrid){
            drawGrid();
        }

    }

    function drawGrid(){
        // Horizontal lines
        for (var y = 0.5; y < universeHeight; y += sizeOfCel) {
            context.moveTo(0, y);
            context.lineTo(universeWidth, y);
        }

        // Vertical lines
        for (var x = 0.5; x < universeWidth; x += sizeOfCel) {
            context.moveTo(x, 0);
            context.lineTo(x, universeHeight);
        }

        context.strokeStyle = gridColor;
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
        drawGrid: drawGrid,
        log: log
    }
}());