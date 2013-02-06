/* Author: Maxime Biais */

/*
 var socket = io.connect();

 $('#sender').bind('click', function() {
 socket.emit('message', 'Message Sent on ' + new Date());
 });

 socket.on('server_message', function(data){
 $('#receiver').append('<li>' + data + '</li>');
 });
 */

$(document).ready(function () {
    ready();
});

var ready = function () {
    // This demo depends on the canvas element
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }

    // The URL of your web server (the port is set in app.js)
    var url = 'http://localhost:8081';

    var doc = $(document),
        win = $(window),
        canvas = $('#canvas'),
        played = $('#played'),
        ctx = canvas[0].getContext('2d'),
        instructions = $('#instructions');

    // Generate an unique ID
    var id = Math.round($.now() * Math.random());

    var clients = {};
    var players = {};

    var socket = io.connect(url);

    socket.on('msgkeypress', function (data) {
        console.log("msg-keypress received");
        if (!(data.id in clients)) {
            // a new user has come online. create a new li
            players[data.id] = $('<li id="p' + data.id+ '">player: ' + data.id + '</li>').appendTo('#players');
            console.log("new client=" + data.id);
        }
        $('<span>'+data.keychar+'</span>').appendTo('#p' + data.id);
        // players[data.id].insertBefore(data.keychar, players[data.id]);
        // Saving the current client state
        clients[data.id] = data;
        clients[data.id].updated = $.now();
    });

    var lastEmit = $.now();

    doc.on('keypress', function (event) {
//        if ($.now() - lastEmit > 1) {
        var c = String.fromCharCode(event.which);
        socket.emit('msgkeypress', {
            'id': id,
            'keychar': c
        });
        lastEmit = $.now();
        $('<span>' + c + '</span>').appendTo('#played');
//        }
    });

    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function () {
        for (ident in clients) {
            if ($.now() - clients[ident].updated > 20000) {
                // Last update was more than 10 seconds ago.
                // This user has probably closed the page
                delete clients[ident];
                delete cursors[ident];
            }
        }
    }, 20000);

};