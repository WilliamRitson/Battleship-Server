"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const randomJs = require("random-js");
const rng = new randomJs();
class NameGenerator {
    constructor() {
        // Historical captains, from wikipedia
        this.namesList = [
            { first: 'Vitus', last: 'Bering' },
            { first: 'William', last: 'Bainbridge' },
            { first: 'Joshua', last: 'Barney' },
            { first: 'James', last: 'Barron' },
            { first: 'Samuel', last: 'Barron' },
            { first: 'John', last: 'Barry' },
            { first: 'Thomas', last: 'Berwick' },
            { first: 'William', last: 'Bligh' },
            { first: 'William', last: 'Brown' },
            { first: 'Franklin', last: 'Buchanan' },
            { first: 'Piero', last: 'Calamai' },
            { first: 'Isaac', last: 'Chauncey' },
            { first: 'Christopher', last: 'Columbus' },
            { first: 'Thomas', last: 'Coram' },
            { first: 'Stephen', last: 'Decatur' },
            { first: 'Francis', last: 'Drake' },
            { first: 'George', last: 'Duff' },
            { first: 'Robert', last: 'FitzRoy' },
            { first: 'George', last: 'Flavel' },
            { first: 'Charles', last: 'Fryatt' },
            { first: 'Paulo', last: 'Gama' },
            { first: 'Vasco', last: 'Gama' },
            { first: 'Giuseppe', last: 'Garibaldi' },
            { first: 'Minoru', last: 'Genda' },
            { first: 'Edgar', last: 'Gold' },
            { first: 'Robert', last: 'Halpin' },
            { first: 'Tameichi', last: 'Hara' },
            { first: 'Mochitsura', last: 'Hashimoto' },
            { first: 'Joseph', last: 'Hazelwood' },
            { first: 'Takeo', last: 'Hirose' },
            { first: 'Isaac', last: 'Hull' },
            { first: 'George', last: 'Johnstone' },
            { first: 'Pavlos', last: 'Kountouriotis' },
            { first: 'William', last: 'Lacheur' },
            { first: 'William', last: 'Ladd' },
            { first: 'James', last: 'Lawrence' },
            { first: 'Thomas', last: 'Macdonough' },
            { first: 'Ferdinand', last: 'Magellan' },
            { first: 'Robert', last: 'Maynard' },
            { first: 'Thomas', last: 'McClelland' },
            { first: 'Philo', last: 'McGiffen' },
            { first: 'Hugh', last: 'Mulzac' },
            { first: 'Richard', last: 'Murphy' },
            { first: 'Horatio', last: 'Nelson' },
            { first: 'Fred', last: 'Noonan' },
            { first: 'Luis', last: 'Pardo' },
            { first: 'Richard', last: 'Pearson' },
            { first: 'Edward', last: 'Pellew' },
            { first: 'Matthew', last: 'Perry' },
            { first: 'Richard', last: 'Phillips' },
            { first: 'David', last: 'Porter' },
            { first: 'Arturo', last: 'Prat' },
            { first: 'Edward', last: 'Preble' },
            { first: 'Arthur', last: 'Rostron' },
            { first: 'Tsutomi', last: 'Sakuma' },
            { first: 'Anna', last: 'Shchetinina' },
            { first: 'Edward', last: 'Smith' },
            { first: 'Robert', last: 'Surcouf' },
            { first: 'Thomas', last: 'Truxton' },
            { first: 'Thomas', last: 'Truxton' },
            { first: 'Angus', last: 'Walters' },
            { first: 'Martin', last: 'Welch' },
            { first: 'Charles', last: 'Wilkes' },
            { first: 'Perry', last: 'Winslow' },
            { first: 'Richard', last: 'Woodget' },
            { first: 'He', last: 'Zheng' },
        ];
    }
    getName() {
        let first = this.namesList[rng.integer(0, this.namesList.length - 1)].first;
        let last = this.namesList[rng.integer(0, this.namesList.length - 1)].last;
        return 'Captain ' + first + ' ' + last;
    }
}
exports.NameGenerator = NameGenerator;
