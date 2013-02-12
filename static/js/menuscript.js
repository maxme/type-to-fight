'use strict';

var ready;
ready = function () {
    $('#invite-friends').click(function () {
        myFB.requestMultiFriendSelector('Try to beat me with your keyboard', function () {
            console.log('friends selected');
        });
    });
};

$(document).ready(function () {
    ready();
});