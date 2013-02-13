var assert = require('should');
var GameStats = require('../static/js/gamestats.js');

describe('gamestats', function(){
    describe('#accuracy', function(){
        it('should be updated after keypress', function () {
            var gm = new GameStats();
            gm.keypress();
            gm.keypress();
            gm.accuracy.should.equal(1);
            gm.accuracy.should.not.equal(0);
        });
        it('accuracy should be updated after keybackspacepress', function () {
            var gm = new GameStats();
            gm.keypress();
            gm.backspacepress();
            gm.accuracy.should.equal(0.5);
        });
        it('accuracy calculations', function () {
            var gm = new GameStats();
            gm.keypress();
            gm.backspacepress();
            gm.backspacepress();
            gm.accuracy.should.equal(1/3);
        });
    });
});
