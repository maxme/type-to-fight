"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 10;
        this.GAME_COUNTDOWN = 3;
        this.MAX_WORD_LIST = 60;
    }

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
