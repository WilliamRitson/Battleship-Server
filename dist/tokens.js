"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
function getToken() {
    return crypto.randomBytes(64).toString('hex');
}
exports.getToken = getToken;
