"use strict";

var LeaderBoard = (function () {
    function LeaderBoard() {
    }

    LeaderBoard.prototype.show = function () {
        $('#main').hide();
        $('#leaderboard').show();
    };

    LeaderBoard.prototype.hide = function () {
        // hide mainmenu

        // show leader

    };

    return LeaderBoard;
})();

if (typeof(module) !== 'undefined') {
    module.exports = LeaderBoard;
}