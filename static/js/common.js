"use strict";

var Common = (function () {
    function Common() {
        this.GAME_TIME_S = 60;
        this.GAME_COUNTDOWN = 3;
        this.MAX_WORD_LIST = 60;
        this.COSTUME_STYLES = ["afro", "base", "bald", "stache", "duce", "girl", "punk", "beard", "french", "chinese",
            "english"];
        this.MAX_BACKGROUNDS = 44;
    }

    Common.prototype.createRandomStyle = function () {
        function randomRange(lower, upper) {
            return Math.floor(Math.random() * (upper - lower + 1)) + lower;
        }
        var res = [0,0,0,0,0,0,0];
        // Character
        for (var i = 0; i < 6; ++i) {
            res[i] = randomRange(0, this.COSTUME_STYLES.length-1);
        }

        // Background
        res[6] = randomRange(0, this.MAX_BACKGROUNDS - 1);

        // Background elements
        // FIXME
        return res.join(',');
    };

    return Common;
})();

if (typeof(module) !== 'undefined') {
    module.exports = Common;
}
