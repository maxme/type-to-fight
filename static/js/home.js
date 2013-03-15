'use strict';

// GLOBAL
var myFB = null;

// Menu init method called after FB init
var menuInit = function () {
    var myLogin = function () {
        var scope = {scope: 'email,publish_actions,friends_online_presence'};
        myFB.login(scope, secondStepInit, loginError);
    };
    myFB = new FBUtils({appid: (new Local()).FB_APP_ID}, function () {
        console.log('user seems logged in facebook');
    });
    myFB.getLoginStatus(function () {
        console.log('user is logged in facebook');
        secondStepInit();
    }, myLogin, myLogin);
};

var loginError = function (response) {
    console.log('login error: ' + response.status);
    window.location = '/facebook/error';
};

var secondStepInit = function () {
    console.log('2nd step');
    window.location = '/facebook/login';
};
