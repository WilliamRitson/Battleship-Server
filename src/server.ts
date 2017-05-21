import { ServerMessenger, Message, MessageType } from './messenger';
import { getToken } from './tokens';
import { Account } from './account';
import { GameServer } from './gameServer';
import { MatchQueue } from './matchmaking';

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

    constructor(websocketPort: number) {
        this.messenger = new ServerMessenger(websocketPort);
        this.gameQueue = new MatchQueue(this.messenger, this.makeGame.bind(this));
        this.passMessagesToGames();
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
            this.games.get(id).handleAction(msg);
        });
    }

    public makeGame(token1: string, token2: string) {
        if (!this.accounts.has(token1))
            this.accounts.set(token1, new Account(token1));
        if (!this.accounts.has(token2))
            this.accounts.set(token2, new Account(token2));
        let id = getToken();
        this.accounts.get(token1).setInGame(id);
        this.accounts.get(token2).setInGame(id);

        let server = new GameServer(this.messenger, id, this.accounts.get(token1), this.accounts.get(token2));
        this.games.set(id, server);
        server.start();
    }

}


