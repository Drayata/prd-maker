import { randomBytes } from 'node:crypto';

console.log(`JWT_ACCESS_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`JWT_REFRESH_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);
