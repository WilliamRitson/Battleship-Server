"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_collections_1 = require("typescript-collections");
const messenger_1 = require("./messenger");
const tokens_1 = require("./tokens");
class MatchQueue {
    constructor(server, messenger, startGame) {
        this.server = server;
        this.messenger = messenger;
        this.startGame = startGame;
        this.playerQueue = new typescript_collections_1.LinkedDictionary();
        this.privateGames = new Map();
        messenger.addHandeler(messenger_1.MessageType.JoinQueue, this.onJoinQueue, this);
        messenger.addHandeler(messenger_1.MessageType.ExitQueue, this.onExitQueue, this);
        messenger.addHandeler(messenger_1.MessageType.NewPrivateGame, this.newPrivateGame, this);
        messenger.addHandeler(messenger_1.MessageType.JoinPrivateGame, this.joinPrivateGame, this);
        messenger.addHandeler(messenger_1.MessageType.CancelPrivateGame, this.cancelPrivateGame, this);
    }
    newPrivateGame(message) {
        if (!this.server.isLoggedIn(message.source)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "You must be logged in to start a private game.", message.source);
            return;
        }
        let token = tokens_1.getToken(16);
        this.privateGames.set(token, message.source);
        this.messenger.sendMessageTo(messenger_1.MessageType.PrivateGameReady, { gameId: token }, message.source);
    }
    joinPrivateGame(message) {
        if (!this.server.isLoggedIn(message.source)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "You must be logged in to join a private game.", message.source);
            return;
        }
        if (!message.data || !message.data.gameId || !this.privateGames.has(message.data.gameId)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "No game with that id.", message.source);
            return;
        }
        this.startGame(this.privateGames.get(message.data.gameId), message.source);
        this.privateGames.delete(message.data.gameId);
    }
    cancelPrivateGame(message) {
        if (!this.server.isLoggedIn(message.source)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "You must be logged in to camcel a private game.", message.source);
            return;
        }
        if (!message.data || !message.data.gameId || !this.privateGames.has(message.data.gameId)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "No game with that id.", message.source);
            return;
        }
        this.privateGames.delete(message.data.gameId);
    }
    getPlayersInQueue() {
        return this.playerQueue.size();
    }
    makeGame(player1, player2) {
        this.playerQueue.remove(player1);
        this.playerQueue.remove(player2);
        this.startGame(player1, player2);
    }
    removeFromQueue(token) {
        if (this.playerQueue.containsKey(token))
            this.playerQueue.remove(token);
    }
    searchQueue(playerToken) {
        let found = false;
        let other = undefined;
        this.playerQueue.forEach(otherToken => {
            if (found)
                return;
            if (otherToken == playerToken)
                return;
            // Todo: Add logic to filter out inappropiate matchups
            other = otherToken;
            found = true;
        });
        if (other) {
            this.makeGame(playerToken, other);
        }
    }
    onJoinQueue(message) {
        if (!this.server.isLoggedIn(message.source)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "You need to be logged in to joint he queue", message.source);
        }
        let playerToken = message.source;
        if (this.playerQueue.containsKey(playerToken)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "Already in queue.", playerToken);
            return;
        }
        this.playerQueue.setValue(playerToken, (new Date()).getTime());
        this.messenger.sendMessageTo(messenger_1.MessageType.QueueJoined, {}, message.source);
        this.searchQueue(playerToken);
    }
    onExitQueue(message) {
        let playerToken = message.source;
        this.removeFromQueue(playerToken);
    }
}
exports.MatchQueue = MatchQueue;
