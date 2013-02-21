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
    var url = 'https://ssh.biais.org:8082';

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
    var socket = io.connect(url, {secure: true});
    var oppid = 0;

    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
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
                realEndGame();
            } else {
                endGame();
            }
        });
    }

    function endGame() {
        console.log('endgame');
        socket.emit("ping", {roomid: roomid});
    }

    function realEndGame() {
        $('#play-input').attr('disabled', true);
        $('#modal-start').html($('#modal').html());
        $('#modal').html($('#modal-end').html());
        $('#modal').modal({show: true, keyboard: false, backdrop: 'static'});
    }

    function winword_cb(word) {
        socket.emit('win_word', {word: word, playerid: playerid, roomid: roomid});
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
        realEndGame();
    });

    /*
     *
     * BIND BUTTON CLICKS
     *
     */

    $(document).on("click", "#replay-button", function () {
        $('#wordlist').hide(300, function(){
            $(this).html('').show();
        });
        socket.emit('ask_replay', {roomid: roomid, playerid: playerid});
        gameManager.setGameState(1);
        $('#play-input').val('');
        gamePlay.reset();
        $('#modal-end').html($('#modal').html());
        $('#modal').html($('#modal-start').html());
    });

    // Init ping
    if (roomid !== 'practice') {
        setTimeout(function() {
            var counter = 0;
            var ping = function() {
                counter += 1;
                socket.emit('ping', {roomid: roomid});
                if (counter <= 6) {
                    setTimeout(ping, 2000);
                }
            };
            ping();
        }, (common.GAME_TIME_S - 3) * 1000);
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
        console.log('login error: ' + response);
    };

    var myLogin = function () {
        var scope = {scope: 'email,publish_actions,friends_online_presence'};
        myFB.login(scope, gameInit2, loginError);
    };

    myFB = new FBUtils({appid: 217004898437675});
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
        gameInit2();
    }, myLogin, myLogin);
};
