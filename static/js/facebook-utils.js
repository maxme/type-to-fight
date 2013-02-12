"use strict";

var myFB = null; // GLOBAL

var FBUtils = (function () {
    function FBUtils(params) {
        this.appId = params.appid;
        FB.init({
            appId      : params.appid, // App ID from the App Dashboard
            channelUrl : '/channel.html', // Channel File for x-domain communication
            status     : true, // check the login status upon init?
            cookie     : true, // set sessions cookies to allow your server to access the session?
            xfbml      : true  // parse XFBML tags on this page?
        });
    };

    FBUtils.prototype.login = function (ok, failed) {
        FB.login(function(response) {
            if (response.authResponse) {
                (ok !== undefined) && ok(response);
            } else {
                (failed !== undefined) && failed(response);
            }
        });
    };

    FBUtils.prototype.getLoginStatus = function (connected, notauth, notlogged) {
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                (connected !== undefined) && connected(response);
            } else if (response.status === 'not_authorized') {
                (notauth !== undefined) && notauth(response);
            } else {
                (notlogged !== undefined) && notlogged(response);
            }
        });
    }

    FBUtils.prototype.request = function (message, recipient, cb) {
        FB.ui({method: 'apprequests',
            message: message,
            to: recipient
        }, cb);
    };

    FBUtils.prototype.requestMultiFriendSelector = function (message, cb) {
        FB.ui({method: 'apprequests',
            message: message
        }, cb);
    };



    return FBUtils;
})();


// Load the SDK's source Asynchronously
// Note that the debug version is being actively developed and might
// contain some type checks that are overly strict.
// Please report such bugs using the bugs tool.
(function(d, debug){
    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement('script'); js.id = id; js.async = true;
    js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
    ref.parentNode.insertBefore(js, ref);
}(document, /*debug*/ false));

window.fbAsyncInit = function() {
    myFB = new FBUtils({appid: 217004898437675});
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
    }, function () {myFB.login();}, function () {myFB.login();});
};
