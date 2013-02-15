"use strict";

var fs = require('fs');
var _ = require('underscore')._;

var RoomManager = (function () {
    var EXPIRATION_TIME = 60 * 60 * 24;

    function RoomManager(clients, db) {
        this.clients = clients;
        this.db = db;
        this.initWordList();
    }

    RoomManager.prototype.newRandomRoomId = function () {
        var now = new Date().getTime();
        var roomid = 0;
        do {
            roomid = Math.round(now * Math.random());
        } while (this.roomExists(roomid));
        return roomid;
    };

    RoomManager.prototype.newRandomGameOrConnect = function (cb) {
        var that = this;
        var timeWindow = 5 * 60 * 1000; // 5 minutes
        var roomid = null;
        var time = (new Date()).getTime();
        this.db.zrangebyscore('randomrooms:date', time - timeWindow, '+inf', function (err, obj) {
            if (obj && obj.length >= 1) {
                // return a recent room
                roomid = obj[0];
                that.db.zrem('randomrooms:date', roomid);
                cb(roomid);
            } else {
                // create new room
                roomid = that.newRandomRoomId();
                that.db.zadd('randomrooms:date', time, roomid);
                cb(roomid);
            }
        });
    };

    RoomManager.prototype.getInvitedGamesFor = function (playerid, cb) {
        var that = this;
        this.db.smembers('invitedrooms:' + playerid, function (err, roomlist) {
            var res = [];
            console.log('obj: ' + JSON.stringify(roomlist));
            var i = 0;
            function nextRoom() {
                if (roomlist) {
                    if (i < roomlist.length) {
                        var roomid = roomlist[i];
                        i += 1;
                        that.db.hgetall('roomid:' + roomid, function (err2, room) {
                            if (room) {
                                res.push({roomid: roomid,
                                    inviter: room.player1,
                                    time_delta: (new Date()).getTime() - room.start_time});
                            }
                            nextRoom();
                        });
                    } else {
                        cb(res);
                    }
                } else {
                    cb([]);
                }
            }
            nextRoom();

        });
    };

    RoomManager.prototype.initWordList = function () {
        var o = this;
        fs.readFile('english-common-words.json', 'ascii', function (err, data) {
            if (err) {
                return console.log(err);
            }
            o.words = JSON.parse(data);
        });
    };

    RoomManager.prototype.getRandomWordSet = function (lang, size) {
        this.words[lang].sort(function () {
            return 0.5 - Math.random();
        });
        var res = [];
        var tmpArray = this.words[lang].slice(0, size);
        for (var i = 0; i < size; ++i) {
            res.push({word: tmpArray[i % tmpArray.length], delay: _.random(i * 1000, i * 3000)});
        }
        // res = [ {word: "word1", delay: 0}, {word:"word2", delay:5000} ];
        return res;
    };

    RoomManager.prototype.getOpponentId = function (roomid, playerid, cb) {
        this.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj === null) {
                cb(null);
            }
            if (obj.player1 === playerid) {
                cb(obj.player2);
            } else {
                cb(obj.player1);
            }
        });
    };

    RoomManager.prototype.getRoomStartTime = function (roomid, cb) {
        this.db.hmget('roomid:' + roomid, 'start_time', 'state', function (err, obj) {
            if (obj[1] === 'playing') {
                cb(obj[0]);
            } else {
                cb(null);
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
                that.clients[obj.player1].emit('game_end', {});
                that.clients[obj.player2].emit('game_end', {});
            } else {
                console.log('error 4: want to end a non-playing room');
            }
        });
    };

    RoomManager.prototype.askReplay = function (roomid, playerid) {
        var that = this;
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
            words: JSON.stringify(this.getRandomWordSet("english", 10)),
            start_time: '' + (new Date()).getTime(),
            player1: '' + playerid
        };
        this.db.hmset('roomid:' + roomid, obj);
        this.db.expire('roomid:' + roomid, EXPIRATION_TIME); // expire rooms
    };

    RoomManager.prototype.connectUserToGame = function (roomid, playerid) {
        var that = this;
        that.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj === null) { // create new
                that.createNewRoom(roomid, playerid);
            } else {
                console.log('room already created');
                // check if user is alone
                if (obj.player2) {
                    console.log('error 2: both player already in...');
                    // FIXME: do something
                    // me.emitGameStart(obj.player1, obj.player2, obj);
                } else {
                    console.log('adding new player and emit game_start');
                    obj.player2 = '' + playerid;
                    obj.state = 'playing';
                    obj.start_time = '' + (new Date()).getTime();
                    that.db.hmset('roomid:' + roomid, obj); // update
                    that.emitGameStart(obj.player1, obj.player2, obj);
                }
            }
        });
    };

    return RoomManager;
})();

if (typeof(module) !== 'undefined') {
    module.exports = RoomManager;
}