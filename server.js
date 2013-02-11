var _ = require('underscore')._;
var fs = require('fs');

//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081);

//Setup Express
var server = express.createServer();
server.configure(function () {
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhecrethhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

//setup the errors
server.error(function (err, req, res, next) {
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: {
            title: '404 - Not Found', description: '', author: '', analyticssiteid: 'XXXXXXX'
        }, status: 404 });
    } else {
        res.render('500.jade', { locals: {
            title: 'The Server Encountered an Error', description: '', author: '', analyticssiteid: 'XXXXXXX', error: err
        }, status: 500 });
    }
});
server.listen(port);

//Setup Socket.IO
var io = io.listen(server);
var clients = {};
var games = {};
var words = {};

function initWordList() {
    // words['english'] = ["hello", "world", "parking", "code", "you"];
    // words['english'] = ["hello", "world"];

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

server.get('/', function (req, res) {
    res.render('index.jade', {
        locals: {
            title: 'Play FIXME',
            description: 'FIXME: Your Page Description',
            author: 'Maxime Biais',
            analyticssiteid: 'FIXME: XXXXXXX'
        }
    });
});

server.get('/game', function (req, res) {
    res.render('game.jade', {
        locals: {
            title: 'New Game',
            description: 'FIXME: Your Page Description',
            author: 'Maxime Biais',
            analyticssiteid: 'FIXME: XXXXXXX'
        }
    });
});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function (req, res) {
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function (req, res) {
    throw new NotFound;
});

function NotFound(msg) {
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

console.log('Listening on http://0.0.0.0:' + port);
