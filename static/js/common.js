"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 60;
        this.GAME_COUNTDOWN = 3;
        this.MAX_WORD_LIST = 60;
        this.COSTUME_STYLES = ["afro", "base", "bald", "stache", "duce", "girl", "punk", "beard", "french", "chinese"];
    }

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
