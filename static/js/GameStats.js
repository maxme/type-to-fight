"use strict";

var GameStats = (function() {
    function GameStats() {
        this.reset();
    }

    GameStats.prototype.reset = function () {
        this.nkeypressed = 0;
        this.nbackspacepressed = 0;
        this.accuracy = 1;
    };

    GameStats.prototype.updateStats = function () {
        var total = this.nkeypressed + this.nbackspacepressed;
        this.accuracy = this.nkeypressed / total;
    };

    GameStats.prototype.keypress = function () {
        this.nkeypressed += 1;
        this.updateStats();
    };

    GameStats.prototype.backspacepress = function () {
        this.nbackspacepressed += 1;
        this.updateStats();
    };

    return GameStats;
})();