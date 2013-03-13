"use strict";

var StatsPage = (function () {
    function StatsPage() {
        this.type = 'all';
        this.stats = null;
    }

    function roundx(a) {
        return function (x) {
            return Math.floor(x * Math.pow(10, a)) / Math.pow(10, a);
        };
    }

    StatsPage.prototype.show = function (params) {
        this.type = params.type;
        $('#main').hide();
        $('#leaderboard').hide();
        $('#help').hide();
        $('#stats').show();
        this.requestLoad({});
    };

    StatsPage.prototype.chart = function (data, key, color, direction, eid, filter, minv, maxv) {
        var res = [
            ['N', key]
        ];
        for (var i = 0; i < data.length; ++i) {
            if (filter) {
                res.push([i, filter(data[i][key])]);
            } else {
                res.push([i, data[i][key]]);
            }
        }

        var options = {
            curveType: "none",
            width: 500,
            height: 300,
            chartArea: {
                left: 40,
                top: 20,
                bottom: 20,
                width: "100%",
                height: "90%"
            },
            backgroundColor: {
                fill: 'transparent'
            },
            hAxis: {
                gridlines: {
                    color: 'transparent'
                }
            },
            vAxis: {
                direction: -1
            },
            baselineColor: 'transparent',
            enableInteractivity: true,
            series: {
                0: {
                    color: 'blue',
                    lineWidth: 2
                }
            }
        };
        options.series[0].color = color;
        options.vAxis.direction = direction;
        if (minv !== null || minv !== undefined) {
            options.vAxis.minValue = minv;
        }
        if (maxv) {
            options.vAxis.maxValue = maxv;
        }

        var chart = new google.visualization.LineChart(document.getElementById(eid));
        chart.draw(google.visualization.arrayToDataTable(res), options);
    };

    StatsPage.prototype.createTabCurrent = function () {
        var table = $('#sp-tab-current table tbody');
        var stats = this.stats["stats"];

        function identity(x) {
            return x;
        }

        function percentage(x) {
            return Math.floor(x * 10000) / 100 + "%";
        }

        var titles = {
            gamesPlayed: 'Games Played',
            victory: 'Victories',
            defeat: 'Defeats',
            cumulWords: 'Total entered words',
            cumulKeyPressed: 'Total keypresses',
            cumulKeyError: 'Total errors',
            averageSpeed: 'Average Speed',
            averageAccuracy: 'Average Accuracy'
        };
        var formatters = {
            gamesPlayed: identity,
            victory: identity,
            defeat: identity,
            cumulWords: identity,
            cumulKeyPressed: identity,
            cumulKeyError: identity,
            averageSpeed: Math.floor,
            averageAccuracy: percentage
        };
        for (var i in stats) {
            table.append('<tr />').children('tr:last')
                .append('<th>' + titles[i] + '</th>')
                .append('<td>' + formatters[i](stats[i]) + '</td>');
        }
    };

    StatsPage.prototype.createTabStatsHistory = function () {
        $('#sp-tab-stats-history').html();
        $('#sp-tab-stats-history').append('<h4>Average Speed</h4><div id="chart-average-speed"></div>');
        this.chart(this.stats.stats_history, 'averageSpeed', 'blue', 1, 'chart-average-speed', roundx(2));

        $('#sp-tab-stats-history').append('<h4>Victory Ratio</h4><div id="chart-victory-ratio"></div>');
        var vRatio = [];
        for (var i = 0; i < this.stats.stats_history.length; ++i) {
            var total = this.stats.stats_history[i].victory + this.stats.stats_history[i].defeat;
            var vratio = ((total - this.stats.stats_history[i].defeat) / total) * 100;
            vRatio.push({"vratio": vratio});
        }
        this.chart(vRatio, 'vratio', 'red', 1, 'chart-victory-ratio', roundx(2));
    };

    StatsPage.prototype.createTabRankHistory = function () {
        $('#sp-tab-rank-history').html();
        $('#sp-tab-rank-history').append('<h4>Rank</h4><div id="chart-rank"></div>');
        this.chart(this.stats.ratings_history, 'rank', 'blue', -1, 'chart-rank', roundx(2));
        $('#sp-tab-rank-history').append('<h4>Rating</h4><div id="chart-rating"></div>');
        this.chart(this.stats.ratings_history, 'rating', 'red', 1, 'chart-rating', roundx(2));
    };

    StatsPage.prototype.requestLoad = function (options) {
        var that = this;

        function createPage() {
            that.createTabCurrent();
            that.createTabStatsHistory();
            that.createTabRankHistory();
            $("#spinner").spin(false);
            that.update();
        }

        function getJSON() {
            $.getJSON('/stats/json', options, function (data) {
                that.stats = data;
                createPage();
            });
        }

        if (!this.stats) {
            $("#spinner").spin("very-large", "black");
            getJSON();
        } else {
            that.update();
        }
    };

    StatsPage.prototype.update = function () {
        // set tab active
        $('#sp-current').removeClass('active');
        $('#sp-stats-history').removeClass('active');
        $('#sp-rank-history').removeClass('active');
        $('#sp-' + this.type).addClass('active');
        if (this.type === "current") {
            $('#sp-tab-stats-history').hide();
            $('#sp-tab-rank-history').hide();
            $('#sp-tab-current').show();
        }
        if (this.type === "stats-history") {
            $('#sp-tab-rank-history').hide();
            $('#sp-tab-current').hide();
            $('#sp-tab-stats-history').show();
        }
        if (this.type === "rank-history") {
            $('#sp-tab-stats-history').hide();
            $('#sp-tab-current').hide();
            $('#sp-tab-rank-history').show();
        }
    };

    return StatsPage;
})();

if (typeof(module) !== 'undefined') {
    module.exports = StatsPage;
}
