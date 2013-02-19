"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 15;
    }

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
