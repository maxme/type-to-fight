"use strict";

var fs = require('fs');
var _ = require('underscore')._;

var RoomManager = (function () {
    function RoomManager(clients, db) {
        this.clients = clients;
        this.db = db;
        this.initWordList();
    }

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
            return 0.5 - Math.random()
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
            that.db.hmset('roomid:' + roomid, {state: 'end'});
            console.log('p1=' + obj.player1);
            console.log('p2=' + obj.player2);
            // send message to clients
            that.clients[obj.player1].emit('game_end', {});
            that.clients[obj.player2].emit('game_end', {});
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

    RoomManager.prototype.connectUserToGame = function (roomid, playerid) {
        var me = this;
        me.db.hgetall('roomid:' + roomid, function (err, obj) {
            if (obj === null) { // create new
                // FIXME: create zadd to remove old rooms
                obj = {
                    state: 'new',
                    words: JSON.stringify(me.getRandomWordSet("english", 10)),
                    player1: playerid
                };
                me.db.hmset('roomid:' + roomid, obj);
            } else {
                console.log('room already created');
                // check if user is alone
                if (obj.player2) {
                    console.log('error 2: both player already in...');
                    // FIXME: do something
                    // me.emitGameStart(obj.player1, obj.player2, obj);
                } else {
                    console.log('adding new player and emit game_start');
                    obj.player2 = playerid;
                    obj.state = 'playing';
                    obj.start_time = '' + (new Date()).getTime();
                    me.db.hmset('roomid:' + roomid, obj); // update
                    me.emitGameStart(obj.player1, obj.player2, obj);
                }
            }
        });
    };

    return RoomManager;
})();

if (typeof(module) !== 'undefined') {
    module.exports = RoomManager;
}