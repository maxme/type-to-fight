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

    GameStats.prototype.endGame = function (victory, roomid) {
        // send stats to server
        var speed = this.averageSpeed;
        var accuracy = this.accuracy;
        if (this.nkeypressed < 15) {
            speed = 0;
            accuracy = 0;
        }

        $.post('/endgame', {
            words: this.words,
            nkeypressed: this.nkeypressed,
            nkeyerror: this.nbackspacepressed,
            speed: speed,
            accuracy: accuracy,
            roomdid: roomid,
            victory: victory
        }, function (data, textStatus, jqXHR) {
            this.addAverageRow(data);
        });
    };

    GameStats.prototype.createTable = function () {
        var table = $('<table class="table table-bordered" id="stats-table">');
        table.append('<thead>').children('thead')
            .append('<tr />').children('tr').append('<th>Words</th><th>Keys Pressed</th><th>Errors</th><th>Accuracy</th><th>Average Speed</th>');
        var tbody = table.append('<tbody />').children('tbody');
        tbody.append('<tr />').children('tr:last')
            .append('<td>' + this.words + '</td>')
            .append('<td>' + this.totalkeypressed + '</td>')
            .append('<td>' + this.nbackspacepressed + '</td>')
            .append('<td>' + Math.floor(10000 * this.accuracy) / 100 + '%</td>')
            .append('<td>' + this.averageSpeed + ' keypress/min</td>');
        return table;
    };

    GameStats.prototype.addAverageRow = function(avgstats) {
        var table = $('#stats-table');
        table
    };

    return GameStats;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameStats;
}


