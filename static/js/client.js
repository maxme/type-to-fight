'use strict';
/* Author: Maxime Biais */

var myFB = null;
var playerid = null;
var soundmanager = null;

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
    $('#play-input').bind('paste', function () {
        return false;
    });
    // ready to show main and hide loading
    $('#loading').hide();
    $('#main').show();

    // Show modal
    smodalmessage.html('Connecting...');
    $('#modal').html($('#modal-start')[0].children);
    $('#modal').modal({keyboard: false, backdrop: 'static'});
    $('#inputurl').val(window.location.href);
    splayinput.focus();

    // Graphics
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }
    var gameGraphics = new GameGraphics(document.getElementById('divcanvas'), $('#divcanvas').width(), 207);
    $('#play-input').on('keydown',function () {
        gameGraphics.keydown();
    }).on('keyup', function () {
        soundmanager.playRandomVoice();
        gameGraphics.keyup();
    });

    var common = new Common();
    var gameManager = new GameManager(30);
    var gameStats = new GameStats();
    var gamePlay = new GamePlay(gameStats, gameGraphics);
    gamePlay.winword_cb = winword_cb;
    gamePlay.endgame_cb = endgame_cb;
    var socket = io.connect(url, {secure: true});
    var mainTimer;
    var oppid;


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

    function updatePlayerNames(opp_id) {
        if (roomid == 'practice') {
            $('#lifebar-name-right').text('John Bot');
            myFB.getOtherUserInfos(playerid, function (userdata) {
                $('.lifebar-name-left').text(userdata.name);
            });
        } else {
            myFB.getOtherUserInfos(opp_id, function (userdata) {
                $('.lifebar-name-right').text(userdata.name);
            });
            myFB.getOtherUserInfos(playerid, function (userdata) {
                $('.lifebar-name-left').text(userdata.name);
            });
        }
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

    function realEndGame(data) {
        gameManager.setGameState(4);
        clearTimeout(mainTimer);
        sgametimer.html('');
        var victory = 0;
        // FIXME: move this to gamestats.js or endgame.js
        // Win and lose message
        if (roomid !== 'practice') {
            data.ratings.you = data.you;
            data.ratings.opp = data.opp;
        }

        $('#modalmessage2').html('');
        gamePlay.setPlayerLife(data.scores[data.you]);
        gamePlay.setOppLife(data.scores[data.opp]);
        if (data.scores[data.you] === data.scores[data.opp]) {
            $('#modalLabel2').html('Draw !');
            victory = 1;
        } else {
            if (data.scores[data.you] > data.scores[data.opp]) {
                $('#modalLabel2').html('You win :)');
                victory = 1;
            } else {
                $('#modalLabel2').html('You lose :(');
            }
        }

        // Statistics
        var table = gameStats.createTable();
        $('#modalstats').html(table);

        // gameStats
        gameStats.endGame(victory, roomid, (data && data.ratings) || null);

        // Show modal
        $('#play-input').attr('disabled', true);
        $('#modal-start').html($('#modal').html());
        $('#modal-endgame-message').hide();
        $('#modal').html($('#modal-end').html());
        $('#modal').modal({show: true, keyboard: false, backdrop: 'static'});
    }

    function oppAskReplay(data) {
        function disableReplay() {
            $('#replay-button').addClass('disabled');
            $('#modal-endgame-message').removeClass('alert-success').addClass('alert-error');
            $('#modal-endgame-message').text('You\'re opponent disconnected, you can\'t replay this game');
        }

        if (data.error === 1) {
            disableReplay();
        } else {
            if (roomid === data.roomid) {
                $('#modal-endgame-message').removeClass('alert-error').addClass('alert-success');
                $('#modal-endgame-message').text('You\'re opponent want to replay !');
            } else {
                disableReplay();
            }
        }
        $('#modal-endgame-message').show();
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
        log('connection_ok=', data);
        if (data.error === 3) {
            smodalmessage.html('Something gone wrong, I can\'t connect you to this game session');
            $('#modalfooter').show();
        } else {
            smodalmessage.html('Waiting for your opponent to connect.');
            runTimer(30, function () {}, function () {
                if (gameManager.gameState !== 2) {
                    smodalmessage.html('You\'re so patient, and your opponent is so slow...');
                    $('#modalfooter').show();
                }
            });
        }
        gameManager.setGameState(1);
    });

    socket.on('game_start', function (data) {
        log('game_start', data);
        $('#modal').modal('hide');
        $('.countdown-container').fadeIn(300);
        gamePlay.setAllWords(data.words);
        splayinput.focus();
        gameManager.setGameState(2);
        oppid = data.player1;
        if (oppid === playerid) {
            oppid = data.player2;
        }
        updatePlayerNames(oppid);
        runTimer(common.GAME_COUNTDOWN - 1, function (remainingSeconds) {
            var text = remainingSeconds;
            soundmanager.play('countdown-beep');
            if (remainingSeconds === 0) {
                text = 'GO !';
                soundmanager.play('gamestart', 1000);
            }
            scountdown.html(text);
        }, startGame);
    });

    socket.on('opp_win_word', function (data) {
        log('opp_win_word=', data);
        gamePlay.oppWinWord(data.word);
    });

    socket.on('opp_ask_replay', function (data) {
        oppAskReplay(data);
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
        socket.emit('ask_replay', {roomid: roomid, playerid: playerid, oppid: oppid});
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
        var lastTime = (new Date()).getTime();
        var botTick = function () {
            var diffTime = (new Date()).getTime() - lastTime;
            if (gameManager.gameState === 3) {
                gamePlay.practiceBotTick(diffTime / 1000.);
            }
            lastTime = (new Date()).getTime();
            setTimeout(botTick, 100);
        };
        botTick();
    }

    // Send "connection" msg
    socket.emit('connection', {lang: "french", roomid: roomid, playerid: playerid});
};

var gameInit2 = function () {
    myFB.getUserInfos(function (response) {
        playerid = response.id;

        // load sounds
        soundmanager = new SoundManager();
        soundmanager.loadSounds(ready);
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
