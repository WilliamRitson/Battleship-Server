import * as readline from 'readline';

import { ClientMessenger, MessageType, Message } from './messenger';
import { BattleshipGame, Direction, GameAction, GameActionType, GameEvent, GameEventType, Point, ShipType, TileBelief } from './battleship';
import { RandomAI } from './ai';

const websocketPort = process.env.WS_PORT || 2222;
const messenger = new ClientMessenger(websocketPort);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

enum ClientState {
    inGame, inLobby, any
}

class ConsoleClient {
    private commands: Map<string, (args: string[]) => void> = new Map<string, (args: string[]) => void>();
    private gameId: string = null;
    private state: ClientState = ClientState.inLobby;
    private game: BattleshipGame = null;
    private playerNumber: number;
    private AI: RandomAI = null;

    constructor() {
        this.registerCommand('join', this.join, ClientState.inLobby);
        this.registerCommand('place', this.place, ClientState.inGame);
        this.registerCommand('finish', this.finish, ClientState.inGame);
        this.registerCommand('fire', this.fire, ClientState.inGame);
        this.registerCommand('startAI', this.startAI, ClientState.inGame);
        this.registerCommand('intel', this.showIntel, ClientState.inGame)
        this.registerCommand('help', this.help);
        this.registerCommand('exit', (args) => process.exit());
        messenger.addHandeler(MessageType.StartGame, this.startGame, this);
        messenger.addHandeler(MessageType.GameEvent, (msg) => this.handleGameEvent(msg.data), this);
        messenger.addHandeler(MessageType.ClientError, (msg) => console.error('Error:', msg.data), this);
    }

    private showIntel() {
        let intel = this.game.getBeliefs(this.playerNumber);
        console.log(intel);
        let str = intel.map(row => {
            row.map(col => {
                console.log(col);
                switch (col) {
                    case TileBelief.Hit:
                        return 'H';
                    case TileBelief.Miss:
                        return 'M'
                    case TileBelief.Unknown:
                        return 'U';
                }
            }).join('')
        }).join('\n');
        console.log(str);
    }

    private startAI() {
        this.AI = new RandomAI(this.playerNumber, this.game);
        let place = this.AI.getPlacement();
        for (let placeData of place) {
            this.sendGameAction(GameActionType.PlaceShip, placeData);
            this.sendGameAction(GameActionType.FinishPlacement, {});
        }
    }

    private sendGameAction(type: GameActionType, params: any) {
        messenger.sendMessageToServer(MessageType.GameAction, {
            type: type,
            params: params
        } as GameAction);
    }

    private namePlayer(player: number) {
        if (player == this.playerNumber)
            return 'you';
        return 'your opponent'
    }

    private handleGameEvent(event: GameEvent) {
        let params = event.params;
        let ourTurn = false;
        this.game.syncServerEvent(this.playerNumber, event);
        switch (event.type) {
            case GameEventType.Fired:
                console.log('%s fired at (%d, %d) and %s.', this.namePlayer(params.shooter),
                    params.target.row, params.target.col, params.hit ? 'hit' : 'missed');
                ourTurn = params.nextPlayer == this.playerNumber;
                break;
            case GameEventType.Started:
                console.log('The game has started. %s plays first', this.namePlayer(params.turn));
                ourTurn = params.turn == this.playerNumber;
                break;
            case GameEventType.SunkShip:
                console.log('A %s was sunk.', ShipType[params.ship]);
                break;
            case GameEventType.Ended:
                console.log('The game is over %s won.', this.namePlayer(params.winner));
                break;
        }

        if (ourTurn && this.AI) {
            let target = this.AI.getTarget();
            console.log('AI shot at', target)
            if (target)
                this.sendGameAction(GameActionType.Fire, { target: target });
        }

    }

    public registerCommand(cmd: string, callback: (args: string[]) => void, reqState: ClientState = ClientState.any) {
        this.commands.set(cmd, (args) => {
            if (reqState != ClientState.any && this.state != reqState) {
                console.error('Can\'t run command', cmd, 'in state', ClientState[this.state], 'needs', ClientState[reqState]);
                return;
            }
            callback.bind(this)(args);
        });
    }

    private place(args: string[]) {
        let ship = ShipType[args[0]];
        let loc = this.parseLoc(args[1], args[2]);
        let dir = Direction[args[3]];
        if (typeof (dir) === 'string')
            dir = Direction[dir];
        if (!(!isNaN(ship) && loc && dir && Direction[dir])) {
            console.error('Invalid place syntax needs "ship row col dir".')
            return;
        }
        if (this.game.placeShip(this.playerNumber, ship, loc, dir)) {
            console.log('Placing %s at (%d, %d) facing %s', ShipType[ship], loc.row, loc.col, Direction[dir])
            this.sendGameAction(GameActionType.PlaceShip, {
                ship: ship,
                loc: loc,
                dir: dir
            });
        }
    }

    private finish(args: string[]) {
        this.sendGameAction(GameActionType.FinishPlacement, {});
    }

    private parseLoc(row: string, col: string): Point {
        let r = parseInt(row);
        let c = parseInt(col);
        let cord = c + r * 10;
        if (!(row && col && cord >= 0 && cord < 100)) {
            console.error('Could not parse', row, col, 'as loc');
        }
        return new Point(r, c);
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


    private join() {
        messenger.sendMessageToServer(MessageType.JoinQueue, (new Date()).toString());
    }

    private startGame(msg: Message) {
        this.gameId = msg.data.gameId;
        console.log('Joined Game');
        this.playerNumber = msg.data.playerNumber;
        this.game = new BattleshipGame(((p, error) => console.error(error)));
        this.state = ClientState.inGame;
    }

    private help() {
        console.log("commands:", this.commands.keys());
    }

    public prompt() {
        rl.question('> ', (cmd: string) => {
            let parts = cmd.split(/\s+/);
            let handler = this.commands.get(parts[0]);
            if (handler)
                handler(parts.slice(1));
            else
                console.log('No such cmd as', parts[0]);
            this.prompt();
        });
    }

}

const cc = new ConsoleClient();
cc.prompt();

