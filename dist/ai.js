"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const battleship_1 = require("./battleship");
const randomJs = require("random-js");
const rng = new randomJs();
class AI {
    constructor(playerNumber, game) {
        this.playerNumber = playerNumber;
        this.game = game;
    }
    getPlacement() {
        let res = [];
        for (let i = 0; i < 5; i++) {
            let dat = {
                ship: i,
                loc: new battleship_1.Point(rng.integer(0, 9), rng.integer(0, 9)),
                dir: rng.integer(0, 3)
            };
            if (this.game.placeShip(this.playerNumber, dat.ship, dat.loc, dat.dir)) {
                res.push(dat);
            }
            else {
                i--;
            }
        }
        return res;
    }
}
exports.AI = AI;
class RandomAI extends AI {
    constructor(playerNumber, game) {
        super(playerNumber, game);
        this.targets = [];
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                this.targets.push(new battleship_1.Point(i, j));
            }
        }
    }
    getTarget() {
        let idx = rng.integer(0, this.targets.length - 1);
        return this.targets.splice(idx, 1)[0];
    }
}
exports.RandomAI = RandomAI;
/*
export class HunterSeeker extends AI {
    constructor(playerNumber: number, game: BattleshipGame) {
        super(playerNumber, game);
    }

    public getTarget(): Point {
        let intel = this.game.getBeliefs(this.playerNumber);
        let priorityTargets = [];
        let secondaryTargets = [];

        for (let r = 0; r < intel.length; r++) {
            for (let c = 0; c < intel[r].length; c++) {
                switch(intel[r][c]) {
                    case TileBelief.Unknown:
                        secondaryTargets.push(TileBelief.Unknown)
                        break;
                    case TileBelief.Hit:
                        this.game.getAdjacent
                }
            }
        }
    }

}
*/ 
