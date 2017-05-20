import { BattleshipGame, Point, Direction, ShipType } from './battleship';
import * as randomJs from 'random-js';

const rng = new randomJs();



export class RandomAI {
    private targets: Point[];
    constructor(private playerNumber: number, private game: BattleshipGame) {
        this.targets = [];
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                this.targets.push(new Point(i, j));
            }
        }
    }

    public getPlacement(): { ship: ShipType, loc: Point, dir: Direction }[] {
        let res = [];
        for (let i = 0; i < 5; i++) {
            let dat = {
                ship: i,
                loc: new Point(rng.integer(0, 9), rng.integer(0, 9)),
                dir: rng.integer(0, 3)
            }
            if (this.game.placeShip(this.playerNumber, dat.ship, dat.loc, dat.dir)) {
                res.push(dat);
            } else {
                i--;
            }
        }
        console.log(res);
        return res;
    }

    public getTarget(): Point {
        let idx = rng.integer(0, this.targets.length - 1);
        console.log(this.targets.length);
        return this.targets.splice(idx, 1)[0];
    }

}