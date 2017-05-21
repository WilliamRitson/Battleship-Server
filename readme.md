# About
This is a server for the game battleship written in typescript.

# Install
Requires [node](https://nodejs.org/en/), [npm](https://www.npmjs.com/) and [typescript](https://www.typescriptlang.org/) to be installed.

Once you have npm run `npm install` to get the dependencies .

# Run

You can use `node ./dist/matchmaking.js` to start the server.

You can use `node ./dist/consoleClient.hs` to start a simple client.

In order to run a game, you to start at least a server and two clients. Run the `join` command from each client.

# Development
Run `npm install gulp --global` to install gulp.

Then you can use `gulp watch` to automatically compile typescript.