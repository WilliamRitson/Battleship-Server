import { NameGenerator } from './nameGenerator';

let ng = new NameGenerator();

export class Account {
    username: string;
    token: string;
    gameId: string;

    constructor(token: string) {
        this.token = token;
        this.username = ng.getName();
        this.gameId = null;
    }

    public setInGame(gameId: string) {
        this.gameId = gameId;
    }

    public getGame() {
        return this.gameId;
    }
}
