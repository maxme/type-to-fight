"use strict";

var GamePlay = (function () {
    function GamePlay(gamestats, gamemanager) {
        this.gamestats = gamestats;
        this.gamemanager = gamemanager;
        this.MIN_HEALTH = 0;
        this.MAX_HEALTH = 100;
        this.reset();
        this.winword_cb = null;
    }

    GamePlay.prototype.reset = function () {
        this.allWords = [];
        this.displayedWords = [];
        this.allWordsHash = {};
        this.playerHealth = this.MAX_HEALTH;
        this.oppHealth = this.MAX_HEALTH;
        this.attackPlayer(0);
        this.attackOpp(0);
    };

    GamePlay.prototype.setAllWords = function (wordlist) {
        this.allWords = wordlist;
        for (var i = 0; i < this.allWords.length; ++i) {
            this.allWordsHash[this.allWords[i].word] = this.allWords[i];
        }
    };

    GamePlay.prototype.attackTypeToHtml = function (attackType) {
        if (attackType === 0) {
            return 'Attack';
        } else {
            return 'Heal';
        }
    };

    GamePlay.prototype.insertFirstWord = function (wordobj, done) {
        var html = "<tr class='trword' id='tr-word-" +
            wordobj.word + "'><td class='myword'>" +
            wordobj.word + "</td><td>" +
            this.attackTypeToHtml(wordobj.type) + "</td><td>" +
            wordobj.power + "</td></tr>";
        $(html).appendTo('#wordlist').hide().fadeIn(70, done);
        this.displayedWords.push(wordobj.word);
    };

    GamePlay.prototype.insertFirstWords = function (size) {
        var i = 0;
        var that = this;

        function nextWord() {
            if (i < size) {
                var wordobj = that.allWords.pop();
                that.insertFirstWord(wordobj, function () {
                    i += 1;
                    nextWord();
                });
            }
        }
        nextWord();
    };

    GamePlay.prototype.insertRowInTable = function (wordobj, oldword) {
        var html = "<td class='myword'>" +
            wordobj.word + "</td><td>" +
            this.attackTypeToHtml(wordobj.type) + "</td><td>" +
            wordobj.power + "</td>";
        $('#tr-word-' + oldword).fadeOut(200, function () {
            $(this).attr('id', 'tr-word-' + wordobj.word).html(html).fadeIn(200);
        });
        this.displayedWords.push(wordobj.word);
    };

    GamePlay.prototype.showNextWord = function (oldword) {
        if (this.allWords.length !== 0) {
            var wordobj = this.allWords.pop();
            this.insertRowInTable(wordobj, oldword);
        } else {
            $('#tr-word-' + oldword).fadeOut(300);
        }
    };

    GamePlay.prototype.oppWinWord = function (word) {
        var wordobj = this.allWordsHash[word];
        if (wordobj.type == 0) { // attack from opp
            this.attackPlayer(wordobj.power);
        } else { // opp healed
            this.healOpp(wordobj.power);
        }
    };

    GamePlay.prototype.winWord = function (word) {
        if (this.winword_cb) {
            this.winword_cb(word);
        }
        this.displayedWords.splice(this.displayedWords.indexOf(word), 1);
        this.showNextWord(word);
        var wordobj = this.allWordsHash[word];
        if (wordobj.type == 0) { // attack from player
            this.attackOpp(wordobj.power);
        } else { // player healed
            this.healPlayer(wordobj.power);
        }
    };

    GamePlay.prototype.uncolorizeWord = function (word) {
        var wordElt = $('#tr-word-' + word + ' td')[0];
        $(wordElt).html(word);
    };

    GamePlay.prototype.colorizeWord = function (word, wordpart) {
        var wordElt = $('#tr-word-' + word + ' td')[0];
        var wordrest = word.slice(wordpart.length);
        $(wordElt).html('<span>' + wordpart + '</span>' + wordrest);
    };

    GamePlay.prototype.checkPlayedWord = function (word) {
        for (var i = 0; i < this.displayedWords.length; ++i) {
            if (this.displayedWords[i].startsWith(word)) {
                this.colorizeWord(this.displayedWords[i], word);
                if (this.displayedWords[i] === word) {
                    this.winWord(word);
                    $('#play-input').val('');
                }
            } else {
                this.uncolorizeWord(this.displayedWords[i]);
            }
        }
    };

    GamePlay.prototype.keypressStats = function (keycode) {
        if (keycode === 8) {
            this.gamestats.backspacepress();
        } else {
            this.gamestats.keypress();
        }
    };

    GamePlay.prototype.startGame = function () {
        var that = this;
        String.prototype.startsWith = function (str) {
            return this.slice(0, str.length) === str;
        };
        $('#play-input').bind('input', function () {
            that.checkPlayedWord($(this).val());
        });
        $('#play-input').keypress(function (event) {
            that.keypressStats(event.which);
        });
        $('#play-input').focus();
        console.log('startGame');
        that.insertFirstWords(5);
    };

    GamePlay.prototype.clamp = function (a, min, max) {
        return Math.floor(Math.min(Math.max(a, min), max));
    };

    GamePlay.prototype.attackPlayer = function (power) {
        this.playerHealth = this.clamp(this.playerHealth - power, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-left').animate({width: this.playerHealth + '%'}, 200);
    };

    GamePlay.prototype.attackOpp = function (power) {
        this.oppHealth = this.clamp(this.oppHealth - power, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-right').animate({width: this.oppHealth + '%'}, 200);
    };

    GamePlay.prototype.healPlayer = function (power) {
        this.playerHealth = this.clamp(this.playerHealth + power, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-left').animate({width: this.playerHealth + '%'}, 200);
    };

    GamePlay.prototype.healOpp = function (power) {
        this.oppHealth = this.clamp(this.oppHealth + power, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-right').animate({width: this.oppHealth + '%'}, 200);
    };
    return GamePlay;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GamePlay;
}
