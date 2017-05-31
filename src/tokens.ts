import * as crypto from 'crypto';

export function getToken(bits:number = 32): string {
    return crypto.randomBytes(bits).toString('hex');
}