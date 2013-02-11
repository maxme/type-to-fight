"use strict";

var PlayedWord = (function() {
    function PlayedWord(word, your, winCB, loseCB) {
        // defaults
        this.word = word;
        this.elt = $('<span class="word">' + word + '</span>');
        this.your = your,
        this.position = {x: 0, y: 0};
        this.speed = 60;
        this.score = this.targetScore = 1000;
        this.loseCB = loseCB;
        this.winCB = winCB;
        this.position.y = 100 + _.random(-50, 50);
        this.state = 0; // 0: alive, 1: won, 2: lost

        var halfScreen = 200;
        if (!your) {
            this.position.y += halfScreen;
        }
    }

    PlayedWord.prototype.update = function (timedelta) {
        this.position.x += timedelta * this.speed;
        var loseLimit = 650;
        this.elt.css({'left': Math.floor(this.position.x) + 'px', 'top': Math.floor(this.position.y) + 'px'});
        if (this.position.x > loseLimit) {
            this.lose();
        }
    };

    PlayedWord.prototype.win = function () {
        if (this.state !== 0)
            return ;
        this.state = 2;
        this.score = Math.floor((this.targetScore - this.position.x) * this.word.length);
        var obj = this;
        this.elt.fadeOut(400, function () {
            obj.winCB(obj);
        });
    };

    PlayedWord.prototype.lose = function() {
        if (this.state !== 0)
            return ;
        this.state = 1;
        var obj = this;
        console.log('lose' + obj.word);
        this.elt.fadeOut(1000, function () {
            console.log('word lost= ' + obj.word);
            obj.loseCB(obj);
        });
    };

    return PlayedWord;
})();

if (typeof(module) !== 'undefined') {
    module.exports = PlayedWord;
}