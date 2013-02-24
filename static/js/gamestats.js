"use strict";

var GameStats = (function () {
    function GameStats() {
        this.reset();
    }

    GameStats.prototype.reset = function () {
        this.nkeypressed = 0;
        this.nbackspacepressed = 0;
        this.totalkeypressed = 0;
        this.accuracy = 1;
        this.startTime = 0;
        this.averageSpeed = 0;
        this.words = 0;
    };

    GameStats.prototype.winword = function (word) {
        this.words += 1;
    };

    GameStats.prototype.updateStats = function () {
        var curTime = (new Date()).getTime();
        this.accuracy = this.nkeypressed / this.totalkeypressed;
        if (this.nkeypressed > 15) {
            var tmp = (this.nkeypressed / ((curTime - this.startTime) / 1000) * 60);
            this.averageSpeed = Math.floor(100 * tmp) / 100;
        } else {
            this.averageSpeed = 'na';
        }
    };

    GameStats.prototype.keypress = function () {
        if (this.nkeypressed === 0) {
            this.startTime = (new Date()).getTime();
        }
        this.totalkeypressed += 1;
        this.nkeypressed += 1;
        this.updateStats();
    };

    GameStats.prototype.backspacepress = function () {
        this.totalkeypressed += 1;
        this.nbackspacepressed += 1;
        this.updateStats();
    };

    return GameStats;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameStats;
}


