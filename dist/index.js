"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const port = process.env.PORT || 80;
console.log('Starting Server');
let server = new server_1.Server(port);
