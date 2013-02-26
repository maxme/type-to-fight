"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 60;
        this.GAME_COUNTDOWN = 1;
        this.MAX_WORD_LIST = 60;
    }

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
