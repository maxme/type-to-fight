"use strict";

var GamePlay = (function () {
    function GamePlay(gamestats, gamegraphics) {
        this.gamestats = gamestats;
        this.gamegraphics = gamegraphics;
        this.MIN_HEALTH = 0;
        this.MAX_HEALTH = 100;
        this.reset();
        this.winword_cb = null;
        this.endgame_cb = undefined;
        var that = this;
        String.prototype.startsWith = function (str) {
            return this.slice(0, str.length) === str;
        };
        $('#play-input').bind('input', function () {
            that.checkPlayedWord($(this).val());
        });
        $('#play-input').keydown(function (event) {
            that.keypressStats(event.which);
        });
    }

    GamePlay.prototype.reset = function () {
        this.allWords = [];
        this.displayedWords = [];
        this.allWordsHash = {};
        this.playerHealth = this.MAX_HEALTH;
        this.oppHealth = this.MAX_HEALTH;
        this.attackPlayer(0);
        this.attackOpp(0);
        this.gamestats.reset();
    };

    GamePlay.prototype.setAllWords = function (wordlist) {
        this.allWords = wordlist;
        for (var i = 0; i < this.allWords.length; ++i) {
            this.allWordsHash[this.allWords[i].word] = this.allWords[i];
        }
    };

    GamePlay.prototype.attackTypeToHtml = function (attackType) {
        return '';
        if (attackType === 0) {
            return 'Attack';
        } else {
            return 'Heal';
        }
    };

    GamePlay.prototype.attackTypeToClass = function (attackType) {
        if (attackType === 0) {
            return 'sword';
        } else {
            return 'shield';
        }
    };

    GamePlay.prototype.insertFirstWord = function (wordobj, done) {
        var html = "<tr class='trword' id='tr-word-" + wordobj.word + "'>" +
            "<td class='" + this.attackTypeToClass(wordobj.type) + "'>" + this.attackTypeToHtml(wordobj.type) + "</td>" + // type
            "<td class='myword'>" + wordobj.word + "</td>" + // word
            "<td>" + wordobj.power + "</td></tr>"; // power
        $(html).appendTo('#wordlist').hide().show(70, done);
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
            } else {
                that.setPlayedIcon([]);
            }
        }

        nextWord();
    };

    GamePlay.prototype.insertRowInTable = function (wordobj, oldword) {
        var html = "<td class='" + this.attackTypeToClass(wordobj.type) + "'>" + this.attackTypeToHtml(wordobj.type) + "</td>" + // type
            "<td class='myword'>" + wordobj.word + "</td>" + // word
            "<td>" + wordobj.power + "</td>"; // power
        $('#tr-word-' + oldword).hide(100, function () {
            $(this).attr('id', 'tr-word-' + wordobj.word).html(html).show(100);
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

    GamePlay.prototype.practiceBotTick = function (dt) {
        if (dt > 5000) {
            var randword = this.allWords[randomRange(0, this.allWords.length - 1)].word;
            this.oppWinWord(randword);
            return true;
        }
        return false;
    };

    GamePlay.prototype.getPractiseEndScores = function () {
        var res = {
            you: 'player1',
            opp: 'player2',
            scores: {
                player1: this.playerHealth,
                player2: this.oppHealth
            }
        };
        return res;
    };

    GamePlay.prototype.checkEndGame = function () {
        if (this.playerHealth === 0 || this.oppHealth === 0) {
            this.endgame_cb(this.getPractiseEndScores());
        }
    };

    GamePlay.prototype.oppWinWord = function (word) {
        var wordobj = this.allWordsHash[word];
        if (wordobj) {
            this.gamegraphics.oppAttack();
            if (wordobj.type == 0) { // attack from opp
                this.gamegraphics.playerHit();
                this.attackPlayer(wordobj.power);
            } else { // opp healed
                this.gamegraphics.oppHeal();
                this.healOpp(wordobj.power);
            }
            this.checkEndGame();
        } else {
            console.log('word: ' + word + ' is not in the list');
        }
    };

    GamePlay.prototype.winWord = function (word) {
        if (this.winword_cb) {
            this.winword_cb(word);
        }
        this.gamestats.winword(word);
        this.displayedWords.splice(this.displayedWords.indexOf(word), 1);
        this.showNextWord(word);
        var wordobj = this.allWordsHash[word];
        this.gamegraphics.playerAttack();
        if (wordobj.type == 0) { // attack from player
            this.gamegraphics.oppHit();
            this.attackOpp(wordobj.power);
        } else { // player healed
            this.gamegraphics.playerHeal();
            this.healPlayer(wordobj.power);
        }
        this.checkEndGame();
    };

    GamePlay.prototype.uncolorizeWord = function (word) {
        var wordElt = $('#tr-word-' + word + ' td')[1];
        $(wordElt).html(word);
    };

    GamePlay.prototype.colorizeWord = function (word, wordpart) {
        var wordElt = $('#tr-word-' + word + ' td')[1];
        var wordrest = word.slice(wordpart.length);
        $(wordElt).html('<span>' + wordpart + '</span>' + wordrest);
    };

    GamePlay.prototype.getAttackTypeList = function (words) {
        var attack = false;
        var defend = false;
        for (var i = 0; i < words.length; ++i) {
            var wordobj = this.allWordsHash[words[i]];
            if (wordobj.type === 0) {
                attack = true;
            }
            if (wordobj.type === 1) {
                defend = true;
            }
        }
        if (attack && defend) {
            return 3;
        }
        if (attack) {
            return 1;
        }
        return 2;
    };

    GamePlay.prototype.setPlayedIcon = function (possibilities) {
        var splay = $('.play-type');
        splay.removeClass('sword');
        splay.removeClass('shield');
        splay.removeClass('swordorshield');
        var res = 0;
        if (possibilities.length === 0) {
            res = this.getAttackTypeList(this.displayedWords);
        } else {
            res = this.getAttackTypeList(possibilities);
        }
        if (res === 1) {
            splay.addClass('sword');
        }
        if (res === 2) {
            splay.addClass('shield');
        }
        if (res === 3) {
            splay.addClass('swordorshield');
        }
    };

    GamePlay.prototype.checkPlayedWord = function (word) {
        var possibilities = [];
        for (var i = 0; i < this.displayedWords.length; ++i) {
            if (this.displayedWords[i].startsWith(word)) {
                possibilities.push(this.displayedWords[i]);
                this.colorizeWord(this.displayedWords[i], word);
                if (this.displayedWords[i] === word) {
                    this.winWord(word);
                    $('#play-input').val('');
                    this.setPlayedIcon([]);
                    return ;
                }
            } else {
                this.uncolorizeWord(this.displayedWords[i]);
            }
        }
        this.setPlayedIcon(possibilities);
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
        $('#play-input').focus();
        console.log('startGame');
        that.insertFirstWords(5);
    };

    GamePlay.prototype.clamp = function (a, min, max) {
        return Math.floor(Math.min(Math.max(a, min), max));
    };

    GamePlay.prototype.setPlayerLife = function (newlife) {
        this.playerHealth = this.clamp(newlife, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-left').animate({width: this.playerHealth + '%'}, 200);
    };

    GamePlay.prototype.setOppLife = function (newlife) {
        this.oppHealth = this.clamp(newlife, this.MIN_HEALTH, this.MAX_HEALTH);
        $('.lifebar-right').animate({width: this.oppHealth + '%'}, 200);
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
