import { ServerMessenger, Message, MessageType } from './messenger';
import { getToken } from './tokens';
import { Account } from './account';
import { GameServer } from './gameServer';
import { MatchQueue } from './matchmaking';
import * as os from 'os';
import * as express from 'express';

const cleaningTime = 1000 * 60 * 30;

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
        this.gameQueue = new MatchQueue(this, this.messenger, this.makeGame.bind(this));
        this.messenger.addHandeler(MessageType.AnonymousLogin, (msg) => this.anonLogin(msg));
        this.messenger.onMessage = (msg: Message) => {
            if (this.accounts.has(msg.source))
                this.accounts.get(msg.source).freshen();
        }

        this.passMessagesToGames();
        setInterval(this.pruneAccounts.bind(this), cleaningTime)
    }



    private pruneAccount(acc: Account) {
        this.accounts.delete(acc.token);
        this.gameQueue.removeFromQueue(acc.token);
        if (acc.gameId && this.games.has(acc.gameId)) {
            this.games.get(acc.gameId).end();
        }
    }

    private pruneAccounts() {
        console.log('Pruning acounts');
        let now = Date.now();
        for (let account of this.accounts.values()) {
            let time = (account.lastUsed.getTime() - now);
            if (time > cleaningTime) {
                console.log('prune', account.username);
                this.pruneAccount(account);
            }
        }
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
            queue: this.gameQueue.getPlayersInQueue(),
            memory: {
                server: process.memoryUsage(),
                totalFree: os.freemem(),
                totalUsed: os.totalmem()
            }
        }
    }

    public isLoggedIn(token: string): boolean {
        return this.accounts.has(token);
    }

    private anonLogin(msg: Message) {
        let userName = msg.data.username;
        let token = getToken();
        let acc = new Account(token, userName);

        this.messenger.sendMessageTo(MessageType.LoginResponce, {
            username: acc.username,
            token: acc.token
        }, msg.source);

        this.changeToken(acc, msg.source, token);
    }

    private changeToken(account: Account, oldToken: string, newToken: string) {
        this.accounts.set(newToken, account);
        this.messenger.changeToken(oldToken, newToken);
    }




    private passMessagesToGames() {
        this.messenger.addHandeler(MessageType.GameAction, (msg: Message) => {
            let acc = this.accounts.get(msg.source);
            if (!acc) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Can't take a game action. Your not logged in.", msg.source);
                return;
            }
            let id = acc.getGame();
            if (!id) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Can't take a game action. Your not in a game.", msg.source);
                return;
            }
            if (!this.games.has(id)) {
                this.messenger.sendMessageTo(MessageType.ClientError, "Game does not exist.", msg.source);
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


