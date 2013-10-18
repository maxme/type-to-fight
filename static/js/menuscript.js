'use strict';

// GLOBAL
var myFB = null;
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

    // because we are using our own invitation system
    function deleteFacebookInvitations() {
        myFB.getUserInfos(function (response) {
            myFB.deleteRequests(requestids, response.id);
        });
    }

    deleteFacebookInvitations();
    checkRecentInvitation();

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

    myFB.getFriendsWithOnlinePresence(function (response) {
        var online_friends = [];
        var idle_friends = [];
        var offline_friends = [];
        var res = response.data[0].fql_result_set;
        for (var i = 0; i < res.length; ++i) {
            var friend = res[i];
            if (friend.online_presence === "active") {
                online_friends.push(friend);
            } else {
                if (friend.online_presence === "idle") {
                    idle_friends.push(friend);
                } else {
                    offline_friends.push(friend);
                }
            }
        }

        // Add online friends
        if (online_friends.length === 0 && idle_friends.length === 0) {
            $('<tr><td>Sorry, no online friends :(</td></tr>').appendTo('#online-friends-ul');
        } else {
            $('#online-friends').html('<tbody></tbody>');
            for (var j = 0; j < online_friends.length; ++j) {
                createFriendEntry(online_friends[j], '#online-friends', true, j % 3 === 0);
            }
            /*
            for (var j = 0; j < idle_friends.length; ++j) {
                createFriendEntry(idle_friends[j], '#online-friends-ul', true);
            }
            */
        }
    });
};

secondStepInit();
