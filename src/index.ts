import { Server } from './server';

const ws_port = process.env.WS_PORT | 2222;

console.log('Starting Server');
let server = new Server(ws_port);
console.log('Listening for websockets on port ', ws_port);
