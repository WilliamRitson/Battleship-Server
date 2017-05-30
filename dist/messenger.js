"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("./tokens");
const WebSocket = require("ws");
var MessageType;
(function (MessageType) {
    // General
    MessageType[MessageType["Info"] = 0] = "Info";
    MessageType[MessageType["ClientError"] = 1] = "ClientError";
    // Accounts
    MessageType[MessageType["AnonymousLogin"] = 2] = "AnonymousLogin";
    MessageType[MessageType["LoginResponce"] = 3] = "LoginResponce";
    // Queuing
    MessageType[MessageType["JoinQueue"] = 4] = "JoinQueue";
    MessageType[MessageType["ExitQueue"] = 5] = "ExitQueue";
    MessageType[MessageType["QueueJoined"] = 6] = "QueueJoined";
    MessageType[MessageType["StartGame"] = 7] = "StartGame";
    // In Game
    MessageType[MessageType["Concede"] = 8] = "Concede";
    MessageType[MessageType["GameEvent"] = 9] = "GameEvent";
    MessageType[MessageType["GameAction"] = 10] = "GameAction";
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
    makeMessageHandler(ws) {
        ws.on('message', (data, flags) => {
            let message;
            try {
                message = JSON.parse(data);
            }
            catch (exception) {
                console.error('Could not parse message from', data, 'got exception', exception);
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
            type: messageType,
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
        this.ws = new WebSocket.Server({ server });
        this.id = 'server';
        this.ws.on('connection', (ws) => {
            ws.on('message', (data) => {
                let msg = JSON.parse(data);
                //if (!this.connections.has(msg.source))
                this.connections.set(msg.source, ws);
            });
            this.makeMessageHandler(ws);
        });
    }
    changeToken(oldToken, newToken) {
        let temp = this.connections.get(oldToken);
        this.connections.delete(oldToken);
        this.connections.set(newToken, temp);
    }
    /**
     * Send Mesage from server to all clients
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
    sendMessageTo(messageType, data, target) {
        return this.sendMessage(messageType, data, this.connections.get(target));
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
