import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeOAuthState, createOAuthState } from '../src/utils/oauth-state.js';

test('OAuth state is high entropy and accepted only once for its provider', () => {
  const state = createOAuthState();
  const request = { session: { githubOAuthState: state } };

  assert.equal(state.length, 64);
  assert.equal(consumeOAuthState(request, 'github', state), true);
  assert.equal(request.session.githubOAuthState, undefined);
  assert.equal(consumeOAuthState(request, 'github', state), false);
});

test('OAuth state cannot be reused across providers or accepted when missing', () => {
  const state = createOAuthState();
  const request = { session: { googleOAuthState: state } };

  assert.equal(consumeOAuthState(request, 'github', state), false);
  assert.equal(request.session.googleOAuthState, state);
  assert.equal(consumeOAuthState(request, 'google', undefined), false);
  assert.equal(request.session.googleOAuthState, undefined);
});
