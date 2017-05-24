"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messenger_1 = require("./messenger");
const battleship_1 = require("./battleship");
class GameServer {
    constructor(messenger, server, id, player1, player2) {
        this.messenger = messenger;
        this.server = server;
        this.playerAccounts = [];
        this.game = new battleship_1.BattleshipGame((player, error) => {
            messenger.sendMessageTo(messenger_1.MessageType.ClientError, error, this.playerAccounts[player].token);
        });
        this.id = id;
        this.playerAccounts.push(player1);
        this.playerAccounts.push(player2);
    }
    playerNum(playerToken) {
        return this.playerAccounts.findIndex((acc) => acc.token === playerToken);
    }
    handleAction(msg) {
        let action = msg.data;
        action.player = this.playerNum(msg.source);
        if (action.player === undefined) {
            console.error('Action without player', msg);
            return;
        }
        let events = this.game.handleAction(action);
        this.playerAccounts.forEach(acc => {
            events.forEach(event => {
                this.messenger.sendMessageTo(messenger_1.MessageType.GameEvent, event, acc.token);
            });
        });
        if (this.game.getWinner() != -1) {
            this.end();
        }
    }
    end() {
        this.server.endGame(this.id);
        this.playerAccounts.forEach(acc => {
            acc.setInGame(null);
        });
    }
    start() {
        for (let i = 0; i < this.playerAccounts.length; i++) {
            let playerInfo = 'Welcome to Battleship. Please place your ship.';
            this.messenger.sendMessageTo(messenger_1.MessageType.StartGame, {
                playerNumber: i,
                startInfo: playerInfo,
                gameId: this.id,
                opponent: this.playerAccounts[1 - i].username
            }, this.playerAccounts[i].token);
        }
    }
    getName() {
        return this.playerAccounts[0].username + ' vs ' + this.playerAccounts[1].username;
    }
}
exports.GameServer = GameServer;
