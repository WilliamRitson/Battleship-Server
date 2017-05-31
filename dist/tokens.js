"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
function getToken(bits = 32) {
    return crypto.randomBytes(bits).toString('hex');
}
exports.getToken = getToken;
