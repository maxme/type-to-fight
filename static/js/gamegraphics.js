var SpriteSheet =(function () {
    function SpriteSheet(scene, spritesheet_json, spritesheet_img, callback) {
        var that = this;
        this.spritesheet_img = spritesheet_img;
        this.spritesheet_json = spritesheet_json;
        this.spritesheet = null; // spritesheet data as an Obj
        this.scene = scene;
        that.scene.loadImages([spritesheet_img], function () {
            that.loadFile(spritesheet_json, function (data) {
                that.spritesheet = JSON.parse(data);
                callback();
            });
        });
    }

    SpriteSheet.prototype.loadFile = function (filename, fileLoaded) {
        var request = new XMLHttpRequest();
        request.open("GET", filename);
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                fileLoaded(request.responseText);
            }
        };
        request.send();
    };

    SpriteSheet.prototype.getFrame = function (name) {
        if (!this.spritesheet.frames[name]) {
            console.log('spritename not found: ' + name + ' in: ' + Object.keys(this.spritesheet.frames));
        }
        var frame = this.spritesheet.frames[name].frame;
        return frame;
    };

    SpriteSheet.prototype.createSprite = function (name, layer) {
        var frame = this.getFrame(name);
        var options = {layer: layer, x: 0, y: 0, size:[frame.w, frame.h]};
        var sprite = this.scene.Sprite(false, options);
        sprite.loadImg(this.spritesheet_img);
        sprite.setXOffset(frame.x);
        sprite.setYOffset(frame.y);
        return sprite;
    };

    SpriteSheet.prototype.createCycle = function (names, dt) {
        var frameList = [];
        for (var i = 0; i < names.length; ++i) {
            var frame = this.spritesheet.frames[names[i]].frame;
            frameList.push([frame.x, frame.y, dt]);
        }
        return sjs.Cycle(frameList);
    };
    return SpriteSheet;
})();


var Player = (function () {
    function Player(spritesheet, left, layer, w) {
        this.w = w;
        this.spritesheet = spritesheet;
        this.layer = layer;
        this.left = left;
        this.createPlayer();
        this.createShoutSprite();
        this.mouth_close = this.spritesheet.getFrame('char1/char1a.png');
        this.mouth_open = this.spritesheet.getFrame('char1/char1b.png');
        this.hitframe = this.spritesheet.getFrame('char1/char1c.png');
    }

    Player.prototype.createPlayer = function () {
        this.sprite = this.spritesheet.createSprite('char1/char1a.png', this.layer);
        if (this.left) {
            this.sprite.move(0, 0);
            this.sprite.setXScale(-1);
        } else {
            this.sprite.move(this.w - this.sprite.w, 0);
        }
    };

    Player.prototype.createShoutSprite = function () {
        this.shout = this.spritesheet.createSprite('misc/shout.png', this.layer);
        if (this.left) {
            this.shout.move(120, 65);
        } else {
            this.shout.setXScale(-1);
            this.shout.move(this.w - this.shout.w - 120, 65);
        }
        this.shout.setOpacity(0);
    };

    Player.prototype.timedAnim = function (time, func, reset_func) {
        setTimeout(function() {
            reset_func();
        }, time);
        func();
    };

    Player.prototype.openMouth = function (time) {
        this.sprite.setXOffset(this.mouth_open.x);
        this.sprite.setYOffset(this.mouth_open.y);
    };

    Player.prototype.closeMouth = function (time) {
        this.sprite.setXOffset(this.mouth_close.x);
        this.sprite.setYOffset(this.mouth_close.y);
    };

    Player.prototype.hit = function (time) {
        var that = this;
        that.timedAnim(time, function () {
                that.sprite.setXOffset(that.hitframe.x);
                that.sprite.setYOffset(that.hitframe.y);
            },
            function () {
                that.sprite.setXOffset(that.mouth_close.x);
                that.sprite.setYOffset(that.mouth_close.y);
            });
    };

    Player.prototype.attack = function (time) {
        var that = this;
        this.timedAnim(time, function () {that.shout.setOpacity(1);},
            function () {that.shout.setOpacity(0);});
    };

    Player.prototype.update = function () {
        this.sprite.update();
        this.shout.update();
    };

    return Player;
})();

var GameGraphics = (function () {
    function GameGraphics(parent, w, h) {
        var that = this;
        this.w = w;
        this.h = h;
        this.sprites = [];
        this.scene = sjs.Scene({parent: parent, w: w, h: h, autoPause: false});
        this.spritesheet = new SpriteSheet(this.scene, '../spritesheets/spritesheet1.json',
        '../spritesheets/spritesheet1.png', function () {
                that.gameLoaded();
            });
    }

    GameGraphics.prototype.update = function () {
        this.lplayer.update();
        this.rplayer.update();
    };

    GameGraphics.prototype.gameLoaded = function () {
        var that = this;
        this.layer = that.scene.Layer("layer", {useCanvas: true});

        // Create players
        this.lplayer = new Player(this.spritesheet, true, this.layer, this.w);
        this.rplayer = new Player(this.spritesheet, false, this.layer, this.w);

        function paint() {
            // that.cycle.next(ticker.lastTicksElapsed);
            that.update();
        }

        var ticker = that.scene.Ticker(30, paint);
        ticker.run();
    };


    // External API
    GameGraphics.prototype.keydown = function () {
        this.lplayer.openMouth();
    };

    GameGraphics.prototype.keyup = function () {
        this.lplayer.closeMouth();
    };

    GameGraphics.prototype.playerHit = function () {
        this.lplayer.hit(400);
    };

    GameGraphics.prototype.playerHeal = function () {
        // this.lplayer.hit(); // FIXME
    };

    GameGraphics.prototype.oppHit = function () {
        this.rplayer.hit(400);
    };

    GameGraphics.prototype.oppHeal = function () {
        // this.rplayer.hit(); // FIXME
    };

    GameGraphics.prototype.playerAttack = function () {
        this.lplayer.attack(200);
    };

    GameGraphics.prototype.oppAttack = function () {
        this.rplayer.attack(200);
    };

    return GameGraphics;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameGraphics;
}