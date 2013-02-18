"use strict";

var NetworkClient = (function () {
    function NetworkClient(socket) {
        this.socket = socket;
    }


    return NetworkClient;
})();

if (typeof(module) !== 'undefined') {
    module.exports = NetworkClient;
}
