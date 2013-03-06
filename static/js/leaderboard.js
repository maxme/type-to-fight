"use strict";

var LeaderBoard = (function () {
    function LeaderBoard() {
        this.page = 0;
        this.type = 'all';
        this.lastpage = false;
    }

    LeaderBoard.prototype.show = function (params) {
        this.page = parseInt(params.pagen);
        this.type = params.type;
        $('#main').hide();
        $('#leaderboard').show();
        this.requestLoad({type: this.type, page: this.page});
    };

    LeaderBoard.prototype.requestLoad = function (options) {
        var that = this;
        $("#spinner").spin("very-large", "black");

        // options = {type: 'all', page: 12}
        function createTable(data) {
            var table = $('#lb-table-body');
            table.html('');
            if (data.length === 0) {
                table.append('<tr />').children('tr:last')
                    .append('<td></td><td>Sorry you\'re not ranked yet</td>');
            } else {
                var uids = [];
                if (data.length !== 20) {
                    that.lastpage = true;
                } else {
                    that.lastpage = false;
                }
                data = data.sort(function (a, b) {
                    return parseFloat(b.rating) - parseFloat(a.rating);
                });
                for (var i = 0; i < data.length; ++i) {
                    uids.push(data[i].uid);
                    if (data[i].rank !== -1) {
                        table.append('<tr />').children('tr:last')
                            .append('<td>' + data[i].rank + '</td>')
                            .append('<td id="name-' + data[i].uid + '"></td>')
                            .append('<td>' + Math.floor(data[i].rating) + '</td>');
                    } else {
                        table.append('<tr />').children('tr:last')
                            .append('<td>na</td>')
                            .append('<td id="name-' + data[i].uid + '"></td>')
                            .append('<td><a id="invite-' + data[i].uid + '" href="' + window.location.hash +
                                '" class="btn btn-custom btn-blue">Invite</a></td>');

                        $('#invite-' + data[i].uid).bind('click', function () {
                            myFB.requestSelector('Play with me!', [$(this).attr('id').replace('invite-', '')]);
                        });
                    }
                }
                myFB.getMultipleUserInfos(uids, ['name'], function (names) {
                    for (var uid in names) {
                        $('#name-' + names[uid].id).html(names[uid].name);
                    }
                    $("#spinner").spin(false);
                });
                myFB.getUserInfos(function (response) {
                    if (myFB.userInfos && myFB.userInfos.id) {
                        $('#name-' + myFB.userInfos.id).parent().children().css({'background-color': '#9cf'});
                    }
                });
            }
        }

        function getJSON() {
            $.getJSON('/leaderboard', options, function (data) {
                createTable(data);
                that.update();
            });
        }

        if (that.type === 'friends') {
            myFB.getFriendIds(['id'], function (response) {
                var ids = [];
                myFB.getUserInfos(function (me) {
                    if (response && response.data) {
                        ids = response.data.map(function (i) {
                            return i.id;
                        });
                    }
                    if (me && me.id) {
                        ids.push(me.id);
                    }
                    options.ids = ids;
                    getJSON();
                });
            });
        } else {
            getJSON();
        }

    };

    LeaderBoard.prototype.update = function () {
        if (this.page === 0) {
            $('#lb-previous-btn').parent().addClass('disabled');
        } else {
            $('#lb-previous-btn').parent().removeClass('disabled');
        }
        if (this.lastpage) {
            $('#lb-next-btn').parent().addClass('disabled');
        } else {
            $('#lb-next-btn').parent().removeClass('disabled');
        }
        // set tab active
        $('#li-all').removeClass('active');
        $('#li-friends').removeClass('active');
        $('#li-around').removeClass('active');
        $('#li-' + this.type).addClass('active');

        // update prev/next buttons url
        var nextPage = this.page;
        if (!this.lastpage) {
            nextPage += 1;
        }
        var prevPage = this.page;
        if (this.page !== 0) {
            prevPage -= 1;
        }
        $('#lb-btn-previous').attr('href', '#page=leaderboard&pagen=' + prevPage + '&type=' + this.type);
        $('#lb-btn-next').attr('href', '#page=leaderboard&pagen=' + nextPage + '&type=' + this.type);
        if (this.type === 'all') {
            $('#lb-btn-previous').show();
            $('#lb-btn-next').show();
        } else {
            $('#lb-btn-previous').hide();
            $('#lb-btn-next').hide();
        }
    };

    LeaderBoard.prototype.hide = function () {
        // hide mainmenu

        // show leader

    };

    return LeaderBoard;
})();

if (typeof(module) !== 'undefined') {
    module.exports = LeaderBoard;
}