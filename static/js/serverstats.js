"use strict";

var ServerStats = (function (db) {
    function ServerStats(db) {
        this.db = db;
    }

    ServerStats.prototype.getStats = function (userid, callback) {
        var that = this;
        db.get('stats:' + userid, function (err, jstats) {
            var stats = JSON.parse(jstats);
        });
    };

    ServerStats.prototype.updateStats = function (userid, roomid, newstats, callback) {
        console.log('update: ' + JSON.stringify(newstats));
        var that = this;

        function updateStats(stats, newstats) {
            stats.cumulWords += parseInt(newstats.words);
            stats.cumulKeyPressed += parseInt(newstats.nkeypressed);
            stats.cumulKeyError += parseInt(newstats.nkeyerror);
            stats.averageSpeed = (stats.averageSpeed * stats.gamesPlayed + parseFloat(newstats.speed)) / (stats.gamesPlayed + 1);
            stats.averageAccuracy = (stats.averageAccuracy * stats.gamesPlayed + parseFloat(newstats.accuracy)) / (stats.gamesPlayed + 1);
            stats.gamesPlayed += 1;

            if (parseInt(newstats.victory) === 1) {
                console.log('victory += 1 - ' + newstats.victory);
                stats.victory += 1;
            } else {
                console.log('defeat += 1 - ' + newstats.victory);
                stats.defeat += 1;
            }
            return stats;
        }

        function newStats(newstats) {
            var stats = {
                gamesPlayed: 1,
                victory: 0,
                defeat: 0,
                cumulWords: parseInt(newstats.words),
                cumulKeyPressed: parseInt(newstats.nkeypressed),
                cumulKeyError: parseInt(newstats.nkeyerror),
                averageSpeed: parseFloat(newstats.speed),
                averageAccuracy: parseFloat(newstats.accuracy)
            };
            if (newstats.victory === 1) {
                stats.victory = 1;
            } else {
                stats.defeat = 1;
            }
        }

        that.db.get('stats:' + userid, function (err, jstats) {
            var stats = {};
            if (!err && jstats) { // update stats
                stats = JSON.parse(jstats);
                if (!(newstats.nkeypressed <= 15 || newstats.speed < 10 || newstats.accuracy < 0.1)) {
                    stats = updateStats(stats, newstats);
                }
            } else { // create stats
                stats = newStats(newstats);
            }
            if (!(newstats.nkeypressed <= 15 || newstats.speed < 10 || newstats.accuracy < 0.1)) {
                if (Object.keys(stats).length !== 0) {
                    console.log('stats roomid: ' + roomid);
                    if (roomid !== 'practice') {
                        that.db.set('stats:' + userid, JSON.stringify(stats));
                    }
                }
            }
            typeof callback === 'function' && callback(null, stats);
        });
    };

    return ServerStats;
})();

if (typeof(module) !== 'undefined') {
    module.exports = ServerStats;
}
