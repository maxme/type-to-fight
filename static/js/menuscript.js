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

var loginError = function (response) {
    console.log('login error: ' + response.status);
    window.location = '/facebook-login';
};

var secondStepInit = function () {
    // Bind buttons
    $('#invite-friends').click(function () {
        myFB.requestMultiFriendSelector('invites you to play', function () {
            console.log('friends selected');
        });
    });

    $('#game-with-friend').click(function () {
        $('#online-friends').toggle(400);
    });

    $('#game-with-random').click(function () {
        myFB.getUserInfos(function (response) {
            $.ajax({
                type: "POST",
                url: '/newgame/random/' + response.id,
                success: function (data) {
                    window.location = '/game/' + data.roomid;
                }
            });
        });
    });

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

    function checkRecentInvitation() {
        myFB.getUserInfos(function (response) {
            $.ajax({
                type: "POST",
                data: {playerid: response.id},
                url: '/invited-games',
                success: function (data) {
                    data = data.sort(function(a, b) { return parseFloat(a.time_delta) - parseFloat(b.time_delta);});
                    if (data.length !== 0) {
                        var uidSet = {};
                        for (var i = 0; i < data.length && i < 5; ++i) {
                            uidSet[data[i].inviter] = 1;
                            $('<tr><td><span class="uid' + data[i].inviter + '"></span> invited you '
                                + data[i].time_delta
                                + ' seconds ago</td><td><a href="#" class="btn" id="btn' + data[i].roomid
                                + '">Join</a></td></tr>').appendTo('#modalmessage');
                            deleteInvitation(data[i].roomid, data[i].inviter, response.id);
                        }
                        // Fetch name for uids
                        for (var uid in uidSet) {
                            myFB.getOtherUserInfos(uid, function (userdata) {
                                $('.uid' + userdata.id).text(userdata.name);
                            });
                        }
                        $('#invitations').modal({show: true});
                    }
                }
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

    // Send a play request to user: uid
    function sendPlayRequestTo(uid) {
        myFB.getUserInfos(function (response) {
            $.ajax({
                type: "POST",
                url: '/newgame/' + response.id + '/' + uid,
                success: function (data) {
                    console.log('new game response=' + JSON.stringify(data));
                    myFB.request('started a game with you! Join him', uid,
                        {roomid: data.roomid},
                        function (reqres) {
                            if (reqres) { // request has been send
                                myFB.getUserInfos(function (user_infos) {
                                    var senderid = user_infos.id;
                                    $.ajax({
                                        type: "POST",
                                        url: '/associate',
                                        data: {
                                            request_id: reqres.request,
                                            roomid: data.roomid,
                                            to: reqres.to[0],
                                            senderid: senderid
                                        },
                                        success: function () {
                                            window.location = '/game/' + data.roomid;
                                        }
                                    });
                                });

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
