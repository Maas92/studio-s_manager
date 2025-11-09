import jwksRsa from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import { env } from './env.js';

export const checkJwt = expressjwt({
  algorithms: ['RS256'],
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
  credentialsRequired: true,
  requestProperty: 'auth',
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `${env.AUTH_SERVICE_URL}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  }),
});