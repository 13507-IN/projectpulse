import { randomBytes, timingSafeEqual } from 'node:crypto';

export const createOAuthState = () => randomBytes(32).toString('hex');

export const consumeOAuthState = (req, provider, providedState) => {
  const sessionKey = `${provider}OAuthState`;
  const expectedState = req.session?.[sessionKey];

  if (req.session) delete req.session[sessionKey];
  if (typeof expectedState !== 'string' || typeof providedState !== 'string') return false;

  const expected = Buffer.from(expectedState);
  const provided = Buffer.from(providedState);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};
