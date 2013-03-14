var Sprite = sjs.Sprite;

Sprite.prototype.setSpriteSourceSize = function (spriteSourceSize) {
    this.spriteSourceSize = spriteSourceSize;
};

Sprite.prototype.getSpriteSourceSize = function () {
    return this.spriteSourceSize;
};

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

    SpriteSheet.prototype.getSpriteSourceSize = function (name) {
        if (!this.spritesheet.frames[name]) {
            console.log('spritename not found: ' + name + ' in: ' + Object.keys(this.spritesheet.frames));
        }
        if (this.spritesheet.frames[name].spriteSourceSize) {
            var spriteSourceSize = this.spritesheet.frames[name].spriteSourceSize;
            return spriteSourceSize;
        }
        return null;
    };

    SpriteSheet.prototype.createSprite = function (name, layer) {
        var frame = this.getFrame(name);
        var spriteSourceSize = this.getSpriteSourceSize(name);
        var options = {layer: layer, x: 0, y: 0, size:[frame.w, frame.h]};
        var sprite = this.scene.Sprite(false, options);
        sprite.loadImg(this.spritesheet_img);
        sprite.setXOffset(frame.x);
        sprite.setYOffset(frame.y);
        if (spriteSourceSize) {
            sprite.setSpriteSourceSize(spriteSourceSize);
        }
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
    var common = new Common();

    function Character(spritesheet, left, layer, w, stylecode) {
        this.w = w;
        this.spritesheet = spritesheet;
        this.layer = layer;
        this.left = left;
        this.code = stylecode;
        var names = this.codeToNames(stylecode);
        this.eyes = this.spritesheet.createSprite('char-' + names['eyes'] + '/eyes.png', this.layer);
        this.eyesdead = this.spritesheet.createSprite('char-' + names['eyes'] + '/eyes-dead.png', this.layer);
        this.head = this.spritesheet.createSprite('char-' + names['head'] + '/head.png', this.layer);
        this.hair = this.spritesheet.createSprite('char-' + names['hair'] + '/hair.png', this.layer);
        this.legs = this.spritesheet.createSprite('char-' + names['legs'] + '/legs.png', this.layer);
        this.mouthopen = this.spritesheet.createSprite('char-' + names['mouth'] + '/mouth-open.png', this.layer);
        this.mouthclose = this.spritesheet.createSprite('char-' + names['mouth'] + '/mouth-close.png', this.layer);
        this.torso = this.spritesheet.createSprite('char-' + names['torso'] + '/torso.png', this.layer);
        this.sprites = [this.torso, this.legs, this.head, this.hair,
                       this.mouthopen, this.mouthclose, this.eyes, this.eyesdead
                       ];
        this.moveSprites();
        this.createShoutSprite();
    }

    Character.prototype.codeToNames = function (stylecode) {
        styles = common.COSTUME_STYLES;
        split = stylecode.split(',');
        res = {
            'eyes': styles[parseInt(split[0])],
            'head': styles[parseInt(split[1])],
            'hair': styles[parseInt(split[2])],
            'legs': styles[parseInt(split[3])],
            'mouth': styles[parseInt(split[4])],
            'torso': styles[parseInt(split[5])]
        }
        return res;
    };

    Character.prototype.createShoutSprite = function () {
        this.shout = this.spritesheet.createSprite('misc/shout.png', this.layer);
        this.sprites.push(this.shout);
        var scale = 0.8;
        this.shout.setXScale(scale);
        this.shout.setYScale(scale);
        if (this.left) {
            this.shout.move(110 + 50, 100);
        } else {
            this.shout.setXScale(-this.shout.xscale);
            this.shout.move(this.w - this.shout.w - 110 - 50, 100);
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
        var xscale = 1;
        var posX = 50
        if (!this.left) {
            xscale = -1;
        }
        var yscale = 1;
        for (var i = 0; i < this.sprites.length; ++i) {
            this.sprites[i].setXScale(xscale);
            this.sprites[i].setYScale(yscale);
            var sss = this.sprites[i].spriteSourceSize;
            if (!this.left) {
                posX = this.w - this.sprites[i].w - 50;
                this.sprites[i].move(posX - sss.x, 22 + sss.y);
            } else {
                this.sprites[i].move(posX + sss.x, 22 + sss.y);
            }
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
            that.openMouth();
        }, function () {
            that.shout.setOpacity(0);
            that.closeMouth();
        });
    };

    return Character;
})();

