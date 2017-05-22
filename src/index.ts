import { Server } from './server';

const ws_port = process.env.PORT | 80;

console.log('Starting Server');
let server = new Server(ws_port);
console.log('Listening for websockets on port', ws_port);
