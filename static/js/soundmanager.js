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

    SoundManager.prototype.loadOneSound = function (name, promises) {
        var sound = new buzz.sound('/sounds/' + name, {
            formats: ['ogg', 'mp3']
        });
        var promise = $.Deferred();
        promises.push(promise);
        sound.bind('loadeddata', function (e) {
            promise.resolve();
        });
        return sound;
    };

    SoundManager.prototype.play = function (name) {
        if (this.sounds && this.sounds[name] && this.soundstatus) {
            this.sounds[name].play();
        }
    };

    SoundManager.prototype.loadSounds = function (callback) {
        this.sounds = {};
        this.promises = [];
        this.sounds.click = this.loadOneSound('click', this.promises);
        $.when.apply(null, this.promises).done(function () {
            typeof callback === 'function' && callback();
        });
    };

    return SoundManager;
})();