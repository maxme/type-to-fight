'use strict';
/* Author: Maxime Biais */

var myFB = null;
var playerid = null;

function log(message, obj) {
    var tmp = '';
    if (obj) {
        tmp = JSON.stringify(obj);
    }
    $("#logs").append(message + ' ' + tmp + '<br/>');
}

var ready = function () {
    var url = 'https://' + window.location.host;

    var doc, splayinput, sgametimer, scountdown, smodalmessage;
    splayinput = $('#play-input');
    scountdown = $('.countdown');
    sgametimer = $('#gametimer');
    smodalmessage = $('#modalmessage');

    // Show modal
    smodalmessage.html('Connecting...');
    $('#modal').html($('#modal-start')[0].children);
    $('#modal').modal({keyboard: false, backdrop: 'static'}).css('top', '25%');
    $('#inputurl').val(window.location.href);
    splayinput.focus();

    var common = new Common();
    var gameManager = new GameManager(30);
    var gameStats = new GameStats();
    var gamePlay = new GamePlay(gameStats, gameManager);
    gamePlay.winword_cb = winword_cb;
    gamePlay.endgame_cb = endgame_cb;
    var socket = io.connect(url, {secure: true});
    var oppid = 0;
    var mainTimer;

    // Graphics
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }
    var gg = new GameGraphics(document.getElementById('divcanvas'), $('#divcanvas').width(), 200);
    $('#play-input').on('keydown', function () {
        gg.keydown();
    }).on('keyup', function () {
        gg.keyup();
    });

    // Timer define
    function runTimer(seconds, update, endcb) {
        var remainingSeconds = seconds;
        update(remainingSeconds);
        function timerTick() {
            remainingSeconds -= 1;
            if (remainingSeconds === -1) {
                endcb();
            } else {
                update(remainingSeconds);
                mainTimer = setTimeout(timerTick, 1000);
            }
        }
        mainTimer = setTimeout(timerTick, 1000);
    }

    function startGame() {
        $('#play-input').removeAttr('disabled');
        $('.countdown-container').fadeOut(300);
        socket.emit("start", {"gameid": roomid});
        gameManager.setGameState(3);
        gamePlay.startGame();
        splayinput.focus();
        runTimer(common.GAME_TIME_S, function (remainingSeconds) {
            sgametimer.html(remainingSeconds);
        }, function () {
            if (roomid === 'practice') {
                realEndGame(gamePlay.getPractiseEndScores());
            } else {
                endGame();
            }
        });
    }

    function endGame() {
        console.log('endgame');
        socket.emit("ping", {roomid: roomid});
    }

    function createStatsTable() {
        var table = $('<table class="table table-bordered">');
        table.append('<thead>').children('thead')
            .append('<tr />').children('tr').append('<th>Words</th><th>Keys Pressed</th><th>Errors</th><th>Accuracy</th><th>Average Speed</th>');
        var tbody = table.append('<tbody />').children('tbody');
        tbody.append('<tr />').children('tr:last')
            .append('<td>' + gameStats.words + '</td>')
            .append('<td>' + gameStats.totalkeypressed + '</td>')
            .append('<td>' + gameStats.nbackspacepressed + '</td>')
            .append('<td>' + Math.floor(10000 * gameStats.accuracy) / 100 + '%</td>')
            .append('<td>' + gameStats.averageSpeed + ' keypress/min</td>');
        return table;
    }

    function realEndGame(data) {
        gameManager.setGameState(4);
        clearTimeout(mainTimer);
        sgametimer.html('');
        // Win and lose message
        if (data) {
            $('#modalmessage2').html('');
            gamePlay.setPlayerLife(data.scores[data.you]);
            gamePlay.setOppLife(data.scores[data.opp]);
            if (data.scores[data.you] === data.scores[data.opp]) {
                $('#modalLabel2').html('Draw !');
            } else {
                if (data.scores[data.you] > data.scores[data.opp]) {
                    $('#modalLabel2').html('You win :)');
                } else {
                    $('#modalLabel2').html('You lose :(');
                }
            }
        } else { // practice
            $('#modalmessage2').html('');
        }
        // Statistics
        var table = createStatsTable();
        $('#modalstats').html(table);

        // Show modal
        $('#play-input').attr('disabled', true);
        $('#modal-start').html($('#modal').html());
        $('#modal').html($('#modal-end').html());
        $('#modal').modal({show: true, keyboard: false, backdrop: 'static'});
    }

    function winword_cb(word) {
        socket.emit('win_word', {word: word, playerid: playerid, roomid: roomid});
    }

    function endgame_cb(data) {
        if (roomid !== 'practice')
            return;
        realEndGame(data);
    }

    /*
     *
     * BIND SOCKET MESSAGES
     *
     */

    socket.on('connection_ok', function (data) {
        gameManager.setGameState(1);
        smodalmessage.html('Waiting for your opponent to connect.');
        log('connection_ok=', data);
    });

    socket.on('game_start', function (data) {
        $('#modal').modal('hide');
        $('.countdown-container').fadeIn(300);
        oppid = data.oppid;
        gamePlay.setAllWords(data.words);
        splayinput.focus();
        gameManager.setGameState(2);
        log('game start=', data);
        runTimer(common.GAME_COUNTDOWN - 1, function (remainingSeconds) {
            var text = remainingSeconds;
            if (remainingSeconds === 0) {
                text = 'GO !';
            }
            scountdown.html(text);
        }, startGame);
    });

    socket.on('opp_win_word', function (data) {
        log('opp_win_word=', data);
        gamePlay.oppWinWord(data.word);
    });

    socket.on('game_end', function (data) {
        log('game_end=', data);
        realEndGame(data);
    });

    /*
     *
     * BIND BUTTON CLICKS
     *
     */

    $(document).on("click", "#replay-button", function () {
        $('#wordlist').hide(300, function () {
            $(this).html('').show();
        });
        socket.emit('ask_replay', {roomid: roomid, playerid: playerid});
        gameManager.setGameState(1);
        $('#play-input').val('');
        gamePlay.reset();
        $('#modal-end').html($('#modal').html());
        $('#modal').html($('#modal-start').html());
    });

    if (roomid !== 'practice') {
        // Init ping
        setTimeout(function () {
            var counter = 0;
            var ping = function () {
                counter += 1;
                socket.emit('ping', {roomid: roomid});
                if (counter <= 6) {
                    setTimeout(ping, 2000);
                }
            };
            ping();
        }, (common.GAME_TIME_S - 3) * 1000);
    } else {
        // Init bot
        var res = true;
        var dt = 0;
        var lastTime = (new Date()).getTime();
        var botTick = function () {
            if (res) {
                dt = (new Date()).getTime() - lastTime;
            } else {
                dt += (new Date()).getTime() - lastTime;
            }
            if (gameManager.gameState === 3) {
                lastTime = (new Date()).getTime();
                res = gamePlay.practiceBotTick(dt);
            }
            setTimeout(botTick, 1000);
        };
        botTick();
    }

    // Send "connection" msg
    socket.emit('connection', {lang: "french", roomid: roomid, playerid: playerid});
};

var gameInit2 = function () {
    myFB.getUserInfos(function (response) {
        $.ajax({
            type: "POST",
            url: "/stats",
            data: response,
            dataType: 'text'
        });
        playerid = response.id;
        ready();
    });
};

var gameInit = function () {
    var loginError = function (response) {
        console.log('login error: ' + response.status);
        window.location = '/facebook-login';
    };

    var myLogin = function () {
        var scope = {scope: 'email,publish_actions,friends_online_presence'};
        myFB.login(scope, gameInit2, loginError);

    };

    var loginCB = function (res) {
        console.log('user login status: ' + res.status);
    };

    myFB = new FBUtils({appid: (new Local()).FB_APP_ID}, loginCB);
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
        gameInit2();
    }, myLogin, myLogin);
};
