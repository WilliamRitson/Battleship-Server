"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const tokens_1 = require("./tokens");
const typescript_collections_1 = require("typescript-collections");
/*

Todo
Debug reconnection on mobile
*/
var MessageType;
(function (MessageType) {
    // General
    MessageType[MessageType["Info"] = 0] = "Info";
    MessageType[MessageType["ClientError"] = 1] = "ClientError";
    MessageType[MessageType["Connect"] = 2] = "Connect";
    MessageType[MessageType["Ping"] = 3] = "Ping";
    // Accounts
    MessageType[MessageType["AnonymousLogin"] = 4] = "AnonymousLogin";
    MessageType[MessageType["LoginResponce"] = 5] = "LoginResponce";
    // Queuing
    MessageType[MessageType["JoinQueue"] = 6] = "JoinQueue";
    MessageType[MessageType["ExitQueue"] = 7] = "ExitQueue";
    MessageType[MessageType["QueueJoined"] = 8] = "QueueJoined";
    MessageType[MessageType["StartGame"] = 9] = "StartGame";
    MessageType[MessageType["NewPrivateGame"] = 10] = "NewPrivateGame";
    MessageType[MessageType["JoinPrivateGame"] = 11] = "JoinPrivateGame";
    MessageType[MessageType["CancelPrivateGame"] = 12] = "CancelPrivateGame";
    MessageType[MessageType["PrivateGameReady"] = 13] = "PrivateGameReady";
    // In Game
    MessageType[MessageType["Concede"] = 14] = "Concede";
    MessageType[MessageType["GameEvent"] = 15] = "GameEvent";
    MessageType[MessageType["GameAction"] = 16] = "GameAction";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
/**
 * Abstract class used to communicate via websockets. Can be used by the client or server.
 *
 * @class Messenger
 */
class Messenger {
    constructor(isServer) {
        this.onMessage = () => null;
        this.name = isServer ? 'Server' : 'Client';
        this.handlers = new Map();
    }
    readMessage(data) {
        try {
            let parsed = JSON.parse(data);
            parsed.type = MessageType[parsed.type];
            return parsed;
        }
        catch (e) {
            console.error('Could not parse message json got error', e);
            return null;
        }
    }
    makeMessageHandler(ws) {
        ws.on('message', (data, flags) => {
            let message = this.readMessage(data);
            if (!message) {
                return;
            }
            let cb = this.handlers.get(message.type);
            if (cb) {
                cb(message);
                this.onMessage(message);
            }
            else {
                console.error('No handler for message type', message.type);
            }
        });
    }
    makeMessage(messageType, data) {
        return JSON.stringify({
            type: MessageType[messageType],
            data: data,
            source: this.id
        });
    }
    addHandeler(messageType, callback, context) {
        if (context) {
            callback = callback.bind(context);
        }
        this.handlers.set(messageType, callback);
    }
    sendMessage(messageType, data, ws) {
        if (ws.readyState !== ws.OPEN)
            return false;
        ws.send(this.makeMessage(messageType, data));
        return true;
    }
}
/**
 *  Version of the messenger built to be used by the server.
 *
 * @class ServerMessenger
 * @extends {Messenger}
 */
class ServerMessenger extends Messenger {
    constructor(server) {
        super(true);
        this.connections = new Map();
        this.queues = new Map();
        this.ws = new WebSocket.Server({ server });
        this.id = 'server';
        this.ws.on('connection', (ws) => {
            ws.on('message', (data) => {
                let msg = JSON.parse(data);
                this.connections.set(msg.source, ws);
            });
            this.makeMessageHandler(ws);
        });
        this.addHandeler(MessageType.Connect, (msg) => this.checkQueue(msg.source));
        this.addHandeler(MessageType.Ping, (msg) => null);
    }
    addQueue(token) {
        this.queues.set(token, new typescript_collections_1.Queue());
    }
    deleteUser(token) {
        if (this.connections.has(token))
            this.connections.delete(token);
        if (this.connections.has(token))
            this.queues.delete(token);
    }
    /**
     * Check if we have any unsent messagess to send to a client
     * @param token - The client's id
     */
    checkQueue(token) {
        let queue = this.queues.get(token);
        if (!queue)
            return;
        let ws = this.connections.get(token);
        while (!queue.isEmpty()) {
            console.log('sending enqued message');
            ws.send(queue.dequeue());
        }
    }
    changeToken(oldToken, newToken) {
        let temp = this.connections.get(oldToken);
        this.connections.delete(oldToken);
        this.connections.set(newToken, temp);
    }
    /**
     * Send message from server to all clients
     *
     * @param {string} messageType
     * @param {string} data
     *
     * @memberOf Messenger
     */
    broadcast(messageType, data) {
        this.ws.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(this.makeMessage(messageType, data));
            }
        });
    }
    /**
     * Send a message to a user. If the conneciton is closed, but the user is logged in
     * the message will be enqued. If the user then reconnects, the queued message will
     * be sent
     *
     * @param {MessageType} messageType - The type of message to send
     * @param {(string | object)} data - The data contined within the message
     * @param {string} target - The id of the user to send the message to
     *
     * @memberof ServerMessenger
     */
    sendMessageTo(messageType, data, target) {
        let ws = this.connections.get(target);
        let msg = this.makeMessage(messageType, data);
        if (ws.readyState === ws.OPEN) {
            ws.send(msg);
        }
        else {
            if (this.queues.has(target)) {
                this.queues.get(target).add(msg);
            }
            else
                console.error('ws closed, message lost');
        }
    }
}
exports.ServerMessenger = ServerMessenger;
/**
 * Version of the messenger appropriate for use by a (nodejs) client.
 */
class ClientMessenger extends Messenger {
    sendMessageToServer(messageType, data) {
        this.sendMessage(messageType, data, this.ws);
    }
    constructor(port) {
        super(false);
        this.ws = new WebSocket('ws://localhost:' + port);
        this.id = tokens_1.getToken();
        this.ws.on('open', () => {
            console.log(this.name + ':', 'Conneciton opened');
        });
        this.makeMessageHandler(this.ws);
    }
}
exports.ClientMessenger = ClientMessenger;
const messengers = {
    client: null,
    server: null
};
