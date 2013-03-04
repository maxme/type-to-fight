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

    GameStats.prototype.endGame = function (victory, roomid, ratings) {
        // send stats to server
        var that = this;
        var speed = this.averageSpeed;
        var accuracy = this.accuracy;
        if (this.nkeypressed < 15) {
            speed = 0;
            accuracy = 0;
        }
        if (roomid !== 'practice') {
            this.setRating(ratings);
        }
        $.post('/endgame', {
            words: this.words,
            nkeypressed: this.totalkeypressed,
            nkeyerror: this.nbackspacepressed,
            speed: speed,
            accuracy: accuracy,
            roomid: roomid,
            victory: victory
        }, function (data, textStatus, jqXHR) {
            that.addAverageRow(data);
        });
    };


    GameStats.prototype.endGameSparklines = function () {
        function drawChart() {
            $.getJSON('/stats/history/rating', {}, function (data, textStatus, jqXHR) {
                var res1 = [['N', 'Rating']];
                var res2 = [['N', 'Rank']];
                for (var i = 0; i < data.length; ++i) {
                    res1.push([i,  data[i].rating]);
                    res2.push([i,  data[i].rank]);
                }

                var options = {
                    curveType: "function",
                    width: 120,
                    height: 40,
                    chartArea:{
                        left:0,
                        top:0,
                        width:"100%",
                        height:"100%"
                    },
                    hAxis: {
                        textPosition: 'none',
                        gridlines: {
                            color: 'transparent'
                        }
                    },
                    vAxis: {
                        textPosition: 'none',
                        direction: -1,
                        gridlines: {
                            color: 'transparent'
                        }
                    },
                    backgroundColor: {
                        fill: 'transparent'
                    },
                    baselineColor: 'transparent',
                    enableInteractivity: false,
                    legend: 'none',
                    series: {
                        0: {
                            color: 'blue',
                            visibleInLegend: false,
                            lineWidth: 2
                        },
                    }
                };

                var chart = new google.visualization.LineChart(document.getElementById('chart-rank'));
                chart.draw(google.visualization.arrayToDataTable(res2), options);

                options.series[0].color = 'red';
                options.vAxis.direction = 1;

                chart = new google.visualization.LineChart(document.getElementById('chart-rating'));
                chart.draw(google.visualization.arrayToDataTable(res1), options);
            });
        }
        drawChart();
    };

    GameStats.prototype.createTable = function () {
        var table = $('<table class="table">');
        table.append('<thead>').children('thead')
            .append('<tr />').children('tr').append('<th></th><th>Words</th><th>Keypresses</th><th>Errors</th><th>Accuracy</th><th>Speed</th>');
        var tbody = table.append('<tbody id="stats-tbody" />').children('tbody');
        tbody.append('<tr />').children('tr:last')
            .append('<td>This game</td>')
            .append('<td>' + this.words + '</td>')
            .append('<td>' + this.totalkeypressed + '</td>')
            .append('<td>' + this.nbackspacepressed + '</td>')
            .append('<td>' + Math.floor(10000 * this.accuracy) / 100 + '%</td>')
            .append('<td>' + this.averageSpeed + ' k/min</td>');
        return table;
    };

    GameStats.prototype.getArrowImg = function(current, avg, inv) {
        var green = '<img src="../images/arrow-up.png" />';
        var red = '<img src="../images/arrow-down.png" />';
        if (current > avg) {
            return inv ? red : green;
        } else {
            if (current === avg) {
                return '';
            } else {
                return inv ? green : red;
            }
        }
    };

    GameStats.prototype.setRating = function(ratings) {
        var user_rating = ratings[ratings.you + '_new_rating'];
        var user_old_rating = ratings[ratings.you + '_old_rating'];
        var user_rank = ratings[ratings.you + '_new_rank'];
        var user_old_rank = ratings[ratings.you + '_old_rank'];

        var toppercent = Math.max(1, Math.round((user_rank / ratings.card) * 10)) * 10;

        var table = $('<table class="table table-rating">');
        var tbody = table.append('<tbody>').children('tbody');
        var rank = tbody.append('<tr />').children('tr:last').append('<th>Rank</th>');

        if (rating.rank === -1) {
            rank.append('<td>not applicable</td>');
        } else {
            rank.append('<td>' + user_rank + this.getArrowImg(user_rank, user_old_rank, true) + ' (top ' + toppercent + '%)</td>');
        }
        rank.append('<td id="chart-rank" class="td-chart"></td>');
        tbody.append('<tr />').children('tr:last').append('<th>Rating</th>')
            .append('<td>' + Math.floor(user_rating) + this.getArrowImg(user_rating, user_old_rating) + '</td>')
            .append('<td id="chart-rating" class="td-chart"></td>');;
        $('#rating').html(table);
        this.endGameSparklines();
    };

    GameStats.prototype.addAverageRow = function(avgstats) {
        var table = $('#stats-tbody');
        var avgWords = Math.floor(100 * avgstats.cumulWords / avgstats.gamesPlayed) / 100;
        var avgKeyPressed = Math.floor(100 * avgstats.cumulKeyPressed / avgstats.gamesPlayed) / 100;
        var avgKeyError = Math.floor(100 * avgstats.cumulKeyError / avgstats.gamesPlayed) / 100;
        var avgAccuracy = Math.floor(10000 * avgstats.averageAccuracy) / 100;
        var avgSpeed = Math.floor(100 * avgstats.averageSpeed) / 100;
        table.append('<tr />').children('tr:last')
            .append('<td>Your Average</td>')
            .append('<td>' + avgWords + this.getArrowImg(this.words, avgWords) + '</td>')
            .append('<td>' + avgKeyPressed + this.getArrowImg(this.totalkeypressed, avgKeyPressed) + '</td>')
            .append('<td>' + avgKeyError + this.getArrowImg(this.nbackspacepressed, avgKeyError, true) + '</td>')
            .append('<td>' + avgAccuracy + '%' + this.getArrowImg(this.accuracy, avgstats.averageAccuracy) + '</td>')
            .append('<td>' + avgSpeed + ' k/min' + this.getArrowImg(this.averageSpeed, avgSpeed) + '</td>');
    };

    return GameStats;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameStats;
}


