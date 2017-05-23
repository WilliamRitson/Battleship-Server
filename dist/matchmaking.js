"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_collections_1 = require("typescript-collections");
const messenger_1 = require("./messenger");
class MatchQueue {
    constructor(messenger, startGame) {
        this.messenger = messenger;
        this.startGame = startGame;
        this.playerQueue = new typescript_collections_1.LinkedDictionary();
        messenger.addHandeler(messenger_1.MessageType.JoinQueue, this.onJoinQueue, this);
        messenger.addHandeler(messenger_1.MessageType.ExitQueue, this.onexitQueue, this);
    }
    getPlayersInQueue() {
        return this.playerQueue.size();
    }
    makeGame(player1, player2) {
        this.playerQueue.remove(player1);
        this.playerQueue.remove(player2);
        this.startGame(player1, player2);
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
        let playerToken = message.source;
        if (this.playerQueue.containsKey(playerToken)) {
            this.messenger.sendMessageTo(messenger_1.MessageType.ClientError, "Already in queue.", playerToken);
            return;
        }
        this.playerQueue.setValue(playerToken, (new Date()).getTime());
        this.searchQueue(playerToken);
    }
    onexitQueue(message) {
        let playerToken = message.source;
        this.playerQueue.remove(playerToken);
    }
}
exports.MatchQueue = MatchQueue;
