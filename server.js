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
    words['english'] = ["hello", "world", "parking", "code", "you"];
}

function getRandomWordSet(lang, size) {
    words[lang].sort( function() { return 0.5 - Math.random() } );
    return words[lang].slice(0, size);
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

io.sockets.on('connection', function (socket) {
    console.log('Client Connected: ' + socket.id);
    socket.on('connection', function (data) {
        data["id"] = socket.id;
        clients[socket.id] = {"socket": socket, "data": data};
        var game = findOrCreateAGame(socket.id);
        socket.emit('connection_ok', data);
        if (game["state"] == "ready") {
            socket.emit('game_start', game);
        }
    });

    socket.on('start', function (data) {
        // ok game started...
    });

    /*
    socket.on('message', function (data) {
        socket.broadcast.emit('server_message', data);
        socket.emit('server_message', data);
    });
    socket.on('msgkeypress', function (data) {
        socket.broadcast.emit('msgkeypress', data);
        socket.emit('msgkeypress', data);
    });
    */

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
            title: 'Your Page Title', description: 'Your Page Description', author: 'Your Name', analyticssiteid: 'XXXXXXX'
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
