var assert = require('should');
var RoomManager = require('../static/js/roommanager.js');
var redis = require('redis');

describe('roommanager', function() {
    describe('newRandomGameOrConnect', function() {
        var db = redis.createClient();

        it('should create new random game if none exists', function () {
            var rooms = new RoomManager({}, db);
            rooms.newRandomGameOrConnect(function(){});
        });
    });
});
