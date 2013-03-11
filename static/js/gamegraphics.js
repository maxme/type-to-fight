var SpriteSheet = (function () {
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
            if (request.readyState === 4) {
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


var Background = (function () {
    function Background(image, scene, layer, left) {
        this.image = image;
        this.scene = scene;
        this.layer = layer;
        var w = 373, h = 207;
        var options = {layer: layer, x: 0, y: 0, size: [w, h]};
        this.sprite = this.scene.Sprite(image, options);
        if (left) {
            this.sprite.move(352, 1);
            this.sprite.rotate(Math.PI);
        }
    }

    return Background;
})();



var Character = (function () {
    function Character(spritesheet, left, layer, w) {
        this.w = w;
        this.spritesheet = spritesheet;
        this.layer = layer;
        this.left = left;
        this.armleft = this.spritesheet.createSprite('char1-parts/arm-left.png', this.layer);
        this.armright = this.spritesheet.createSprite('char1-parts/arm-right.png', this.layer);
        this.eyes = this.spritesheet.createSprite('char1-parts/eyes.png', this.layer);
        this.eyesdead = this.spritesheet.createSprite('char1-parts/eyes-dead.png', this.layer);
        this.head = this.spritesheet.createSprite('char1-parts/head.png', this.layer);
        this.hair = this.spritesheet.createSprite('char1-parts/hair.png', this.layer);
        this.legleft = this.spritesheet.createSprite('char1-parts/leg-left.png', this.layer);
        this.legright = this.spritesheet.createSprite('char1-parts/leg-right.png', this.layer);
        this.mouthopen = this.spritesheet.createSprite('char1-parts/mouth-open.png', this.layer);
        this.mouthclose = this.spritesheet.createSprite('char1-parts/mouth-close.png', this.layer);
        this.torso = this.spritesheet.createSprite('char1-parts/torso.png', this.layer);
        this.sprites = [this.armleft, this.torso, this.legleft, this.legright, this.head, this.hair, this.armright,
                       this.mouthopen, this.mouthclose, this.eyes, this.eyesdead
                       ];
        this.moveSprites();
        this.createShoutSprite();
    }
    
    Character.prototype.createShoutSprite = function () {
        this.shout = this.spritesheet.createSprite('misc/shout.png', this.layer);
        this.sprites.push(this.shout);
        var scale = 0.8;
        this.shout.setXScale(scale);
        this.shout.setYScale(scale);
        if (this.left) {
            this.shout.move(90 + 50, 110);
        } else {
            this.shout.setXScale(-this.shout.xscale);
            this.shout.move(this.w - this.shout.w - 90 - 50, 110);
        }
        
        this.shout.setOpacity(0);
    };
    
    Character.prototype.timedAnim = function (time, func, reset_func) {
        setTimeout(function() {
            reset_func();
        }, time);
        func();
    };
    
    Character.prototype.moveSprites = function () {
        var xscale = 0.8;
        var posX = 50
        if (!this.left) {
            xscale = -0.8;
            posX = this.w - this.torso.w - posX;
        }
        var yscale = 0.8;
        for (var i = 0; i < this.sprites.length; ++i) {
            this.sprites[i].setXScale(xscale);
            this.sprites[i].setYScale(yscale);
            this.sprites[i].move(posX, 70);
        }
        this.mouthopen.setOpacity(0);
        this.eyesdead.setOpacity(0);
    };
    
    Character.prototype.update = function () {
        for (var i = 0; i < this.sprites.length; ++i) {
            this.sprites[i].update();
        }
    };
    
    Character.prototype.openMouth = function () {
        this.mouthopen.setOpacity(100);
        this.mouthclose.setOpacity(0);
    };
    
    Character.prototype.closeMouth = function () {
        this.mouthopen.setOpacity(0);
        this.mouthclose.setOpacity(100);
    };
    
    Character.prototype.hit = function (time) {
        var that = this;
        that.timedAnim(time, function () {
            that.eyes.setOpacity(0);
            that.eyesdead.setOpacity(100);
        }, function () {
            that.eyes.setOpacity(100);
            that.eyesdead.setOpacity(0);
        });
    };

    Character.prototype.attack = function (time) {
        var that = this;
        this.timedAnim(time, function () {
            that.shout.setOpacity(100);
        }, function () {
            that.shout.setOpacity(0);
        });
    };

    return Character;
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
        var posX = 120;
        if (this.left) {
            this.sprite.move(posX, 45);
            this.sprite.setXScale(-1);
        } else {
            this.sprite.move(this.w - this.sprite.w - posX, 45);
        }
        this.sprite.setXScale(this.sprite.xscale / 1.5);
        this.sprite.setYScale(this.sprite.yscale / 1.5);
    };

    Player.prototype.createShoutSprite = function () {
        this.shout = this.spritesheet.createSprite('misc/shout.png', this.layer);
        if (this.left) {
            this.shout.move(120 + 50, 100);
        } else {
            this.shout.setXScale(-1);
            this.shout.move(this.w - this.shout.w - 120 - 50, 100);
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
        this.layer = that.scene.Layer("layer", {useCanvas: true, autoClear: true});

        // Create backgrounds
        this.rbg = new Background('/images/backgrounds/bg-light-grey.png', this.scene, this.layer, false);
        this.lbg = new Background('/images/backgrounds/bg-sand-grey.png', this.scene, this.layer, true);

        // Create players
        this.lplayer = new Character(this.spritesheet, true, this.layer, this.w);
        this.rplayer = new Character(this.spritesheet, false, this.layer, this.w);
        
        // Create ground
        this.ground = this.spritesheet.createSprite('background/ground.png', this.layer);
        this.ground.move(0, 200);
        
        function paint() {
            // that.cycle.next(ticker.lastTicksElapsed);
            that.rbg.sprite.update();
            that.lbg.sprite.update();
            that.update();
            that.ground.update();
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