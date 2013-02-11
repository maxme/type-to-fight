"use strict";

var GameManager = (function() {
    function GameManager(targetFPS) {
        this.targetFPS = targetFPS;
        this.gameState = 0; // 0: init, 1: connected, 2: game will start, 3: playing, 4: game ended
        this.elapsedGameStateTime = (new Date()).getTime();
    }

    GameManager.prototype.setGameState = function (gameState) {
        this.gameState = gameState;
        this.elapsedGameStateTime = (new Date()).getTime();
    };

    GameManager.prototype.time = function () {
        return (new Date()).getTime() - this.elapsedGameStateTime;
    };

    GameManager.prototype.gameLoop = function (update) {
        var delay = (1000 / this.targetFPS);
        var now, before = new Date();

        setInterval(function () {
            now = new Date();
            var elapsedTime = (now.getTime() - before.getTime());
            update(elapsedTime / 1000);
            before = new Date();
        }, delay);
    };

    return GameManager;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameManager;
}