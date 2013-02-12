'use strict';

// GLOBAL
var myFB = null;
var menuInit;

// Menu init method called after FB init
menuInit = function () {
    var myLogin = function () {
        var scope = {scope: 'email,publish_actions,friends_online_presence'};
        myFB.login(scope, secondStepInit, loginError);
    };

    myFB = new FBUtils({appid: 217004898437675});
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
        secondStepInit();
    }, myLogin, myLogin);
};

var loginError = function () {
    // FIXME: show something
};

var secondStepInit = function () {
    // Bind buttons
    $('#invite-friends').click(function () {
        myFB.requestMultiFriendSelector('invites you to play', function () {
            console.log('friends selected');
        });
    });

    $('#game-with-friend').click(function () {
        console.log("show online friends");
        $('#online-friends').toggle(400);
    });

    myFB.getUserInfos(function (response) {
        // Send stats
        $.ajax({
            type: "POST",
            url: "/stats",
            data: response,
            dataType: 'text'
        });
    });

    function sendPlayRequestTo(uid) {
        // create new game room

        myFB.getUserInfos(function (response) {
            $.ajax({
                type: "POST",
                url: '/newgame/' + response.id + '/' + uid,
                success: function (data) {
                    myFB.request('started a game with you! Join him', uid,
                        {roomid: data.roomid},
                        function (reqres) {
                            if (reqres) {
                                // FIXME: send a new request to the server to associate reqres.request_id and roomid
                                window.location = '/game/' + data.roomid;
                            }
                        });
                }
            });
        });
    }

    function createFriendEntry(friend, id, pic) {
        var img = '';
        if (pic) {
            img = '<img src="' + friend.pic_square + '"/>';
        }
        $('<li>' +
            '<a id="play' + friend.uid + '" href="#">' + img +
            friend.name +
            '</a>' +
            '</li>').appendTo(id);
        $('#play' + friend.uid).click(function () {
            sendPlayRequestTo(this.id.replace('play', ''));
        });
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
            $('<li>Sorry, no online friends :(</li>').appendTo('#online-friends-ul');
        } else {
            for (var j = 0; j < online_friends.length; ++j) {
                createFriendEntry(online_friends[j], '#online-friends-ul', true);
            }
            for (var j = 0; j < idle_friends.length; ++j) {
                createFriendEntry(idle_friends[j], '#online-friends-ul', true);
            }
        }
    });
};