var GameGraphics = (function () {
    var common = new Common();

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

    GameGraphics.prototype.gameLoaded = function () {
        var that = this;
        this.layer = that.scene.Layer("layer", {useCanvas: true, autoClear: true});

        // Create backgrounds
        //this.rbg = new Background('/images/backgrounds/bg-light-grey.png', this.scene, this.layer, false);
        //this.lbg = new Background('/images/backgrounds/bg-sand-grey.png', this.scene, this.layer, true);
        this.rbg = null;  
        this.lbg = null;
        this.lplayer = null;
        this.rplayer = null;
        // Create players
        if (typeof(stylecode) !== 'undefined' && stylecode) {
            this.createLeftPlayer(stylecode);
        }
        if (typeof(opp_stylecode) !== 'undefined' && opp_stylecode) {
            this.createRightPlayer(opp_stylecode);
        } else {
            if (roomid === 'practice') {
                this.createRightPlayer(common.createRandomStyle());
            }
        }

        // Create ground
        this.ground = this.spritesheet.createSprite('background/ground.png', this.layer);
        this.ground.move(0, 200);

        function paint() {
            // that.cycle.next(ticker.lastTicksElapsed);
            if (that.rbg) {
                that.rbg.sprite.update();
            }
            if (that.lbg) {
                that.lbg.sprite.update();
            }
            if (that.lplayer) {
                that.lplayer.update();
            }
            if (that.rplayer) {
                that.rplayer.update();
            }
            that.ground.update();
        }

        var ticker = that.scene.Ticker(100, paint);
        ticker.run();
    };

    GameGraphics.prototype.createLeftPlayer = function (code) {
        delete this.lplayer;
        delete this.lbg;
        this.lplayer = new Character(this.spritesheet, true, this.layer, this.w, code);
        var bgcode = code.split(',')[6];
        this.lbg = new Background('/images/backgrounds/bg-' + bgcode + '.png', this.scene, this.layer, false);
    };

    GameGraphics.prototype.createRightPlayer = function (code) {
        delete this.rplayer;
        delete this.rbg;
        this.rplayer = new Character(this.spritesheet, false, this.layer, this.w, code);
        var bgcode = code.split(',')[6];
        this.rbg = new Background('/images/backgrounds/bg-' + bgcode + '.png', this.scene, this.layer, true);
    };
    
    // External API
    GameGraphics.prototype.keydown = function () {
        this.lplayer && this.lplayer.openMouth();
    };

    GameGraphics.prototype.keyup = function () {
        this.lplayer && this.lplayer.closeMouth();
    };

    GameGraphics.prototype.playerHit = function () {
        this.lplayer && this.lplayer.hit(400);
    };

    GameGraphics.prototype.playerHeal = function () {
        // this.lplayer.hit(); // FIXME
    };

    GameGraphics.prototype.oppHit = function () {
        this.rplayer && this.rplayer.hit(400);
    };

    GameGraphics.prototype.oppHeal = function () {
        // this.rplayer.hit(); // FIXME
    };

    GameGraphics.prototype.playerAttack = function () {
        this.lplayer && this.lplayer.attack(200);
    };

    GameGraphics.prototype.oppAttack = function () {
        this.rplayer && this.rplayer.attack(200);
    };

    return GameGraphics;
})();

if (typeof(module) !== 'undefined') {
    module.exports = GameGraphics;
}