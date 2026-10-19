import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDatabaseUrl } from '../src/config/database-url.js';

test('production pool settings preserve existing database URL parameters', () => {
  const result = new URL(buildDatabaseUrl(
    'postgresql://user:pass@db.example.test/app?sslmode=require&channel_binding=require',
    true
  ));

  assert.equal(result.searchParams.get('sslmode'), 'require');
  assert.equal(result.searchParams.get('channel_binding'), 'require');
  assert.equal(result.searchParams.get('connection_limit'), '20');
});

test('production pool settings replace an existing connection limit', () => {
  const result = new URL(buildDatabaseUrl(
    'postgresql://user:pass@db.example.test/app?connection_limit=5',
    true
  ));

  assert.equal(result.searchParams.getAll('connection_limit').length, 1);
  assert.equal(result.searchParams.get('connection_limit'), '20');
});

test('development database URLs remain unchanged', () => {
  const databaseUrl = 'postgresql://user:pass@localhost/app?sslmode=disable';
  assert.equal(buildDatabaseUrl(databaseUrl, false), databaseUrl);
});

test('invalid or missing database URLs fail with a clear configuration error', () => {
  assert.throws(() => buildDatabaseUrl(undefined, true), /DATABASE_URL is required/);
  assert.throws(() => buildDatabaseUrl('mysql://localhost/app', true), /postgres or postgresql/);
});
