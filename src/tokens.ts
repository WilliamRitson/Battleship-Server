import * as crypto from 'crypto';

export function getToken(): string {
    return crypto.randomBytes(64).toString('hex');
}