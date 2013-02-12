'use strict';
/* Author: Maxime Biais */

function log(message, obj) {
    var tmp = '';
    if (obj) {
        tmp = JSON.stringify(obj);
    }
    $("#logs").after(message + ' ' + tmp + '<br/>');
}

var ready = function () {
    // The URL of your web server (the port is set in app.js)
    var url = 'http://localhost:8082';

    var doc, splayed, sscore, sgametimer, stimer, sinstructions, skeytyped, serrors, saccuracy, savgspeed, ctx;
    doc = $(document);
    splayed = $('#played');
    sscore = $('#score');
    stimer = $('#timer');
    sgametimer = $('#gametimer');
    skeytyped = $('#keytyped');
    serrors = $('#errors');
    saccuracy = $('#accuracy');
    savgspeed = $('#avgspeed');
    ctx = $('canvas')[0].getContext('2d');
    sinstructions = $('#instructions');

    var gameManager = new GameManager(30);
    var gameStats = new GameStats();
    var socket = io.connect(url, {secure: true});
    var id = 0, oppid = 0, gameid = 0;
    var words = [];
    var userWords = [];
    var oppWords = [];
    var currentWord = '';
    var score = 0;

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

    function drawLine(fromx, fromy, tox, toy) {
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

    function removePWordFromLists(pword) {
        var index = -1;
        if (pword.your) {
            index = userWords.indexOf(pword);
            userWords.splice(index, 1);
        } else {
            index = oppWords.indexOf(pword);
            oppWords.splice(index, 1);
        }
        console.log("remove word=" + pword.word + ' - userWords.len=' + userWords.length + ' - oppWords.len=' + oppWords.length);
    }

    function winWord(pword) {
        score += pword.score;
        socket.emit('win_word', {word: pword.word, score: score, playerid: id});
        currentWord = '';
        removePWordFromLists(pword);
    }

    function displayNewWord(pword) {
        // Remove word from game list
        var word = pword.word;
        var index = words.indexOf(pword);
        words.splice(index, 1);

        // User
        var wordObj = new PlayedWord(word, true, winWord, removePWordFromLists);
        wordObj.elt.appendTo('#words');
        userWords.push(wordObj);

        // Opp
        var wordObj = new PlayedWord(word, false, removePWordFromLists, removePWordFromLists);
        wordObj.elt.appendTo('#words');
        oppWords.push(wordObj);
    }

    function endGame() {
        socket.emit("eng_game", {"gameid": gameid});
    }

    function startGame() {
        stimer.hide(300);
        socket.emit("start", {"gameid": gameid});
        gameManager.setGameState(3);
        runTimer(30, function (remainingSeconds) {
            sgametimer.html(remainingSeconds);
        }, endGame);
    }

    function addNewWords() {
        // FIXME: Delay it
        if (gameManager.gameState !== 3) {
            return;
        }
        for (var i = 0; i < words.length; ++i) {
            if (gameManager.time() > words[i].delay) {
                displayNewWord(words[i]);
            }
        }
    }

    function update(timedelta) {
        // Move words
        for (var i = 0; i < userWords.length; ++i) {
            userWords[i].update(timedelta);
        }
        for (var i = 0; i < oppWords.length; ++i) {
            oppWords[i].update(timedelta);
        }
        updatePlayingWord();
        updateScore();
        updateGameStats();
        addNewWords();
    }

    function draw() {
        // Do Nothing atm
    }

    // Bind Messages
    socket.on('connection_ok', function (data) {
        id = data.id;
        gameManager.setGameState(1);
        log('connection ok=', data);
    });

    socket.on('game_start', function (data) {
        oppid = data.oppid;
        words = data.words;
        gameid = data.gameid;
        gameManager.setGameState(2);
        log('game start=', data);
        runTimer(2, function (remainingSeconds) {
            var text = remainingSeconds;
            if (remainingSeconds === 0) {
                text = 'GO !';
            }
            stimer.html(text);
        }, startGame);
    });

    socket.on('opp_win_word', function (data) {
        var pword = null;
        // FIXME: do something with data.score
        for (var i = 0; i < oppWords.length; ++i) {
            if (oppWords[i].word === data.word) {
                pword = oppWords[i];
                break;
            }
        }
        pword.win();
    });

    function updateScore() {
        sscore.html(score);
    }

    function updatePlayingWord() {
        splayed.html(currentWord);
    }

    function updateGameStats() {
        gameStats.update();
        skeytyped.html(gameStats.nkeypressed);
        serrors.html(gameStats.nbackspacepressed);
        saccuracy.html(Math.floor(gameStats.accuracy * 10000) / 100);
        savgspeed.html(Math.floor(gameStats.averageSpeed * 100) / 100);
    }

    // Bind key press input
    function checkPressedWord() {
        for (var i = 0; i < userWords.length; ++i) {
            if (userWords[i].word === currentWord) {
                userWords[i].win();
                return true;
            }
        }
        return false;
    }

    function playKeyPressed(keyCode) {
        var res = true;
        if (keyCode === 8) { // BACKSPACE
            currentWord = currentWord.slice(0, currentWord.length - 1);
            gameStats.backspacepress();
            res = false;
        } else {
            // CHECK FOR ASCII /'0':48, '9': 57, 'a': 65, 'z': 90
            var w = event.which;
            if ((w >= 48 && w <= 57) || (w >= 65 && w <= 90)) {
                var c = String.fromCharCode(event.which);
                currentWord += c;
                currentWord = currentWord.toLowerCase();
                res = false;
                gameStats.keypress();
            }
        }
        if (res === false) {
            checkPressedWord();
        }
        return res;
    }

    doc.on('keydown', function (event) {
        if (gameManager.gameState === 3) {
            return playKeyPressed(event.which);
        }
        return true;
    });

    // Game Manager
    gameManager.gameLoop(function (timedelta, n) {
        update(timedelta);
        draw();
    });

    // Init canvas
    init();

    // Send "connection" msg
    socket.emit('connection', {lang: "french"});
};

var myFB = null;

var gameInit = function () {
    var myLogin = function () {
        var scope = {scope: 'email,publish_actions,friends_online_presence'};
        myFB.login(scope, secondStepInit, loginError);
    };

    myFB = new FBUtils({appid: 217004898437675});
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
    }, myLogin, myLogin);

    myFB.getUserInfos(function (response) {
        console.log("player uid=" + response.id);
        ready();
    });
};
