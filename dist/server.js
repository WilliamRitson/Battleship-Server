"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messenger_1 = require("./messenger");
const tokens_1 = require("./tokens");
const account_1 = require("./account");
const gameServer_1 = require("./gameServer");
const matchmaking_1 = require("./matchmaking");
const express = require("express");
/**
 * Server that holds references to all the components of the app
 *
 * @export
 * @class Server
 */
class Server {
    constructor(port) {
        this.games = new Map();
        this.accounts = new Map();
        this.app = express();
        this.addRoutes();
        let expressServer = this.app.listen(port, () => {
            console.log('Server started on port', port);
        });
        this.messenger = new messenger_1.ServerMessenger(expressServer);
        this.gameQueue = new matchmaking_1.MatchQueue(this.messenger, this.makeGame.bind(this));
        this.messenger.addHandeler(messenger_1.MessageType.AnonymousLogin, (msg) => this.anonLogin(msg));
        this.passMessagesToGames();
    }
    addRoutes() {
        this.app.use('/', express.static('public'));
        this.app.get('/report', (req, res) => {
            res.send(this.getReport());
        });
    }
    getReport() {
        return {
            users: Array.from(this.accounts.values()).map(acc => acc.username),
            games: Array.from(this.games.values()).map(game => game.getName()),
        };
    }
    anonLogin(msg) {
        let userName = msg.data.username;
        let token = tokens_1.getToken();
        let acc = new account_1.Account(token, userName);
        this.accounts.set(token, acc);
        this.messenger.sendMessageTo(messenger_1.MessageType.LoginResponce, {
            username: acc.username,
            token: acc.token
        }, msg.source);
        this.messenger.changeToken(msg.source, token);
    }
    passMessagesToGames() {
        this.messenger.addHandeler(messenger_1.MessageType.GameAction, (msg) => {
            let acc = this.accounts.get(msg.source);
            if (acc == null) {
                this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "Can't take a game action. Your not logged in.", msg.source);
            }
            let id = acc.getGame();
            if (id === null) {
                this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "Can't take a game action. Your not in a game.", msg.source);
                return;
            }
            if (!this.games.has(id)) {
                this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "Game does not exist.", msg.source);
                return;
            }
            this.games.get(id).handleAction(msg);
        });
    }
    makeGame(token1, token2) {
        let id = tokens_1.getToken();
        this.accounts.get(token1).setInGame(id);
        this.accounts.get(token2).setInGame(id);
        let server = new gameServer_1.GameServer(this.messenger, this, id, this.accounts.get(token1), this.accounts.get(token2));
        this.games.set(id, server);
        server.start();
    }
    endGame(gameId) {
        if (this.games.has(gameId))
            this.games.delete(gameId);
        else
            console.error('Trying to delete non-existant game with id', gameId);
    }
}
exports.Server = Server;
