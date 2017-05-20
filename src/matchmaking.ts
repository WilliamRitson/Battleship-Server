import { LinkedDictionary } from 'typescript-collections';
import { Message, MessageType, ServerMessenger } from './messenger';
import { Server } from './server';


export class MatchQueue {
    private playerQueue = new LinkedDictionary<string, number>();

    constructor(private messenger: ServerMessenger, private startGame: (p1, p2) => void) {
        messenger.addHandeler(MessageType.JoinQueue, this.onJoinQueue, this);
        messenger.addHandeler(MessageType.ExitQueue, this.onexitQueue, this);
    }

    public getPlayersInQueue(): number {
        return this.playerQueue.size();
    }

    private makeGame(player1: string, player2: string) {
        this.playerQueue.remove(player1);
        this.playerQueue.remove(player2);
        this.startGame(player1, player2);
    }

    private searchQueue(playerToken: string) {
        let found = false;
        let other = undefined;
        this.playerQueue.forEach(otherToken => {
            if (found)
                return;
            if (otherToken == playerToken)
                return;
            // Todo: Add logic to filter out inappropiate matchups
            other = otherToken;
            found = true;
        });
        if (other) {
            this.makeGame(playerToken, other);
        }

    }

    private onJoinQueue(message: Message) {
        let playerToken: string = message.source;
        if (this.playerQueue.containsKey(playerToken)) {
            this.messenger.sendMessageTo(MessageType.ClientError, "Already in queue.", playerToken);
            return;
        }
        this.playerQueue.setValue(playerToken, (new Date()).getTime());
        this.searchQueue(playerToken);
    }

    private onexitQueue(message: Message) {
        let playerToken: string = message.source;
        this.playerQueue.remove(playerToken);
    }
}

