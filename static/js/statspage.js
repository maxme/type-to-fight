"use strict";

var StatsPage = (function () {
    function StatsPage() {
        this.type = 'all';
        this.stats = null;
    }

    StatsPage.prototype.show = function (params) {
        this.type = params.type;
        $('#main').hide();
        $('#leaderboard').hide();
        $('#stats').show();
        this.requestLoad({});
    };


    StatsPage.prototype.requestLoad = function (options) {
        var that = this;

        function createPage() {
            $("#spinner").spin(false);
            $('#sp-main').html(JSON.stringify(that.stats));
            that.update();
        }

        function getJSON() {
            $.getJSON('/stats/json', options, function (data) {
                that.stats = data;
                createPage();
            });
        }

        if (!this.stats) {
            $("#spinner").spin("very-large", "black");
            getJSON();
        } else {
            that.update();
        }
    };


    StatsPage.prototype.update = function () {
        // set tab active
        $('#sp-current').removeClass('active');
        $('#sp-stats-history').removeClass('active');
        $('#sp-rank-history').removeClass('active');
        $('#sp-' + this.type).addClass('active');
    };

    return StatsPage;
})();

if (typeof(module) !== 'undefined') {
    module.exports = StatsPage;
}
