"use strict";

var ServerStats = (function (db) {
    var async = require('async');

    function ServerStats(db) {
        this.db = db;
    }

    ServerStats.prototype.getStats = function (userid, callback) {
        this.db.get('stats:' + userid, function (err, jstats) {
            var stats = JSON.parse(jstats);
            callback(null, stats);
        });
    };

    ServerStats.prototype.getFullStats = function (userid, callback) {
        var that = this;
        var fullstats = {};
        this.db.get('stats:' + userid, function (err, jstats) {
            // current stats
            fullstats.stats = JSON.parse(jstats);

            // rating history
            that.db.zrevrange('ratingHistory:' + userid, 0, 200, 'withscores', function (err, jsonstr) {
                var res = [];
                if (!err && jsonstr) {
                    for (var i = 0; i < jsonstr.length / 2; ++i) {
                        var ratings = JSON.parse(jsonstr[i * 2]);
                        ratings.date = jsonstr[i * 2 + 1];
                        res.push(ratings);
                    }
                    res.reverse();
                }
                fullstats.ratings_history = res;
                that.db.zrevrange('statsHistory:' + userid, 0, 200, 'withscores', function (err2, jsonstr2) {
                    var res2 = [];
                    if (!err2 && jsonstr2) {
                        for (var i = 0; i < jsonstr2.length / 2; ++i) {
                            var stats = JSON.parse(jsonstr2[i * 2]);
                            stats.date = jsonstr2[i * 2 + 1];
                            res2.push(stats);
                        }
                        res2.reverse();
                    }
                    fullstats.stats_history = res2;
                    callback(null, fullstats);
                });
            });
        });
    };

    ServerStats.prototype.getLeaderboard = function (userid, type, page, size, ids, callback) {
        var that = this;

        function getRevRank(from, to) {
            that.db.zrevrange('ratings', from, to, 'withscores', function (err, ratings) {
                var formatted = [];
                for (var i = 0; i < ratings.length / 2; ++i) {
                    formatted.push({rank: from + 1 + i, uid: ratings[2 * i], rating: ratings[2 * i + 1]});
                }
                callback(formatted);
            });
        }

        function getPageForUser(userid) {
            that.db.zrevrank('ratings', '' + userid, function (err, rank) {
                // return empty list if not ranked
                if (err) {
                    callback([]);
                } else {
                    var min = rank - size / 2;
                    var max = rank + size / 2 - 1;
                    if (min < 0) {
                        max = max - min;
                        min = 0;
                    }
                    getRevRank(min, max);
                }
            });
        }

        if (type === 'around') {
            getPageForUser(userid);
        } else {
            if (type === 'all') {
                getRevRank(page * size, (page + 1) * size - 1);
            } else {
                if (type === 'friends') {
                    async.mapLimit(ids, 5, function (item, callback) {
                        that.db.zscore('ratings', item, function (err_zscore, rating) {
                            if (!err_zscore && rating) {
                                that.db.zrevrank('ratings', item, function (err_zrank, rank) {
                                    callback(null, {uid: item, rating: rating, rank: rank + 1});
                                });
                            } else {
                                callback(null, {uid: item, rating: -1, rank: -1});
                            }
                        });
                    }, function (err, results) {
                        callback(results);
                    });
                }
            }
        }
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

    ServerStats.prototype.getRatingHistory = function (userid, callback) {
        //this.db.zrevrange('ratingHistory:' + userid, 0, 50, 'withscores')
        this.db.zrevrange('ratingHistory:' + userid, 0, 50, function (err, jsonstr) {
            var res = [];
            for (var i = 0; i < jsonstr.length; ++i) {
                var ratings = JSON.parse(jsonstr[i]);
                res.push(ratings);
            }
            res.reverse();
            callback(null, res);
        });
    };

    ServerStats.prototype.updateRatings = function (player1id, player2id, player1_is_victorious, callback) {
        var that = this;

        function calcRating(a, b, a_is_victorious) {
            var MMAX = 5000, MMIN = 1000, MREL = 50000, BMIN = 1000, BMAX = 200000;
            var tmp = MMIN + Math.max(0, ((MREL - Math.abs(a - b)) / MREL) * (MMAX - MMIN) / 2);
            if (a_is_victorious) {
                a = Math.min(BMAX, a + tmp);
            } else {
                a = Math.max(BMIN, a - tmp);
            }
            return a;
        }

        function addRatingHistory(playerid, rating, rank) {
            var date = (new Date()).getTime();
            var tostore = JSON.stringify({rating: rating, rank: rank});
            that.db.zadd('ratingHistory:' + playerid, date, tostore);
        }

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
                res.player2_new_rating = calcRating(res.player2_old_rating, res.player1_old_rating, !player1_is_victorious);
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
                                addRatingHistory(player1id, res.player1_new_rating, res.player1_new_rank);
                                addRatingHistory(player2id, res.player2_new_rating, res.player2_new_rank);
                                typeof callback === 'function' && callback(null, res);
                            });
                        });
                    });
                });
            });
        });
    };

    ServerStats.prototype.updateStats = function (userid, roomid, newstats, callback) {
        var that = this;

        function updateStats(stats, newstats) {
            stats.cumulWords += parseInt(newstats.words);
            stats.cumulKeyPressed += parseInt(newstats.nkeypressed);
            stats.cumulKeyError += parseInt(newstats.nkeyerror);
            stats.victory = parseInt(stats.victory);
            stats.defeat = parseInt(stats.defeat);
            stats.averageSpeed = (stats.averageSpeed * stats.gamesPlayed + parseFloat(newstats.speed)) / (stats.gamesPlayed + 1);
            stats.averageAccuracy = (stats.averageAccuracy * stats.gamesPlayed + parseFloat(newstats.accuracy)) / (stats.gamesPlayed + 1);
            stats.gamesPlayed += 1;

            if (parseInt(newstats.victory) === 1) {
                stats.victory += 1;
            } else {
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
            if (parseInt(newstats.victory) === 1) {
                stats.victory = 1;
            } else {
                stats.defeat = 1;
            }
            return stats;
        }

        function addStatsHistory(playerid, stats) {
            var date = (new Date()).getTime();
            var tostore = JSON.stringify(stats);
            that.db.zadd('statsHistory:' + playerid, date, tostore);
        }

        that.db.get('stats:' + userid, function (err, jstats) {
            var stats = {};
            if (!err && jstats) { // update stats
                stats = JSON.parse(jstats);
                if (roomid !== 'practice') {
                    stats = updateStats(stats, newstats);
                }
            } else { // create stats
                stats = newStats(newstats);
            }
            if (stats && Object.keys(stats).length !== 0) {
                if (roomid !== 'practice') {
                    that.db.set('stats:' + userid, JSON.stringify(stats));
                    addStatsHistory(userid, stats);
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
