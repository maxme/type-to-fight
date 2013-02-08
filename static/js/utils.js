"use strict";

// return a random number in [lower, upper]
function randomRange(lower, upper) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}
