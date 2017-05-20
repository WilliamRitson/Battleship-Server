import { Server } from './server';

const websocketPort = process.env.WS_PORT | 2222;

console.log('Starting Server');
let server = new Server(websocketPort);
console.log('Listening for websockets on port ', websocketPort);
