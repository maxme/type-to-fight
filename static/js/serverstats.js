"use strict";

var ServerStats = (function (db) {
    function ServerStats(db) {
        this.db = db;
    }

    ServerStats.prototype.getStats = function (userid, callback) {
        db.get('stats:' + userid, function (err, jstats) {
            var stats = JSON.parse(jstats);
            callback(null, stats);
        });
    };

    ServerStats.prototype.getRating = function (userid, callback) {
        var userRating = 100000;
        var userRank = -1;
        var nscores = 1;
        var that = this;
        that.db.zscore('ratings', '' + userid, function (err, rating) {
            if (!err && rating) {
                userRating = parseFloat(rating);
            }
            that.db.zrevrank('ratings', '' + userid, function (err2, rank) {
                if (!err2 && rank !== null) {
                    userRank = parseFloat(rank) + 1;
                }
                that.db.zcard('ratings', function (err3, card) {
                    if (!err3) {
                        nscores = parseFloat(card);
                    }
                    callback(null, {rating: userRating, rank: userRank, nscores: nscores});
                });
            });
        });
    };

    ServerStats.prototype.updateRatings = function (player1id, player2id, player1_is_victorious, callback) {
        function calcRating(a, b, a_is_victorious) {
            var MMAX = 5000, MMIN= 1000, MREL = 50000, BMIN = 1000, BMAX = 200000;
            var tmp = MMIN + Math.max(0, ((MREL - Math.abs(a - b)) / MREL) * (MMAX - MMIN) / 2);
            if (a_is_victorious) {
                a = Math.min(BMAX, a + tmp);
            } else {
                a = Math.max(BMIN, a - tmp);
            }
            return a;
        }

        var that = this;
        that.getRating(player1id, function (err, player1Rating) {
            that.getRating(player2id, function (err2, player2Rating) {
                var res = {
                    card: player1Rating.nscores,
                    player1_old_rating: player1Rating.rating,
                    player2_old_rating: player2Rating.rating,
                    player1_old_rank: player1Rating.rank,
                    player2_old_rank: player2Rating.rank,
                    // init
                    player1_new_rank: player1Rating.nscores,
                    player2_new_rank: player1Rating.nscores
                };
                res.player1_new_rating = calcRating(res.player1_old_rating, res.player2_old_rating, player1_is_victorious);
                res.player2_new_rating = calcRating(res.player2_old_rating, res.player1_old_rating, ! player1_is_victorious);
                console.log('player1 rating: ' + res.player1_old_rating  + ' -> ' + res.player1_new_rating);
                console.log('player2 rating: ' + res.player2_old_rating  + ' -> ' + res.player2_new_rating);
                // set new ratings
                that.db.zadd('ratings', res.player1_new_rating, player1id, function () {
                    that.db.zadd('ratings', res.player2_new_rating, player2id, function () {
                        // get new rank
                        that.db.zrevrank('ratings', '' + player1id, function (err3, rank1) {
                            if (!err2 && rank1 !== null) {
                                res.player1_new_rank = parseFloat(rank1) + 1;
                            }
                            that.db.zrevrank('ratings', '' + player2id, function (err4, rank2) {
                                if (!err2 && rank2 !== null) {
                                    res.player2_new_rank = parseFloat(rank2) + 1;
                                }
                                typeof callback === 'function' && callback(null, res);
                            });
                        });
                    });
                });
            });
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
            return stats;
        }

        that.db.get('stats:' + userid, function (err, jstats) {
            var stats = {};
            if (!err && jstats) { // update stats
                stats = JSON.parse(jstats);
                if (!(newstats.nkeypressed <= 15 || newstats.speed < 10 || newstats.accuracy < 0.1)) {
                    if (roomid !== 'practice') {
                        stats = updateStats(stats, newstats);
                    }
                }
            } else { // create stats

                stats = newStats(newstats);
            }
            if (!(newstats.nkeypressed <= 15 || newstats.speed < 10 || newstats.accuracy < 0.1)) {
                if (stats && Object.keys(stats).length !== 0) {
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
