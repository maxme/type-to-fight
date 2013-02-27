"use strict";

var fs = require('fs');
var _ = require('underscore')._;
var Common = require('./common.js');

var RoomManager = (function () {
    var common = new Common();
    var EXPIRATION_TIME = 60 * 60 * 4;

    function RoomManager(clients, db, serverstats, callback) {
        this.clients = clients;
        this.db = db;
        this.serverstats = serverstats;
        this.initWordList(callback);
    }

    RoomManager.prototype.newRandomRoomId = function () {
        var now = new Date().getTime();
        var roomid = 0;
        do {
            roomid = Math.round(now * Math.random());
        } while (this.roomExists(roomid));
        return roomid;
    };

    RoomManager.prototype.getUserKeyFor = function (room, playerid) {
        var player = 'ERROR PLAYER NAME';
        if (room.player1 === playerid) {
            player = 'player1';
        } else {
            if (room.player2 === playerid) {
                player = 'player2';
            }
        }
        return player;
    };

    RoomManager.prototype.getOtherPlayerId = function (room, playerid) {
        if (room.player1 === playerid) {
            return room.player2;
        } else {
            return room.player1;
        }
    };

    RoomManager.prototype.playerWinWord = function (roomid, playerid, word, callback) {
        var that = this;
        that.db.hgetall('roomid:' + roomid, function (err, room) {
            if (room) {
                var words = JSON.parse(room.words);
                var wordlist = words.map(function (e) { return e.word; });
                if (wordlist.indexOf(word) !== -1) {
                    var wordobj = words.filter(function (e) { return e.word === word; })[0];
                    var player;
                    if (wordobj.type === 0) { // attack
                        // other player
                        player = that.getUserKeyFor(room, that.getOtherPlayerId(room, playerid));
                    } else {
                        // this player
                        player = that.getUserKeyFor(room, playerid);
                    }
                    var kscore = 'scoreof' + player;
                    var score = parseFloat(room[kscore]);
                    if (wordobj.type === 0) { // attack
                        score = Math.max(0, score - parseFloat(wordobj.power));
                    } else { // heal
                        score = Math.min(100, score + parseFloat(wordobj.power));
                    }
                    that.db.hset('roomid:' + roomid, kscore, score);
                    typeof callback === 'function' && callback(null, {score: score});
                } else {
                    // cheater ?
                    typeof callback === 'function' && callback('word: ' + word + ' is not in the current game', 2);
                }
            } else {
                typeof callback === 'function' && callback('roomid:'+ roomid + ' does not exist', 1);
            }
        });
    };

    RoomManager.prototype.newRandomGameOrConnect = function (callback) {
        var that = this;
        var timeWindow = 5 * 60 * 1000; // 5 minutes
        var roomid = null;
        var time = (new Date()).getTime();
        this.db.zrangebyscore('randomrooms:date', time - timeWindow, '+inf', function (err, obj) {
            if (obj && obj.length >= 1) {
                // return a recent room
                roomid = obj[0];
                that.db.zrem('randomrooms:date', roomid);
                typeof callback === 'function' && callback(roomid);
            } else {
                // create new room
                roomid = that.newRandomRoomId();
                that.db.zadd('randomrooms:date', time, roomid);
                typeof callback === 'function' && callback(roomid);
            }
        });
    };

    RoomManager.prototype.deleteInvitation = function(roomid, inviter, playerid) {
        this.db.srem('invitedrooms:' + playerid, roomid);
        this.db.srem('createdrooms:' + inviter, roomid);
    };

    RoomManager.prototype.getInvitedGamesFor = function (playerid, callback) {
        var that = this;
        this.db.smembers('invitedrooms:' + playerid, function (err, roomlist) {
            var res = [];
            var i = 0;
            function nextRoom() {
                if (roomlist) {
                    if (i < roomlist.length) {
                        var roomid = roomlist[i];
                        i += 1;
                        that.db.hgetall('roomid:' + roomid, function (err2, room) {
                            if (room) {
                                var time_delta = Math.floor(((new Date()).getTime() - room.start_time) / 1000);
                                if (time_delta <= 600) {
                                    res.push({roomid: roomid,
                                        inviter: room.player1,
                                        time_delta: time_delta});
                                }
                            } else {
                                that.db.srem('invitedrooms:' + playerid, roomid);
                            }
                            nextRoom();
                        });
                    } else {
                        typeof callback === 'function' && callback(res);
                    }
                } else {
                    typeof callback === 'function' && callback([]);
                }
            }
            nextRoom();
        });
    };

    RoomManager.prototype.initWordList = function (callback) {
        var o = this;
        fs.readFile('english-common-words.json', 'ascii', function (err, data) {
            if (err) {
                typeof callback === 'function' && callback(1);
                return console.log(err);
            }
            o.words = JSON.parse(data);
            typeof callback === 'function' && callback(0);
        });
    };


    RoomManager.prototype.getAttackType = function () {
        if (Math.random() > 0.3) {
            return 0;
        } else {
            return 1;
        }
    };

    RoomManager.prototype.getRandomWordSet = function (lang, size) {
        this.words[lang].sort(function () {
            return 0.5 - Math.random();
        });
        var res = [];
        var tmpArray = this.words[lang].slice(0, size);
        for (var i = 0; i < size; ++i) {
            var word = tmpArray[i % tmpArray.length];
            var type = this.getAttackType();
            var power = word.length * 2;
            if (type === 1) {
                power = Math.floor(word.length * 1.2);
            }
            res.push({word: word, type: type, power: power});
        }
        // res = [ {word: "word1", delay: 0}, {word:"word2", delay:5000} ];
        return res;
    };

    RoomManager.prototype.getOpponentId = function (roomid, playerid, cb) {
        this.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj === null) {
                cb(null);
                return ;
            }
            if (obj.player1 === playerid) {
                cb(obj.player2);
            } else {
                cb(obj.player1);
            }
        });
    };

    RoomManager.prototype.getRoomStartTime = function (roomid, callback) {
        this.db.hmget('roomid:' + roomid, 'start_time', 'state', function (err, obj) {
            if (obj[1] === 'playing') {
                typeof callback === 'function' && callback(obj[0]);
            } else {
                typeof callback === 'function' && callback(null);
            }
        });
    };

    RoomManager.prototype.endGame = function (roomid) {
        var that = this;
        this.db.hgetall('roomid:' + roomid, function (err, obj) {
            // update state
            if (obj.state === 'playing') {
                that.db.hmset('roomid:' + roomid, {state: 'end'});
                // send message to clients
                var scores = {
                    player1: parseFloat(obj['scoreofplayer1']),
                    player2: parseFloat(obj['scoreofplayer2'])
                };
                // FIXME: BUG: CHECK IF CLIENTS EXISTS
                that.clients[obj.player1].emit('game_end', {
                    you: 'player1', opp: 'player2', scores: scores
                });
                that.clients[obj.player2].emit('game_end', {
                    you: 'player2', opp: 'player1', scores: scores
                });
                var player1_is_victorious = scores.player1 > scores.player2;
                that.serverstats.updateRatings(obj.player1, obj.player2, player1_is_victorious);
                that.deleteRoom(roomid);
            } else {
                console.log('error 4: want to end a non-playing room');
            }
        });
    };

    RoomManager.prototype.deleteRoom = function (roomid, playerid) {
        // delete roomid
        this.db.del('roomid:' + roomid);
    };

    RoomManager.prototype.askReplay = function (roomid, playerid) {
        var that = this;
        if (roomid === 'practice') {
            this.emitPracticeStart(playerid);
            return ;
        }
        this.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj && obj.state === 'end') {
                // delete roomid
                that.db.del('roomid:' + roomid);
                // recreate the room
                that.connectUserToGame(roomid, playerid);
            } else {
                that.connectUserToGame(roomid, playerid);
            }
        });
    };

    RoomManager.prototype.emitPracticeStart = function (playerid) {
        this.clients[playerid].emit('game_start', {
            words: this.getRandomWordSet("english", common.MAX_WORD_LIST),
            start_time: '' + (new Date()).getTime()
        });
    };

    RoomManager.prototype.emitGameStart = function (player1, player2, obj) {
        if (!this.clients[player1]) {
            // FIXME: emit game_start error to player2
            console.log('player1 ' + player1 + ' disconnected');
            return;
        }
        if (!this.clients[player2]) {
            // FIXME: emit game_start error to player1
            console.log('player2 ' + player2 + ' disconnected');
            return;
        }
        obj.words = JSON.parse(obj.words);
        this.clients[player1].emit('game_start', obj);
        this.clients[player2].emit('game_start', obj);
    };

    RoomManager.prototype.roomExists = function (roomid) {
        this.db.exists('roomid:' + roomid);
    };

    RoomManager.prototype.associateRoomToInviterAndInvitee = function (roomid, playerid, invitedplayerid) {
        var that = this;
        // link roomid to a zset
        var time = (new Date()).getTime();
        that.db.zadd('inviterooms:date', time, roomid);

        // link roomid to player created rooms
        that.db.sadd('createdrooms:' + playerid, roomid);
        that.db.expire('createdrooms:' + playerid, EXPIRATION_TIME); // expire rooms

        // link roomid to invited player
        that.db.sadd('invitedrooms:' + invitedplayerid, roomid);
        that.db.expire('invitedrooms:' + invitedplayerid, EXPIRATION_TIME); // expire rooms
    };

    RoomManager.prototype.createNewRoom = function (roomid, playerid) {
        // create the new room
        var obj = {
            state: 'new',
            scoreofplayer1: '100',
            scoreofplayer2: '100',
            words: JSON.stringify(this.getRandomWordSet("english", common.MAX_WORD_LIST)),
            start_time: '' + (new Date()).getTime(),
            player1: '' + playerid
        };
        this.db.hmset('roomid:' + roomid, obj);
        this.db.expire('roomid:' + roomid, EXPIRATION_TIME); // expire rooms
    };

    RoomManager.prototype.connectUserToGame = function (roomid, playerid, callback) {
        var that = this;
        that.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj === null) { // create new
                that.createNewRoom(roomid, playerid);
                typeof callback === 'function' && callback(null, 2);
            } else {
                console.log('room already created');
                // check if user is alone
                if (obj.player2) {
                    console.log('error 2: both player already in...');
                    // FIXME: do something
                    // me.emitGameStart(obj.player1, obj.player2, obj);
                    typeof callback === 'function' && callback(1, 1);
                } else {
                    console.log('adding new player and emit game_start');
                    obj.player2 = '' + playerid;
                    obj.state = 'playing';
                    obj.start_time = '' + (new Date()).getTime();
                    that.db.hmset('roomid:' + roomid, obj, function (err, res){
                        that.db.hmget('roomid:' + roomid, 'start_time', function (err, obj2) {
                            console.log('new start_time= ' + obj2[0]);
                        });
                        that.emitGameStart(obj.player1, obj.player2, obj);
                        typeof callback === 'function' && callback(null, 0);
                    });
                }
            }
        });
    };

    return RoomManager;
})();

if (typeof(module) !== 'undefined') {
    module.exports = RoomManager;
}