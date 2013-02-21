//"use strict";

var fs = require('fs');
var RoomManager = require('./static/js/roommanager.js');
var Common = require('./static/js/common.js');

var SignedRequest = require('facebook-signed-request');
SignedRequest.secret = 'b4ba1375a1643fb2669792479836af82';

//setup Dependencies
var connect = require('connect');
var express = require('express');
var sio = require('socket.io');
var http = require('http');
var https = require('https');
var redis = require('redis');
var port = (process.env.PORT || 8081);

// setup log and trace
process.on('uncaughtException', function (err) {
    console.error('uncaughtException:', err.message);
    console.error(err.stack);
    process.exit(1);
});

//setup redis
var db = redis.createClient();

//Setup Express
var expressConfigure = function () {
    app.set('views', __dirname + '/views');
    app.set('view options', { layout: false });
    app.use(connect.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "shhhhecrethhhhh!"}));
    app.use(connect.static(__dirname + '/static'));
    app.use(app.router);
};

var app = express();
app.configure(expressConfigure);

//setup the errors
app.use(function (err, req, res, next) {
    if (err instanceof NotFound) {
        res.status(404);
        res.render('404.jade', {
            title: '404 - Not Found',
            description: '',
            author: '',
            analyticssiteid: 'XXXXXXX'
        });
    } else {
        res.status(500);
        res.render('500.jade', {
            title: 'The Server Encountered an Error',
            description: '',
            error: err.stack,
            author: '', analyticssiteid: 'XXXXXXX'
        });
    }
});

// http
var server = http.createServer(app);
server.listen(port);

// https
var serverHttps = https.createServer({
    key: fs.readFileSync('ssl/ssl-key.pem'),
    cert: fs.readFileSync('ssl/ssl-cert.pem')}, app);
serverHttps.listen(8082);

//Setup Socket.IO
var io = sio.listen(serverHttps);
var clients = {};
var rooms = new RoomManager(clients, db);
var common = new Common();

function checkTimeMessage(roomid, callback) {
    rooms.getRoomStartTime(roomid, function (startTime) {
        if (startTime) {
            var curTime = (new Date()).getTime();
            if (curTime - startTime > (common.GAME_TIME_S + common.GAME_COUNTDOWN) * 1000) {
                typeof callback === 'function' && callback(true);
                rooms.endGame(roomid);
            }
            typeof callback === 'function' && callback(false);
        }
    });
}

io.sockets.on('connection', function (socket) {
    console.log('Client Connected: ' + socket.id);
    socket.on('connection', function (data) {
        data.socket_id = socket.id;
        clients[data.playerid] = socket;
        socket.emit('connection_ok', data);
        if (data.roomid === 'practice') {
            rooms.emitPracticeStart(data.playerid);
        } else {
            rooms.connectUserToGame(data.roomid, data.playerid);
        }
    });

    socket.on('start', function (data) {
        // ok game started...
    });

    socket.on('ping', function (data) {
        checkTimeMessage(data.roomid);
    });

    socket.on('win_word', function (data) {
        checkTimeMessage(data.roomid, function (gameEnded) {
            if (!gameEnded) {
                // count score
                rooms.playerWinWord(data.roomid, data.playerid, data.word);
                // send a message to opponent
                rooms.getOpponentId(data.roomid, data.playerid, function (oppid) {
                    if (oppid && clients[oppid]) {
                        clients[oppid].emit('opp_win_word', {word: data.word, score: data.score});
                    }
                });
            }
        });
    });

    socket.on('ask_replay', function (data) {
        rooms.askReplay(data.roomid, data.playerid);
    });

    socket.on('disconnect', function () {
        console.log('Client Disconnected.');
    });
});

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////
app.all('/', function (req, res) {
    var requestids = [];
    if (req.param('request_ids')) {
        requestids = req.param('request_ids');
        requestids = requestids.split(',');
    }
    res.render('index.jade', {
        title: 'Play FIXME',
        description: 'FIXME: Your Page Description',
        author: 'Maxime Biais',
        requestids: JSON.stringify(requestids),
        analyticssiteid: 'FIXME: XXXXXXX'
    });
});

app.post('/delete-all-invitations', function (req, res) {
    rooms.deleteInvitation(req.body.roomid, req.body.inviter, req.body.playerid);
    res.send(200);
});

app.post('/delete-invitation', function (req, res) {
    rooms.deleteInvitation(req.body.roomid, req.body.inviter, req.body.playerid);
    res.send(200);
});

app.post('/newgame/random/:playerid', function (req, res) {
    rooms.newRandomGameOrConnect(function (roomid) {
        console.log('new roomid: ' + roomid);
        res.json({roomid: roomid});
    });
});

app.post('/newgame/:playerid/:oppid', function (req, res) {
    var newRoomId = rooms.newRandomRoomId();
    rooms.associateRoomToInviterAndInvitee(newRoomId, req.params.playerid, req.params.oppid);
    res.json({roomid: newRoomId});
});

app.post('/invited-games', function (req, res) {
    rooms.getInvitedGamesFor(req.body.playerid, function (games) {
        console.log('games: ' + JSON.stringify(games));
        res.json(games);
    });
});

app.get('/game/:roomid', function (req, res) {
    res.render('game.jade', {
        title: 'New Game',
        description: 'FIXME: Your Page Description',
        author: 'Maxime Biais',
        roomid: req.params.roomid,
        analyticssiteid: 'FIXME: XXXXXXX'
    });
});

app.post('/associate', function (req, res) {
    if (req.body.request_id && req.body.roomid) {
        console.log('associate requestid=' + req.body.request_id + ' with roomid=' + req.body.roomid);
        // FIXME: set a zset with a date
        db.hmset('requestid:' + req.body.request_id, req.body);
    }
    res.send(200);
});

app.get('/facebook-login', function (req, res) {
    res.render('facebook-login.jade', {
        title: 'New Game',
        description: 'FIXME: Your Page Description',
        author: 'Maxime Biais',
        analyticssiteid: 'FIXME: XXXXXXX'
    });
});

app.post('/stats', function (req, res) {
//    Sample data: {
//        "updated_time": "2012-11-27T16:57:33+0000",
//        "verified": "true",
//        "locale": "en_US",
//        "id": "684491308",
//        "name": "Maxime Biais",
//        "first_name": "Maxime",
//        "last_name": "Biais",
//        "link": "https://www.facebook.com/maxime.biais",
//        "username": "maxime.biais",
//        "gender": "male",
//        "timezone": "1"
    // Store in redis DB
    if (req.body.id) {
        req.body.last_seen = JSON.stringify(new Date()).replace(/"/g, '');
        db.hmset('user:' + req.body.id, req.body);
    }
    res.send(200);
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('/*', function (req, res) {
    throw new NotFound;
});

function NotFound(msg) {
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

console.log('Listening on https://localhost:' + (port + 1));
