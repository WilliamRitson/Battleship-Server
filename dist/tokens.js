"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
function getToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}
exports.getToken = getToken;
