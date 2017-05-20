import * as readline from 'readline';

import { getClientMessenger, MessageType, Message } from './messenger';
import { BattleshipGame, Direction, GameAction, GameActionType, GameEvent, ShipType } from './battleship';


const messenger = getClientMessenger();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

enum ClientState {
    inGame, inLobby, any
}

class ConsoleClient {
    private handlers: Map<string, (args: string[]) => void> = new Map<string, (args: string[]) => void>();
    private gameId: string = null;
    private state: ClientState = ClientState.inLobby;

    constructor() {
        this.registerCommand('join', this.join, ClientState.inLobby);
        this.registerCommand('place', this.place, ClientState.inGame);
        this.registerCommand('finish', this.finish, ClientState.inGame);
        this.registerCommand('fire', this.fire, ClientState.inGame);
        this.registerCommand('help', this.help);
        this.registerCommand('exit', (args) => process.exit());
        messenger.addHandeler(MessageType.StartGame, this.startGame, this);
        messenger.addHandeler(MessageType.GameEvent, (msg) => this.handleGameEvent(msg.data), this);
        messenger.addHandeler(MessageType.ClientError, (msg) => console.error('Error:', msg.data), this);
    }

    private sendGameAction(type: GameActionType, params: any) {
        messenger.sendMessageToServer(MessageType.GameAction, {
            type: type,
            params: params
        } as GameAction);
    }

    private place(args: string[]) {
        let ship = ShipType[args[0]];
        let row = parseInt(args[1]);
        let col = parseInt(args[2]);
        let dir = Direction[args[3]];
        if (typeof (dir) === 'string')
            dir = Direction[dir];
        if (!(ship && row && col && dir && Direction[dir])) {
            console.error('Invalid place syntax needs "ship row col dir".')
            return;
        }
        console.log('Placing %s at (%d, %d) facing %s', ShipType[ship], row, col, Direction[dir])
        this.sendGameAction(GameActionType.PlaceShip, {
            ship: ship,
            loc: { row: row, col: col },
            dir: dir
        });
    }

    private finish(args: string[]) {
        this.sendGameAction(GameActionType.FinishPlacement, {});
    }

    private parseLoc(row: string, col: string) {
        let r = parseInt(row);
        let c = parseInt(col);
        let cord = c + r * 10;
        if (!(row && col && cord >= 0 && cord < 100)) {
            console.error('Could not parse', row, col, 'as loc');
        }
        return { row: r, col: c };
    }

    private fire(args: string[]) {
        let loc = this.parseLoc(args[0], args[1]);
        if (!loc) {
            console.error('Invalid place syntax needs "fire row col".')
            return;
        }
        console.log('Firing at location (%d, %d)', loc.row, loc.col)
        this.sendGameAction(GameActionType.Fire, {
            target: loc
        });
    }

    private handleGameEvent(event: GameEvent) {
        console.log('ev', event);
    }

    private join() {
        messenger.sendMessageToServer(MessageType.JoinQueue, (new Date()).toString());
    }

    private startGame(msg: Message) {
        this.gameId = msg.data.gameId;
        console.log('Joined Game with Id', this.gameId);
        console.log('You play', msg.data.playerNumber == 0 ? 'first' : 'second');
        console.log(msg.data.startInfo);
        this.state = ClientState.inGame;
    }

    private help() {
        console.log("commands:", this.handlers.keys());
    }

    public prompt() {
        rl.question('> ', (cmd: string) => {
            let parts = cmd.split(/\s+/);
            let handler = this.handlers.get(parts[0]);
            if (handler)
                handler(parts.slice(1));
            else
                console.log('No such cmd as', parts[0]);
            this.prompt();
        });
    }

    public registerCommand(cmd: string, callback: (args: string[]) => void, reqState: ClientState = ClientState.any) {
        this.handlers.set(cmd, (args) => {
            if (reqState != ClientState.any && this.state != reqState) {
                console.error('Can\'t run command', cmd, 'in state', ClientState[this.state], 'needs', ClientState[reqState]);
                return;
            }
            callback.bind(this)(args);
        });
    }
}

const cc = new ConsoleClient();
cc.prompt();

