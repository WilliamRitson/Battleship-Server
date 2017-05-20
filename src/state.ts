import { getToken } from './tokens';
import { BattleshipGame } from './battleship';
import { Account } from './account';
import { getServerMessenger, Message, MessageType } from './messenger';
import { GameServer } from './gameServer';

const messenger = getServerMessenger();

class ServerState {
    private games: Map<string, GameServer> = new Map<string, GameServer>();
    private accounts: Map<string, Account> = new Map<string, Account>();

    constructor() {
        messenger.addHandeler(MessageType.GameAction, (msg: Message) => {
            let acc = this.accounts.get(msg.source);
            if (acc == null) {
                messenger.sendMessageTo(MessageType.ClientError, "Can't take game action. Your not logged in.", msg.source);
            }
            let id = acc.getGame();
            if (id === null) {
                messenger.sendMessageTo(MessageType.ClientError, "Can't take game action. Your not in a game.", msg.source);
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
        
        let server = new GameServer(id, this.accounts.get(token1), this.accounts.get(token2));
        this.games.set(id, server);
        server.start();
    }
}

export const state = new ServerState();