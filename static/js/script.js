'use strict';
/* Author: Maxime Biais */

function log(message, obj) {
    var tmp = '';
    if (obj) {
        tmp = JSON.stringify(obj);
    }
    $("#logs").after(message + ' ' + tmp + '<br/>');
}

var ready;
ready = function () {
    // The URL of your web server (the port is set in app.js)
    var url = 'http://localhost:8081';

    var doc, canvas, played, instructions, ctx;
    doc = $(document);
    canvas = $('#canvas');
    played = $('#played');
    ctx = $('canvas')[0].getContext('2d');
    instructions = $('#instructions');

    var clients = {};
    //var players = {};
    var gameState = 0; // 0: init, 1: connected, 2: game will start, 3: playing, 4: game ended
    var socket = io.connect(url);
    var id = 0, oppid = 0, gameid = 0;
    var words = [];
    var displayedWords = [];


    // This demo depends on the canvas element
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }

    function init() {
        drawLine(0, 200, 800, 200);
        for (var i = 0; i < 50; i++) {
            if (i % 2 === 0) {
                drawLine(640, i * 10, 640, i * 10 + 10);
            }
        }
    }

    function drawLine(fromx, fromy, tox, toy){
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
    }

    function runTimer(seconds, update, endcb) {
        var remainingSeconds = seconds;
        update(remainingSeconds);
        function timerTick() {
            remainingSeconds -= 1;
            if (remainingSeconds === -1) {
                endcb();
            } else {
                update(remainingSeconds);
                setTimeout(timerTick, 1000);
            }
        }
        setTimeout(timerTick, 1000);
    }

    function displayNewWord(word) {
        var wordObj = {
            'elt': $('<span class="word">' + word + '</span>'),
            'speed': 10,
            'xpos': -20
        };
        wordObj.elt.appendTo('#words');
        displayedWords.push(wordObj);
    }

    function playKeyPressed(c) {

    }

    function endGame() {

    }

    function startGame() {
        $("#timer").hide(300);
        socket.emit("start", {"gameid": gameid});
        gameState = 3;
        displayNewWord(words[0]);
        runTimer(60, function (remainingSeconds) {
            $('#gametimer').html(remainingSeconds);
        }, endGame);
    }

    function update(timedelta) {
        // Move words
        for (var i = 0; i < displayedWords.length; ++i) {
            var word = displayedWords[i];
            word.xpos += word.speed * timedelta;
            word.elt.css({'left': word.xpos + "px"});
        }
    }

    function draw() {
        // Do Nothing atm
    }

    socket.on('connection_ok', function (data) {
        id = data.id;
        gameState = 1;
        log('connection ok=', data);
    });

    socket.on('game_start', function (data) {
        oppid = data.oppid;
        words = data.words;
        gameid = data.gameid;
        gameState = 2;
        log('game start=', data);
        runTimer(2, function (remainingSeconds) {
            var text = remainingSeconds;
            if (remainingSeconds === 0) {
                text = 'GO !';
            }
            $('#timer').html(text);
        }, startGame);
    });

    doc.on('keypress', function (event) {
        if (gameState === 3) {
            var c = String.fromCharCode(event.which);
            playKeyPressed(c);
        }
    });

    /*
     socket.on('msgkeypress', function (data) {
     console.log("msg-keypress received");
     if (!(data.id in clients)) {
     // a new user has come online. create a new li
     players[data.id] = $('<li id="p' + data.id+ '">player: ' + data.id + ': </li>').appendTo('#players');
     console.log("new client=" + data.id);
     }
     $('<span>'+data.keychar+'</span>').appendTo('#p' + data.id);
     // players[data.id].insertBefore(data.keychar, players[data.id]);
     // Saving the current client state
     clients[data.id] = data;
     clients[data.id].updated = $.now();
     });

     var lastEmit = $.now();

     doc.on('keypress', function (event) {
     //        if ($.now() - lastEmit > 1) {
     var c = String.fromCharCode(event.which);
     socket.emit('msgkeypress', {
     'id': id,
     'keychar': c
     });
     lastEmit = $.now();
     $('<span>' + c + '</span>').appendTo('#played');
     //        }
     });

     */
    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function () {
        // FIXME
    }, 60000);

    function gameLoop(targetFPS, update) {
        var a = 0;
        var delay = (1000 / targetFPS);
        var now, before = new Date();

        setInterval(function() {
            now = new Date();
            var elapsedTime = (now.getTime() - before.getTime());
            update(elapsedTime / 1000);
            before = new Date();
        }, delay);
    }

    gameLoop(60, function (timedelta, n) {
        update(timedelta);
        draw();
    });

    socket.emit('connection', {lang: "french"});
    init();
};

$(document).ready(function () {
    ready();
});