import { ServerMessenger, Message, MessageType } from './messenger';
import { getToken } from './tokens';
import { Account } from './account';
import { GameServer } from './gameServer';
import { MatchQueue } from './matchmaking';
import * as express from 'express';

/**
 * Server that holds references to all the components of the app
 * 
 * @export
 * @class Server
 */
export class Server {
    private gameQueue: MatchQueue;
    private messenger: ServerMessenger;
    private games: Map<string, GameServer> = new Map<string, GameServer>();
    private accounts: Map<string, Account> = new Map<string, Account>();
    private app: express.Express;

    constructor(port: number) {
        this.app = express();
        this.addRoutes();
        let expressServer = this.app.listen(port, () => {
            console.log('Server started on port', port);
        });

        this.messenger = new ServerMessenger(expressServer);
        this.gameQueue = new MatchQueue(this.messenger, this.makeGame.bind(this));
        this.messenger.addHandeler(MessageType.AnonymousLogin, (msg) => this.anonLogin(msg));

        this.passMessagesToGames();
    }

    private addRoutes() {
        this.app.use('/', express.static('public'))
        this.app.get('/report', (req, res) => {
            res.send(this.getReport())
        });
    }

    private getReport() {
        return {
            users: Array.from(this.accounts.values()).map(acc => acc.username),
            games: Array.from(this.games.values()).map(game => game.getName()),
        }
    }

    private anonLogin(msg: Message) {
        let userName = msg.data.username;
        let token = getToken();
        let acc = new Account(token, userName);
        this.accounts.set(token, acc);
        this.messenger.sendMessageTo(MessageType.LoginResponce, {
            username: acc.username,
            token: acc.token
        }, msg.source);
        this.messenger.changeToken(msg.source, token);
    }

    private passMessagesToGames() {
        this.messenger.addHandeler(MessageType.GameAction, (msg: Message) => {
            let acc = this.accounts.get(msg.source);
            if (acc == null) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Can't take a game action. Your not logged in.", msg.source);
            }
            let id = acc.getGame();
            if (id === null) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Can't take a game action. Your not in a game.", msg.source);
                return;
            }
            if (!this.games.has(id)) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Game does not exist..", msg.source);
                return;
            }
            this.games.get(id).handleAction(msg);
        });
    }

    public makeGame(token1: string, token2: string) {
        let id = getToken();
        this.accounts.get(token1).setInGame(id);
        this.accounts.get(token2).setInGame(id);
        let server = new GameServer(this.messenger, this, id, this.accounts.get(token1), this.accounts.get(token2));
        this.games.set(id, server);
        server.start();
    }

    public endGame(gameId: string) {
        if (this.games.has(gameId))
            this.games.delete(gameId);
        else
            console.error('Trying to delete non-existant game with id', gameId);
    }

}


