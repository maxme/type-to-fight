var Player = (function () {
    function Player(kind, left, scene, layer) {
        this.layer = layer;
        this.scene = scene;
        this.left = left;
        if (kind === 1) {
            this.image = 'char1sheet.png';
        } else {
            this.image = 'char2sheet.png';
        }
        this.createPlayer();
    }

    Player.prototype.createPlayer = function () {
        this.sprite = this.scene.Sprite(this.image, this.layer);
        this.sprite.size(160, 219);
        this.sprite.setYOffset(0);
        this.sprite.setXScale(this.left ? -1 : 1);
        this.sprite.move(0, 0);
    };

    Player.prototype.openMouth = function (time) {
        this.sprite.setXOffset(160);
    };

    Player.prototype.closeMouth = function (time) {
        this.sprite.setXOffset(0);
    };

    Player.prototype.update = function () {
        this.sprite.update();
    };

    return Player;
})();

var GameGraphics = (function () {
    var scene;

    function GameGraphics(parent, w, h) {
        var that = this;
        this.w = w;
        this.h = h;
        this.sprites = [];
        images = ['char1sheet.png'];
        scene = sjs.Scene({parent: parent, w: w, h: h, autoPause: false});
        scene.loadImages(images, function () {
            that.gameLoaded();
        });
    }

    GameGraphics.prototype.update = function () {
        this.lplayer.update();
        this.rplayer.update();
    };

    GameGraphics.prototype.gameLoaded = function () {
        var that = this;
        var canvas = true;
        if (canvas) {
            this.layer = scene.Layer("layer", {useCanvas: true});
        } else {
            this.layer = scene.Layer("layer", {useCanvas: false});
        }

        // Create players
        this.lplayer = new Player(1, true, scene, this.layer);
        this.rplayer = new Player(1, false, scene, this.layer);
        this.rplayer.sprite.move(this.w - 160, 0);

        function paint() {
            // that.cycle.next(ticker.lastTicksElapsed);
            that.update();
            //        ticker.pause();
        }

        var ticker = scene.Ticker(30, paint);
        ticker.run();
    };

    GameGraphics.prototype.keydown = function () {
        this.lplayer.openMouth();
    };

    GameGraphics.prototype.keyup = function () {
        this.lplayer.closeMouth();
    };

    GameGraphics.prototype.reset = function () {
    };

    return GameGraphics;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameGraphics;
}