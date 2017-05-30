"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validator_1 = require("./validator");
const randomJs = require("random-js");
const rng = new randomJs();
var TileBelief;
(function (TileBelief) {
    TileBelief[TileBelief["Unknown"] = 0] = "Unknown";
    TileBelief[TileBelief["Hit"] = 1] = "Hit";
    TileBelief[TileBelief["Miss"] = -1] = "Miss";
})(TileBelief = exports.TileBelief || (exports.TileBelief = {}));
var ShipType;
(function (ShipType) {
    ShipType[ShipType["Carrier"] = 0] = "Carrier";
    ShipType[ShipType["Battleship"] = 1] = "Battleship";
    ShipType[ShipType["Cruiser"] = 2] = "Cruiser";
    ShipType[ShipType["Submarine"] = 3] = "Submarine";
    ShipType[ShipType["Destroyer"] = 4] = "Destroyer";
    ShipType[ShipType["None"] = 5] = "None";
})(ShipType = exports.ShipType || (exports.ShipType = {}));
var Direction;
(function (Direction) {
    Direction[Direction["North"] = 0] = "North";
    Direction[Direction["East"] = 1] = "East";
    Direction[Direction["South"] = 2] = "South";
    Direction[Direction["West"] = 3] = "West";
})(Direction = exports.Direction || (exports.Direction = {}));
class Point {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    add(other) {
        this.row += other.row;
        this.col += other.col;
    }
    moveInDirection(dir) {
        this.add(exports.dirMappings[dir]);
    }
    copy() {
        return new Point(this.row, this.col);
    }
    inBounds(rowLow, rowHigh, colLow, colHigh) {
        return this.row >= rowLow && this.row < rowHigh && this.col >= colLow && this.col < colHigh;
    }
    toString() {
        return `(${this.row}, ${this.col})`;
    }
}
exports.Point = Point;
var GameActionType;
(function (GameActionType) {
    GameActionType[GameActionType["PlaceShip"] = 0] = "PlaceShip";
    GameActionType[GameActionType["FinishPlacement"] = 1] = "FinishPlacement";
    GameActionType[GameActionType["Fire"] = 2] = "Fire";
    GameActionType[GameActionType["Quit"] = 3] = "Quit";
})(GameActionType = exports.GameActionType || (exports.GameActionType = {}));
var GameEventType;
(function (GameEventType) {
    GameEventType[GameEventType["Started"] = 0] = "Started";
    GameEventType[GameEventType["Fired"] = 1] = "Fired";
    GameEventType[GameEventType["SunkShip"] = 2] = "SunkShip";
    GameEventType[GameEventType["Ended"] = 3] = "Ended";
})(GameEventType = exports.GameEventType || (exports.GameEventType = {}));
class GameEvent {
    constructor(type, params, owner = null, redact = null) {
        this.type = type;
        this.params = params;
        this.owner = owner;
        this.redact = redact;
    }
}
exports.GameEvent = GameEvent;
exports.shipSizes = [5, 4, 3, 3, 2];
exports.dirMappings = [new Point(-1, 0), new Point(0, 1), new Point(1, 0), new Point(0, -1)];
const playerNum = 2;
const boardSize = 10;
class BattleshipGame {
    constructor(errorHandeler) {
        this.errorHandeler = errorHandeler;
        this.winner = -1;
        this.validator = new validator_1.Validator();
        this.reality = [];
        this.beliefs = [];
        for (let i = 0; i < playerNum; i++) {
            this.reality.push(this.makeBoard(ShipType.None));
            this.beliefs.push(this.makeBoard(TileBelief.Unknown));
        }
        let totalHits = exports.shipSizes.reduce((a, b) => a + b);
        this.remainingHits = [totalHits, totalHits];
        this.hitsPerShip = [exports.shipSizes.slice(), exports.shipSizes.slice()];
        this.playerReady = [false, false];
        this.unplacedPieces = [
            [ShipType.Carrier, ShipType.Battleship, ShipType.Cruiser, ShipType.Submarine, ShipType.Destroyer],
            [ShipType.Carrier, ShipType.Battleship, ShipType.Cruiser, ShipType.Submarine, ShipType.Destroyer]
        ];
        this.readyPlayers = 0;
        this.gameStarted = false;
        this.playerTurn = 0;
        this.actionHandelers = new Map();
        this.events = [];
        this.addActionHandeler(GameActionType.PlaceShip, (act) => {
            let params = this.validator.validateShipParamaters(act.params);
            if (params) {
                this.placeShip(act.player, params.ship, new Point(params.loc.row, params.loc.col), params.dir);
            }
            else {
                this.errorHandeler(act.params.player, "Can't parse " + act + " as PlaceShip action.");
            }
        });
        this.addActionHandeler(GameActionType.FinishPlacement, (act) => {
            this.finishPlacement(act.player);
        });
        this.addActionHandeler(GameActionType.Fire, (act) => {
            let params = this.validator.validateFireParamaters(act.params);
            if (params) {
                this.fireAt(act.player, new Point(params.target.row, params.target.col));
            }
            else {
                this.errorHandeler(act.params.player, "Can't parse " + act + " as Fire action.");
            }
        });
        this.addActionHandeler(GameActionType.Quit, (act) => {
            this.quit(act.player);
        });
    }
    quit(player) {
        this.winner = this.getOpponent(player);
        this.addGameEvent(GameEventType.Ended, { winner: this.winner, quit: true });
    }
    makeBoard(initial) {
        let board = [];
        for (let j = 0; j < boardSize; j++) {
            board.push([]);
            for (let k = 0; k < boardSize; k++) {
                board[j].push(initial);
            }
        }
        return board;
    }
    hasStarted() {
        return this.gameStarted;
    }
    getTurn() {
        return this.playerTurn;
    }
    getWinner() {
        return this.winner;
    }
    syncServerEvent(owner, event) {
        switch (event.type) {
            case GameEventType.Started:
                this.playerTurn = event.params.turn;
                this.gameStarted = true;
                break;
            case GameEventType.Fired:
                let params = event.params;
                let targetedPlayer = this.getOpponent(event.params.shooter);
                this.beliefs[event.params.shooter][params.target.row][params.target.col] =
                    params.hit ? TileBelief.Hit : TileBelief.Miss;
                this.playerTurn = params.nextPlayer;
                break;
            case GameEventType.Ended:
                this.winner = event.params.winner;
        }
    }
    addActionHandeler(type, cb) {
        this.actionHandelers.set(type, cb.bind(this));
    }
    addGameEvent(type, params, owner = null, redact = null) {
        this.events.push(new GameEvent(type, params, owner, redact));
    }
    handleAction(action) {
        let mark = this.events.length;
        let handeler = this.actionHandelers.get(action.type);
        if (!handeler)
            return [];
        let sig = handeler(action);
        return this.events.slice(mark);
    }
    addError(player, message) {
        this.errorHandeler(player, message);
    }
    getOpponent(player) {
        return (player + 1) % playerNum;
    }
    nextTurn() {
        this.playerTurn = this.getOpponent(this.playerTurn);
    }
    getBeliefs(player) {
        return this.beliefs[player];
    }
    fireAt(shootingPlayer, target) {
        // Error checking
        if (!this.gameStarted) {
            this.addError(shootingPlayer, 'The game has not started yet.');
            return;
        }
        if (this.winner != -1) {
            this.addError(shootingPlayer, 'The game is over.');
            return;
        }
        if (this.playerTurn != shootingPlayer) {
            this.addError(shootingPlayer, 'It is not your turn.');
            return;
        }
        if (!target.inBounds(0, 10, 0, 10)) {
            this.addError(shootingPlayer, 'Target out of bounds.');
            return;
        }
        if (this.beliefs[shootingPlayer][target.row][target.col] != TileBelief.Unknown) {
            this.addError(shootingPlayer, 'You have already fired at that location.');
            return;
        }
        let op = this.getOpponent(shootingPlayer);
        // Game Logic
        let board = this.reality[op];
        let ShipHit = board[target.row][target.col];
        let hit = ShipHit != ShipType.None;
        if (hit) {
            this.beliefs[shootingPlayer][target.row][target.col] = TileBelief.Hit;
            this.remainingHits[op]--;
            this.hitsPerShip[op][ShipHit]--;
        }
        else {
            this.beliefs[shootingPlayer][target.row][target.col] = TileBelief.Miss;
        }
        // Report results to players
        this.addGameEvent(GameEventType.Fired, {
            target: target,
            shooter: shootingPlayer,
            hit: hit,
            nextPlayer: op
        });
        // Check if ship sunk
        if (this.hitsPerShip[op][ShipHit] < 1) {
            this.addGameEvent(GameEventType.SunkShip, {
                owner: op,
                ship: ShipHit
            }, shootingPlayer, null);
        }
        // Check if the game ended
        if (this.remainingHits[op] < 1) {
            this.addGameEvent(GameEventType.Ended, {
                winner: shootingPlayer,
                quit: false
            }, shootingPlayer, null);
            this.winner = shootingPlayer;
            this.playerTurn = 3;
        }
        this.nextTurn();
    }
    finishPlacement(player) {
        if (this.unplacedPieces[player].length > 0) {
            this.addError(player, 'You still have unplayed peices.');
            return;
        }
        if (this.playerReady[player])
            return;
        this.readyPlayers++;
        this.playerReady[player] = true;
        if (this.readyPlayers === playerNum) {
            this.gameStarted = true;
            this.playerTurn = rng.integer(0, 1);
            this.addGameEvent(GameEventType.Started, { turn: this.playerTurn });
        }
    }
    placeShip(player, ship, location, dir) {
        if (!this.canPlaceShip(player, ship, location, dir))
            return false;
        let board = this.reality[player];
        let crawler = location.copy();
        for (let i = 0; i < exports.shipSizes[ship]; i++) {
            board[crawler.row][crawler.col] = ship;
            crawler.moveInDirection(dir);
        }
        this.unplacedPieces[player].splice(this.unplacedPieces[player].indexOf(ship), 1);
        return true;
    }
    canPlaceShip(player, ship, location, dir) {
        if (this.unplacedPieces[player].indexOf(ship) === -1) {
            this.addError(player, 'You already placed a ' + ShipType[ship]);
            return false;
        }
        let board = this.reality[player];
        let crawler = location.copy();
        for (let i = 0; i < exports.shipSizes[ship]; i++) {
            if (!board[crawler.row] || board[crawler.row][crawler.col] != ShipType.None) {
                this.addError(player, 'That location would overlap with another ship.');
                return false;
            }
            crawler.moveInDirection(dir);
        }
        return true;
    }
    boardToString(board, formatCell) {
        return board.map(row => {
            row.map(formatCell).join('');
        }).join('\n');
    }
}
exports.BattleshipGame = BattleshipGame;
