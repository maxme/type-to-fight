//"use strict";

// my libs
var RoomManager = require('./static/js/roommanager.js');
var ServerStats = require('./static/js/serverstats.js');
var Common = require('./static/js/common.js');
var local = new (require('./static/js/local.js'))();
// libs
var fs = require('fs');
var connect = require('connect');
var express = require('express');
var sio = require('socket.io');
var http = require('http');
var redis = require('redis');
var port = (process.env.PORT || 8082);

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
    app.use(connect.static(__dirname + '/static'));
    // app.use(express.logger());
    app.use(connect.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: local.MY_SECRET }));
    app.use(app.router);
};

var app = express();
app.configure(expressConfigure);

function randomRange(lower, upper) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function stringifyObj(obj) {
    var mop = {};
    for (var i in obj) {
        mop[i] = '' + obj[i];
    }
    return mop;
}

//setup the errors
app.use(function (err, req, res, next) {
    if (err instanceof NotFound) {
        res.status(404);
        res.render('404.jade', {
            title: '404 - Not Found',
            description: '',
            author: ''
        });
    } else {
        res.status(500);
        res.render('500.jade', {
            title: 'The Server Encountered an Error',
            description: '',
            error: err.stack
        });
    }
});

// https
var serverHttp = http.createServer(app);
serverHttp.listen(port);

// Setup Socket.IO
var io = sio.listen(serverHttp);
var clients = {};
var serverstats = new ServerStats(db);
var rooms = new RoomManager(clients, db, serverstats);
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

function getUserInfos(playerid) {
    last_seen = JSON.stringify(new Date()).replace(/"/g, ''); // FIXME: unused
    user = {id: playerid, stylecode: 0, last_seen: last_seen};
    db.hget('user:' + user.id, 'stylecode', function (err, stylecode) {
        if (!err && stylecode) {
            user.stylecode = stylecode;
            db.hmset('user:' + user.id, stringifyObj(user));
        } else {
            user.stylecode = common.createRandomStyle();
            db.hmset('user:' + user.id, stringifyObj(user));
        }
    });
    return user;
}

io.sockets.on('connection', function (socket) {

    socket.on('connection', function (data) {
        data.socket_id = socket.id;
        data.error = 0;
        clients[data.playerid] = socket;
        data.user = getUserInfos(data.playerid);
        if (data.roomid === 'practice') {
            rooms.emitPracticeStart(data.playerid, function () {
                socket.emit('connection_ok', data);
            });
        } else {
            rooms.connectUserToGame(data.roomid, data.playerid, function (err) {
                if (err) {
                    data.error = err;
                }
                socket.emit('connection_ok', data);
            });
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
                rooms.playerWinWord(data.roomid, data.playerid, data.word, function (err, obj) {
                    if (err === null) {
                        if (obj.score === 0) {
                            rooms.endGame(data.roomid);
                        }
                    }
                });
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
        rooms.askReplay(data.roomid, data.playerid, data.oppid);
    });

    socket.on('disconnect', function () {
        console.log('Client Disconnected.');
    });
});

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

app.all('/home', function (req, res) {
    res.render('home.jade', {
        title: 'Type To Fight',
        description: 'Type To Fight - Web Game to test your typing skills',
        author: 'Maxime Biais'
    });
});

app.all('/', function (req, res) {
    var requestids = [];
    if (req.param('request_ids')) {
        requestids = req.param('request_ids');
        requestids = requestids.split(',');
    }
    res.render('index.jade', {
        title: 'Type To Fight',
        description: 'Type To Fight - Web Game to test your typing skills',
        author: 'Maxime Biais',
        requestids: JSON.stringify(requestids)
    });
});

app.post('/endgame', function (req, res) {
    process.nextTick(function () {
        if (req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id) {
            var userid = req.session.passport.user.id;
            serverstats.updateStats(userid, req.param('roomid'), {
                words: req.param('words', 0),
                nkeypressed: req.param('nkeypressed', 0),
                nkeyerror: req.param('nkeyerror', 0),
                speed: req.param('speed', 100),
                accuracy: req.param('accuracy', 50),
                victory: req.param('victory', 0)
            }, function (err, stats) {
                res.json(stats);
            });
        }
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

app.all('/stats/json', function (req, res) {
    if (req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id) {
        userid = req.session.passport.user.id;
        serverstats.getFullStats(userid, function (err, fullstats) {
            res.json(fullstats);
        });
    } else {
        res.json({});
    }
});

app.all('/leaderboard', function (req, res) {
    var userid = null;
    var type = req.param('type') || 'all';
    var page = parseInt(req.param('page')) || 0;
    var ids = req.param('ids') || [];
    var size = 20;
    //userid = req.param('userid');
    if (req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id) {
        userid = req.session.passport.user.id;
    } else {
        // Force type
        type = 'all';
        page = 0;
    }
    serverstats.getLeaderboard(userid, type, page, size, ids, function (leaderboarddata) {
        // console.log('userid: ' + userid + ' type: ' + type + ' page: ' + page + ' body: ' + JSON.stringify(req.body) + ' query: ' + JSON.stringify(req.query) + ' params: ' + JSON.stringify(req.params));
        res.json(leaderboarddata);
    });
});

app.all('/stats/history/rating', function (req, res) {
    if (req.session && req.session.passport && req.session.passport.user && req.session.passport.user.id) {
        var userid = req.session.passport.user.id;
        serverstats.getRatingHistory(userid, function (err, data) {
            res.json(data);
        })
    } else {
        res.send(400);
    }
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
        res.json(games);
    });
});

app.get('/test', function (req, res) {
    res.render('test.jade', {
        title: 'Type To Fight',
        description: 'Type To Fight - Web Game to test your typing skills',
        author: 'Maxime Biais',
        roomid: req.params.roomid
    });
});

app.get('/game/:roomid',  function (req, res) {
    res.render('game.jade', {
        title: 'Type To Fight',
        description: 'Type To Fight - Web Game to test your typing skills',
        author: 'Maxime Biais',
        roomid: req.params.roomid
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

//The 404 Route (ALWAYS Keep this as the last route)
app.get('/*', function (req, res) {
    throw new NotFound;
});

function NotFound(msg) {
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

console.log('Listening on http://localhost:' + port);
