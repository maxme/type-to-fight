"use strict";

var GameStats = (function () {
    function GameStats() {
        this.reset();
    }

    GameStats.prototype.reset = function () {
        this.nkeypressed = 0;
        this.nbackspacepressed = 0;
        this.accuracy = 1;
        this.startTime = 0;
        this.averageSpeed = 0;
    };

    GameStats.prototype.updateStats = function () {
        var total = this.nkeypressed + this.nbackspacepressed;
        this.accuracy = this.nkeypressed / total;
    };

    GameStats.prototype.keypress = function () {
        if (this.nkeypressed === 0) {
            this.startTime = (new Date()).getTime();
        }
        this.nkeypressed += 1;
        this.updateStats();
    };

    GameStats.prototype.backspacepress = function () {
        this.nbackspacepressed += 1;
        this.updateStats();
    };

    GameStats.prototype.update = function () {
        var curTime = (new Date()).getTime();
        this.averageSpeed = (this.nkeypressed / ((curTime - this.startTime) / 1000) * 60);
    };

    return GameStats;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameStats;
}


