#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateCommentsConfig } = require('./comments.js');

const root = path.resolve(__dirname, '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'comments.config.schema.json'), 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalConfig() {
  return {
    prototypeId: 'spa-cz-partner-mobile',
    prototypeUrl: 'https://review.example.test/spa-cz-partner-mobile/',
    firebase: {
      apiKey: 'demo-api-key',
      authDomain: 'demo-spa-cz-comments.firebaseapp.com',
      projectId: 'demo-spa-cz-comments',
      appId: '1:123456789:web:demo',
      storageBucket: 'demo-spa-cz-comments.appspot.com',
      messagingSenderId: '123456789',
      measurementId: 'G-DEMO1234',
    },
    allowedEmailDomains: ['your-company.example', 'partner.example'],
    stateKeys: ['auth', 'access', 'connection', 'density', 'inv', 'hotel'],
    agentAuthor: {
      uid: 'demo-agent',
      name: 'Demo agent',
      email: 'agent@your-company.example',
    },
  };
}

function expectInvalid(name, mutate, pattern) {
  const value = canonicalConfig();
  mutate(value);
  assert.throws(
    () => validateCommentsConfig(value, schema),
    pattern,
    `${name} must be rejected by the deployment validator`
  );
}

const input = canonicalConfig();
const before = clone(input);
const validated = validateCommentsConfig(input, schema);
assert.deepStrictEqual(input, before, 'validation must not mutate its input');
assert.deepStrictEqual(validated, before, 'the canonical configuration must validate unchanged');
assert.notStrictEqual(validated, input, 'validation must return a distinct object');
assert.notStrictEqual(validated.firebase, input.firebase, 'nested objects must not be reused');

const cases = [
  ['missing prototypeId', value => delete value.prototypeId, /prototypeId must be a string/],
  ['missing firebase', value => delete value.firebase, /firebase must be an object/],
  ['unknown root field', value => (value.credential = 'never'), /credential is not allowed/],
  ['unknown Firebase field', value => (value.firebase.secret = 'never'), /firebase\.secret is not allowed/],
  ['incomplete Firebase app config', value => delete value.firebase.appId, /firebase\.appId must be a string/],
  ['empty Firebase project ID', value => (value.firebase.projectId = '  '), /projectId must be a non-empty string/],
  ['non-HTTP prototype URL', value => (value.prototypeUrl = 'file:\/\/\/tmp\/prototype'), /http\(s\) URL/],
  [
    'credential-bearing prototype URL',
    value => (value.prototypeUrl = 'https://user:password@review.example.test/'),
    /http\(s\) URL without credentials/,
  ],
  ['non-string reviewer domain', value => (value.allowedEmailDomains = [42]), /allowedEmailDomains\[0\].*string/],
  ['empty reviewer domain', value => (value.allowedEmailDomains = ['  ']), /allowedEmailDomains\[0\].*non-empty/],
  [
    'duplicate reviewer domain',
    value => (value.allowedEmailDomains = ['partner.example', 'partner.example']),
    /allowedEmailDomains must not contain duplicates/,
  ],
  ['non-string state key', value => (value.stateKeys = ['auth', 42]), /stateKeys\[1\].*string/],
  ['empty state key', value => (value.stateKeys = ['auth', '  ']), /stateKeys\[1\].*non-empty/],
  ['duplicate state key', value => (value.stateKeys = ['auth', 'auth']), /stateKeys must not contain duplicates/],
];

for (const [name, mutate, pattern] of cases) expectInvalid(name, mutate, pattern);

process.stdout.write(`comments-config-qa: canonical config and ${cases.length} invalid cases — OK\n`);
