import { ServerMessenger, MessageType, Message } from './messenger';
import { BattleshipGame, GameAction, Direction } from './battleship';
import { Account } from './account';

export class GameServer {
    private playerAccounts: Account[] = [];
    private game: BattleshipGame;
    private id: string;

    constructor(private messenger:ServerMessenger, id: string, player1: Account, player2: Account) {
        this.game = new BattleshipGame((player, error) => {
            messenger.sendMessageTo(MessageType.ClientError, error, this.playerAccounts[player].token);
        });
        this.id = id;
        this.playerAccounts.push(player1);
        this.playerAccounts.push(player2);
    }


    private playerNum(playerToken: string) {
        return this.playerAccounts.findIndex((acc) => acc.token === playerToken);
    }

    public handleAction(msg: Message) {
        let action: GameAction = msg.data;
        action.player = this.playerNum(msg.source);
        let events = this.game.handleAction(action);

        this.playerAccounts.forEach(acc => {
            events.forEach(event => {
                this.messenger.sendMessageTo(MessageType.GameEvent, event, acc.token);
            })
        })
    }

    public start() {
        for (let i = 0; i < this.playerAccounts.length; i++) {
            let playerInfo = 'Welcome to Battleship. Please place your ship.';
            this.messenger.sendMessageTo(MessageType.StartGame, {
                playerNumber: i,
                startInfo: playerInfo,
                gameId: this.id
            }, this.playerAccounts[i].token);
        }
    }
}