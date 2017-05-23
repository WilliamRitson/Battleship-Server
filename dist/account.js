"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nameGenerator_1 = require("./nameGenerator");
let ng = new nameGenerator_1.NameGenerator();
class Account {
    constructor(token) {
        this.token = token;
        this.username = ng.getName();
        this.gameId = null;
        this.freshen();
    }
    freshen() {
        this.lastUsed = new Date();
    }
    setInGame(gameId) {
        this.gameId = gameId;
    }
    getGame() {
        return this.gameId;
    }
}
exports.Account = Account;
