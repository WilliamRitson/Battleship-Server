"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const messenger_1 = require("./messenger");
const battleship_1 = require("./battleship");
const ai_1 = require("./ai");
const websocketPort = process.env.WS_PORT || 2222;
const messenger = new messenger_1.ClientMessenger(websocketPort);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var ClientState;
(function (ClientState) {
    ClientState[ClientState["inGame"] = 0] = "inGame";
    ClientState[ClientState["inLobby"] = 1] = "inLobby";
    ClientState[ClientState["any"] = 2] = "any";
})(ClientState || (ClientState = {}));
class ConsoleClient {
    constructor() {
        this.commands = new Map();
        this.gameId = null;
        this.state = ClientState.inLobby;
        this.game = null;
        this.AI = null;
        this.registerCommand('join', this.join, ClientState.inLobby);
        this.registerCommand('place', this.place, ClientState.inGame);
        this.registerCommand('finish', this.finish, ClientState.inGame);
        this.registerCommand('fire', this.fire, ClientState.inGame);
        this.registerCommand('startAI', this.startAI, ClientState.inGame);
        this.registerCommand('intel', this.showIntel, ClientState.inGame);
        this.registerCommand('help', this.help);
        this.registerCommand('exit', (args) => process.exit());
        messenger.addHandeler(messenger_1.MessageType.StartGame, this.startGame, this);
        messenger.addHandeler(messenger_1.MessageType.GameEvent, (msg) => this.handleGameEvent(msg.data), this);
        messenger.addHandeler(messenger_1.MessageType.ClientError, (msg) => console.error('Error:', msg.data), this);
    }
    showIntel() {
        let intel = this.game.getBeliefs(this.playerNumber);
        console.log(intel);
        let str = intel.map(row => {
            row.map(col => {
                console.log(col);
                switch (col) {
                    case battleship_1.TileBelief.Hit:
                        return 'H';
                    case battleship_1.TileBelief.Miss:
                        return 'M';
                    case battleship_1.TileBelief.Unknown:
                        return 'U';
                }
            }).join('');
        }).join('\n');
        console.log(str);
    }
    startAI() {
        this.AI = new ai_1.RandomAI(this.playerNumber, this.game);
        let place = this.AI.getPlacement();
        for (let placeData of place) {
            this.sendGameAction(battleship_1.GameActionType.PlaceShip, placeData);
            this.sendGameAction(battleship_1.GameActionType.FinishPlacement, {});
        }
    }
    sendGameAction(type, params) {
        messenger.sendMessageToServer(messenger_1.MessageType.GameAction, {
            type: type,
            params: params
        });
    }
    namePlayer(player) {
        if (player == this.playerNumber)
            return 'you';
        return 'your opponent';
    }
    handleGameEvent(event) {
        let params = event.params;
        let ourTurn = false;
        this.game.syncServerEvent(this.playerNumber, event);
        switch (event.type) {
            case battleship_1.GameEventType.Fired:
                console.log('%s fired at (%d, %d) and %s.', this.namePlayer(params.shooter), params.target.row, params.target.col, params.hit ? 'hit' : 'missed');
                ourTurn = params.nextPlayer == this.playerNumber;
                break;
            case battleship_1.GameEventType.Started:
                console.log('The game has started. %s plays first', this.namePlayer(params.turn));
                ourTurn = params.turn == this.playerNumber;
                break;
            case battleship_1.GameEventType.SunkShip:
                console.log('A %s was sunk.', battleship_1.ShipType[params.ship]);
                break;
            case battleship_1.GameEventType.Ended:
                console.log('The game is over %s won.', this.namePlayer(params.winner));
                break;
        }
        if (ourTurn && this.AI) {
            let target = this.AI.getTarget();
            console.log('AI shot at', target);
            if (target)
                this.sendGameAction(battleship_1.GameActionType.Fire, { target: target });
        }
    }
    registerCommand(cmd, callback, reqState = ClientState.any) {
        this.commands.set(cmd, (args) => {
            if (reqState != ClientState.any && this.state != reqState) {
                console.error('Can\'t run command', cmd, 'in state', ClientState[this.state], 'needs', ClientState[reqState]);
                return;
            }
            callback.bind(this)(args);
        });
    }
    place(args) {
        let ship = battleship_1.ShipType[args[0]];
        let loc = this.parseLoc(args[1], args[2]);
        let dir = battleship_1.Direction[args[3]];
        if (typeof (dir) === 'string')
            dir = battleship_1.Direction[dir];
        if (!(!isNaN(ship) && loc && dir && battleship_1.Direction[dir])) {
            console.error('Invalid place syntax needs "ship row col dir".');
            return;
        }
        if (this.game.placeShip(this.playerNumber, ship, loc, dir)) {
            console.log('Placing %s at (%d, %d) facing %s', battleship_1.ShipType[ship], loc.row, loc.col, battleship_1.Direction[dir]);
            this.sendGameAction(battleship_1.GameActionType.PlaceShip, {
                ship: ship,
                loc: loc,
                dir: dir
            });
        }
    }
    finish(args) {
        this.sendGameAction(battleship_1.GameActionType.FinishPlacement, {});
    }
    parseLoc(row, col) {
        let r = parseInt(row);
        let c = parseInt(col);
        let cord = c + r * 10;
        if (!(row && col && cord >= 0 && cord < 100)) {
            console.error('Could not parse', row, col, 'as loc');
        }
        return new battleship_1.Point(r, c);
    }
    fire(args) {
        let loc = this.parseLoc(args[0], args[1]);
        if (!loc) {
            console.error('Invalid place syntax needs "fire row col".');
            return;
        }
        console.log('Firing at location (%d, %d)', loc.row, loc.col);
        this.sendGameAction(battleship_1.GameActionType.Fire, {
            target: loc
        });
    }
    join() {
        messenger.sendMessageToServer(messenger_1.MessageType.JoinQueue, (new Date()).toString());
    }
    startGame(msg) {
        this.gameId = msg.data.gameId;
        console.log('Joined Game');
        this.playerNumber = msg.data.playerNumber;
        this.game = new battleship_1.BattleshipGame(((p, error) => console.error(error)));
        this.state = ClientState.inGame;
    }
    help() {
        console.log("commands:", this.commands.keys());
    }
    prompt() {
        rl.question('> ', (cmd) => {
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
