import { getToken } from './tokens';
import * as WebSocket from 'ws';

export enum MessageType {
    // General
    Info, ClientError,

    // Accounts
    AnonymousLogin, LoginResponce,

    // Queuing
    JoinQueue, ExitQueue, QueueJoined, StartGame,

    // In Game
    Concede, GameEvent, GameAction
}

export interface Message {
    source: string;
    type: string;
    data: any;
}


/**
 * Abstract class used to communicate via websockets. Can be used by the client or server. 
 * 
 * @class Messenger
 */
abstract class Messenger {
    protected handlers: Map<string, (Message) => void>;
    protected name: string;
    protected id: string;
    public onMessage: (message: Message) => void = () => null;

    constructor(isServer) {
        this.name = isServer ? 'Server' : 'Client';
        this.handlers = new Map();
    }

    protected makeMessageHandler(ws) {
        ws.on('message', (data, flags) => {
            let message: Message;
            try {
                message = JSON.parse(data) as Message;
            } catch (exception) {
                console.error('Could not parse message from', data, 'got exception', exception);
                return;
            }
            let cb = this.handlers.get(message.type);
            if (cb) {
                cb(message);
                this.onMessage(message);
            } else {
                console.error('No handler for message type', message.type);
            }
        });
    }

    protected makeMessage(messageType: MessageType, data: string | object): string {
        return JSON.stringify({
            type: messageType,
            data: data,
            source: this.id
        });
    }

    public addHandeler(messageType, callback: (message: Message) => void, context?: any) {
        if (context) {
            callback = callback.bind(context);
        }
        this.handlers.set(messageType, callback);
    }


    protected sendMessage(messageType: MessageType, data: string | object, ws: WebSocket): boolean {
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
export class ServerMessenger extends Messenger {
    private ws: WebSocket.Server;
    protected connections: Map<string, any>;


    constructor(server) {
        super(true);
        this.connections = new Map<string, any>();
        this.ws = new WebSocket.Server({ server });
        this.id = 'server';
        this.ws.on('connection', (ws) => {
            ws.on('message', (data) => {
                let msg = JSON.parse(data) as Message;
                if (!this.connections.has(msg.source))
                    this.connections.set(msg.source, ws);
            });
            this.makeMessageHandler(ws);
        });
    }

    public changeToken(oldToken: string, newToken: string) {
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
    public broadcast(messageType: MessageType, data: string) {
        this.ws.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(this.makeMessage(messageType, data));
            }
        });
    }

    public sendMessageTo(messageType: MessageType, data: string | object, target: string) {
        return this.sendMessage(messageType, data, this.connections.get(target));
    }
}

/**
 * Version of the messenger appropriate for use by a (nodejs) client.
 */
export class ClientMessenger extends Messenger {
    private ws: WebSocket;

    public sendMessageToServer(messageType: MessageType, data: string | object) {
        this.sendMessage(messageType, data, this.ws);
    }

    constructor(port: number) {
        super(false);
        this.ws = new WebSocket('ws://localhost:' + port);
        this.id = getToken();
        this.ws.on('open', () => {
            console.log(this.name + ':', 'Conneciton opened');
        });
        this.makeMessageHandler(this.ws);
    }
}

const messengers = {
    client: null,
    server: null
}