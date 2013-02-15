"use strict";

var FBUtils = (function () {
    function FBUtils(params) {
        this.userInfos = null;
        this.appId = params.appid;
        FB.init({
            appId: params.appid, // App ID from the App Dashboard
            channelUrl: '/channel.html', // Channel File for x-domain communication
            status: true, // check the login status upon init?
            cookie: true, // set sessions cookies to allow your server to access the session?
            frictionlessRequests: true,
            xfbml: true  // parse XFBML tags on this page?
        });
    };

    FBUtils.prototype.login = function (scope, ok, failed) {
        FB.login(function (response) {
            if (response.authResponse) {
                (ok !== undefined) && ok(response);
            } else {
                (failed !== undefined) && failed(response);
            }
        }, scope);
    };

    FBUtils.prototype.getLoginStatus = function (connected, notauth, notlogged) {
        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                (connected !== undefined) && connected(response);
            } else if (response.status === 'not_authorized') {
                (notauth !== undefined) && notauth(response);
            } else {
                (notlogged !== undefined) && notlogged(response);
            }
        });
    }

    FBUtils.prototype.request = function (message, recipient, data, cb) {
        FB.ui({method: 'apprequests',
            message: message,
            to: recipient,
            data: JSON.stringify(data)
        }, cb);
    };

    FBUtils.prototype.requestMultiFriendSelector = function (message, cb) {
        FB.ui({method: 'apprequests',
            message: message
        }, cb);
    };

    FBUtils.prototype.getOtherUserInfos = function (userid, ok) {
        FB.api('/' + userid, function (response) {
            (ok !== undefined) && ok(response);
        });
    };

    FBUtils.prototype.getUserInfos = function (ok) {
        if (this.userInfos === null) {
            FB.api('/me', function (response) {
                this.userInfos = response;
                (ok !== undefined) && ok(response);
            });
        } else {
            (ok !== undefined) && ok(this.userInfos);
        }
    };

    FBUtils.prototype.getFriendsWithOnlinePresence = function (cb) {
        this.fqlRequest({'online_friends': 'SELECT uid, name, pic_square, online_presence FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me());'}, cb);
    };

    FBUtils.prototype.fqlRequest = function (queries, cb) {
        FB.api('/fql', {q: queries}, cb);
    };

    return FBUtils;
})();

// Load the SDK's source Asynchronously
// Note that the debug version is being actively developed and might
// contain some type checks that are overly strict.
// Please report such bugs using the bugs tool.
(function (d, debug) {
    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement('script');
    js.id = id;
    js.async = true;
    js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
    ref.parentNode.insertBefore(js, ref);
}(document, /*debug*/ false));

window.fbAsyncInit = function () {
    if (typeof(menuInit) !== 'undefined')
        menuInit();
    if (typeof(gameInit) !== 'undefined')
        gameInit();
};
