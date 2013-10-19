'use strict';

// GLOBAL
var leaderboard = new LeaderBoard();
var statspage = new StatsPage();

var loginError = function (response) {
    console.log('login error: ' + response.status);
    window.location = '/facebook/error';
};

function mainmenu_show() {
    $('#main').show();
    $('#leaderboard').hide();
    $('#stats').hide();
    $('#help').hide();
}

function help_show() {
    $('#main').hide();
    $('#leaderboard').hide();
    $('#stats').hide();
    $('#help').show();
}

var secondStepInit = function () {
    // Bind buttons and events

    // Bind the event.
    $(window).on('hashchange', function() {
        var params = $.bbq.getState();
        switch (params.page) {
            case 'leaderboard':
                leaderboard.show(params);
                break ;
            case 'stats':
                statspage.show(params);
                break ;
            case 'help':
                help_show(params);
                break ;
            default:
                mainmenu_show(params);
                break ;
        }
    });

    var soundmanager = new SoundManager();
    console.log('call soundmanager load');
    soundmanager.loadSounds(thirdStepInit);

    $('a').bind('mouseup', function () {
        soundmanager.play('click');
    });
};

var thirdStepInit = function () {
    $('#game-with-friend').bind('mouseup', function () {
        $('#modalLabel').text('Play with one of your online friend');
        $('#modalmessage').html($('#online-friends').html());
        $('#invitations').modal({show: true});
        $('.ofriend').click(function () {
            sendPlayRequestTo(this.id.replace('play', ''));
        });
    });

    // ready to show main and hide loading
    $('#loading').hide();
    $('#main').show();
    $(window).hashchange();

    function deleteInvitation(roomid, inviterid, playerid) {
        function endCB () {
            window.location = '/game/' + roomid;
        }
        $('#btn' + roomid).click(function () {
            $.ajax({
                type: "POST",
                data: {roomid: roomid, inviterid: inviterid, playerid: playerid},
                url: '/delete-invitation',
                success: endCB,
                error: endCB
            });
        });
    }


    function createFriendEntry(friend, id, pic, newline) {
        var img = '';
        if (pic) {
            img = '<img src="' + friend.pic_square + '"/>';
        }
        if (newline) {
            $(id + ' tbody').append('<tr>');
        }
        $(id + ' tbody tr:last').append(
            '<td style="width: 33%;"><a id="play' + friend.uid + '" href="#" class="ofriend">' + img +
            friend.name +
            '</a></td>');
    }
};

secondStepInit();
