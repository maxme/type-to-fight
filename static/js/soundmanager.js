"use strict";

var SoundManager = (function () {
    function SoundManager() {
        this.loadConf();
        var that = this;
        // bind buttons
        $('#btn-sound').bind('mouseup', function () {
            that.play('click');
            that.soundToggle();
        });
        $('#btn-music').bind('mouseup', function () {
            that.play('click');
            that.musicToggle();
        });
    }

    SoundManager.prototype.saveConf = function () {
        $.jStorage.set('sound-status', this.soundstatus);
        $.jStorage.set('music-status', this.musicstatus);
    };

    SoundManager.prototype.loadConf = function () {
        this.soundstatus = $.jStorage.get('sound-status', true);
        this.musicstatus = $.jStorage.get('music-status', true);
        this.changeButtonClass($('#btn-sound'), this.soundstatus);
        this.changeButtonClass($('#btn-music'), this.musicstatus);
    };

    SoundManager.prototype.changeButtonClass = function(elt, status) {
        if (status) {
            elt.removeClass('btn-red').removeClass('btn-green').addClass('btn-green');
        } else {
            elt.removeClass('btn-red').removeClass('btn-green').addClass('btn-red');
        }
    };

    SoundManager.prototype.soundToggle = function () {
        this.soundstatus = !this.soundstatus;
        this.changeButtonClass($('#btn-sound'), this.soundstatus);
        this.saveConf();
    };

    SoundManager.prototype.musicToggle = function () {
        this.musicstatus = !this.musicstatus;
        this.changeButtonClass($('#btn-music'), this.musicstatus);
        this.saveConf();
    };

    SoundManager.prototype.loadOneSound = function (name) {
        this.ntoload += 1;
        createjs.Sound.registerSound('/sounds/' + name + '.mp3|/sounds/' + name + '.ogg', name, 5);
    };

    SoundManager.prototype.play = function (name) {
        if (this.soundstatus) {
            createjs.Sound.play(name);
        }
    };

    SoundManager.prototype.loadSounds = function (callback) {
        var that = this;
        this.nloaded = 0;
        this.ntoload = 0;
        createjs.Sound.addEventListener('loadComplete', function (a) {
            that.nloaded += 1;
            console.log('nl=' + that.nloaded + '/' + that.ntoload);
            if (that.nloaded >= that.ntoload) {
                typeof callback === 'function' && callback();
            }
        });
        createjs.Sound.registerPlugins([createjs.WebAudioPlugin, createjs.HTMLAudioPlugin]);
        this.loadOneSound('click');
    };

    return SoundManager;
})();