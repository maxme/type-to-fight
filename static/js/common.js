"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 60;
        this.GAME_COUNTDOWN = 3;
        this.MAX_WORD_LIST = 20;
    }

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
