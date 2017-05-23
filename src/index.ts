import { Server } from './server';

const port = process.env.PORT || 80;

console.log('Starting Server');
let server = new Server(port);
