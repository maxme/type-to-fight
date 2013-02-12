//"use strict";

var _ = require('underscore')._;
var fs = require('fs');

//setup Dependencies
var connect = require('connect'),
    express = require('express'),
    io = require('socket.io'),
    http = require('http'),
    https = require('https'),
    redis = require('redis'),
    port = (process.env.PORT || 8081);

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
            error: 'error...',
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
var io = io.listen(serverHttps);
var clients = {};
var games = {};
var words = {};

function initWordList() {
    fs.readFile('english-common-words.json', 'ascii', function (err, data) {
        if (err) {
            return console.log(err);
        }
        words = JSON.parse(data);
    });
}

function getRandomWordSet(lang, size) {
    words[lang].sort(function () {
        return 0.5 - Math.random()
    });
    var res = [];
    var tmpArray = words[lang].slice(0, size);
    for (var i = 0; i < size; ++i) {
        res.push({word: tmpArray[i % tmpArray.length], delay: _.random(i * 1000, i * 3000)});
    }
    // res = [ {word: "word1", delay: 0}, {word:"word2", delay:5000} ];
    return res;
}

initWordList();

function createRandomId() {
    var now = new Date().getTime();
    return Math.round(now * Math.random());
}

function findOrCreateAGame(playerId) {
    for (var game in games) {
        if (games[game]["player2"] == null && games[game]["player1"] != playerId) {
            games[game]["player2"] = playerId;
            games[game]["state"] = "ready";
            io.sockets.socket(games[game]["player1"]).emit('game_start', games[game]);
            return games[game];
        }
    }
    var gameid = createRandomId();
    games[gameid] = {"player1": playerId, "gameid": gameid};
    games[gameid]["words"] = getRandomWordSet("english", 10);
    games[gameid]["state"] = "waiting";
    return games[gameid];
}

function findOpponentFromGameId(gameid, playerid) {
    var game = games[gameid];
    if (game.player1 === playerid) {
        return game.player2;
    } else {
        return game.player1;
    }
}

function findOpponentFromPlayerId(playerid) {
    return findOpponentFromGameId(clients[playerid].gameid, playerid);
}

io.sockets.on('connection', function (socket) {
    console.log('Client Connected: ' + socket.id);
    socket.on('connection', function (data) {
        data["id"] = socket.id;
        var game = findOrCreateAGame(socket.id);
        clients[socket.id] = {"socket": socket, "data": data, 'gameid': game.gameid};
        socket.emit('connection_ok', data);
        if (game["state"] == "ready") {
            socket.emit('game_start', game);
        }
    });

    socket.on('start', function (data) {
        // ok game started...
    });

    socket.on('win_word', function (data) {
        var playerid = data.playerid;
        var oppid = findOpponentFromPlayerId(playerid);
        io.sockets.socket(oppid).emit('opp_win_word', {word: data.word, score: data.score});
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
    res.render('index.jade', {
        title: 'Play FIXME',
        description: 'FIXME: Your Page Description',
        author: 'Maxime Biais',
        analyticssiteid: 'FIXME: XXXXXXX'
    });
});

app.get('/friends', function(req, res) {
    if (req.facebook.token) {
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
            res.send('friends: ' + require('util').inspect(friends));
        });
    } else {
        console.log('user not logged in');
        req.facebook.app(function (app) {
            req.facebook.me(function (user) {
                res.send('req:' + req + ' -user:' + user);
            });
        });
    }
});

app.get('/signed_request', function(req, res) {
    res.send('Signed Request details: ' + require('util').inspect(req.facebook.signed_request));
});



app.get('/game', function (req, res) {
    res.render('game.jade', {
        title: 'New Game',
        description: 'FIXME: Your Page Description',
        author: 'Maxime Biais',
        analyticssiteid: 'FIXME: XXXXXXX'
    });
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

console.log('Listening on http://0.0.0.0:' + port);
