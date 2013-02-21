var assert = require('should');
var RoomManager = require('../static/js/roommanager.js');
var redis = require('redis');

describe('roommanager', function () {
    var db;
    var rooms;

    before(function (done) {
        db = redis.createClient();
        rooms = new RoomManager({}, db, function () {
            done();
        });
    });

    describe('newRandomGameOrConnect', function () {
        it('should create new random game if none exists', function () {
            var rooms = new RoomManager({}, db);
            rooms.newRandomGameOrConnect(function () {
            });
        });
    });

    describe('Connect User To Game', function () {
        var db = redis.createClient();

        it('should connect 2 user to a game and detect cheater', function (done) {
            var player1 = '123';
            var player2 = '321';
            var roomid = '150';

            // delete room id
            db.del('roomid:' + roomid, function () {
                // connect first user
                rooms.connectUserToGame(roomid, player1, function (err1, res1) {
                    res1.should.equal(2);
                    rooms.connectUserToGame(roomid, player2, function (err2, res2) {
                        res2.should.equal(0);
                        rooms.playerWinWord(roomid, player1, 'XXtotoXX', function (err3, res3) {
                            console.log(err3);
                            res3.should.equal(2);
                            done();
                        });
                    });
                });
            });
        });

        it('should connect 2 user to a game and send a win word', function (done) {
            var player1 = '123';
            var player2 = '321';
            var roomid = '150';
            // delete room id
            db.del('roomid:' + roomid, function () {
                // connect first user
                rooms.connectUserToGame(roomid, player1, function (err1, res1) {
                    res1.should.equal(2);
                    db.hmget('roomid:' + roomid, 'words', function (err5, res5) {
                        var wordobj = JSON.parse(res5[0])[0];
                        rooms.connectUserToGame(roomid, player2, function (err2, res2) {
                            res2.should.equal(0);
                            rooms.playerWinWord(roomid, player1, wordobj.word, function (err3, res3) {
                                res3.should.equal(0);
                                db.hgetall('roomid:' + roomid, function (err4, res4) {
                                    if (wordobj.type === 1) {
                                        res4['scoreofplayer1'].should.equal('100');
                                    } else {
                                        res4['scoreofplayer2'].should.equal(''+ (100 - wordobj.power));
                                    }
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
