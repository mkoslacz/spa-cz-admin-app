#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contract = require('../usecases-contract.js');
const { ToolError, captureEntries, validateMatrix } = require('./build-usecases.js');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'usecases.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'prototype.json'), 'utf8'));
const screens = contract.screensFromManifest(manifest);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function errorsFor(matrix, options = {}) {
  return contract.validateMatrix(matrix, {
    allowedScreens: screens,
    maxUsecases: options.maxUsecases ?? contract.MAX_USECASES,
    requireCoverage: options.requireCoverage ?? true,
  }).errors;
}

function expectError(matrix, pattern, options) {
  const errors = errorsFor(matrix, options);
  assert(
    errors.some(error => pattern.test(error)),
    `expected ${pattern}, got: ${errors.join('; ')}`
  );
}

function makeMany(count) {
  const matrix = clone(source);
  matrix.usecases = Array.from({ length: count }, (_, index) => {
    const usecase = clone(source.usecases[index % source.usecases.length]);
    usecase.id = `UC-MANY-${String(index + 1).padStart(3, '0')}`;
    usecase.name = `Scenario ${index + 1}`;
    return usecase;
  });
  return matrix;
}

assert.deepStrictEqual(errorsFor(source), [], 'published source must satisfy the shared contract');
assert.deepStrictEqual(
  contract.normalizeMatrix(contract.normalizeMatrix(source)),
  contract.normalizeMatrix(source),
  'normalization must be idempotent'
);
assert.strictEqual(
  contract.fingerprintMatrix(clone(source)),
  contract.fingerprintMatrix(source),
  'equivalent source must have a stable fingerprint'
);

const hundred = makeMany(100);
assert.deepStrictEqual(errorsFor(hundred), [], 'the browser contract must accept 100 valid scenarios');
assert.strictEqual(
  validateMatrix(hundred, root).usecases.length,
  100,
  'the Node builder must accept the same 100 scenarios'
);
assert.strictEqual(
  validateMatrix(makeMany(contract.MAX_USECASES + 25), root).usecases.length,
  contract.MAX_USECASES + 25,
  'the generator must not inherit the local import cap'
);
expectError(makeMany(contract.MAX_USECASES + 1), /maximum of 500 scenarios/);

const duplicate = clone(source);
duplicate.usecases[1].id = duplicate.usecases[0].id;
expectError(duplicate, /duplicate use case id/);

const unknownAxis = clone(source);
unknownAxis.usecases[0].state.ghost = 'on';
expectError(unknownAxis, /unknown state axis "ghost"/);

const unknownOption = clone(source);
unknownOption.usecases[0].state.auth = 'maybe';
expectError(unknownOption, /unknown option "auth\.maybe"/);

const missingAxis = clone(source);
delete missingAxis.usecases[0].state.auth;
expectError(missingAxis, /missing state axis "auth"/);

const traversal = clone(source);
traversal.usecases[0].screens = ['../outside.html'];
expectError(traversal, /unsafe screen/);
assert.throws(() => validateMatrix(traversal, root), ToolError);

const missingScreen = clone(source);
missingScreen.usecases[0].screens = ['m-not-declared.html'];
expectError(missingScreen, /missing screen/);
assert.throws(() => validateMatrix(missingScreen, root), ToolError);

const missingDoc = clone(source);
delete missingDoc.states.auth.options.in.doc;
expectError(missingDoc, /option "in" is missing doc/);

const malformedState = clone(source);
malformedState.states.auth = null;
expectError(malformedState, /state "auth" must be an object/);

const uncovered = clone(source);
uncovered.usecases.forEach(usecase => {
  usecase.state.auth = 'in';
});
expectError(uncovered, /option "out" is not covered/);
assert.deepStrictEqual(
  errorsFor(uncovered, { requireCoverage: false }),
  [],
  'local editing may persist a structurally valid draft while export coverage is incomplete'
);

const emptyDraft = { states: clone(source.states), usecases: [] };
assert.deepStrictEqual(
  contract.validateMatrix(emptyDraft, {
    allowedScreens: screens,
    maxUsecases: contract.MAX_USECASES,
    requireCoverage: false,
    allowEmptyUsecases: true,
  }).errors,
  [],
  'an empty local draft may persist while export still rejects it'
);
expectError(emptyDraft, /non-empty array/);

const encoded = contract.deepLink('m-offer.html?nopanel=1&existing=yes#rate', {
  auth: 'in',
  hotel: 'test property & spa',
});
assert.strictEqual(encoded.includes('nopanel'), false, 'review deep links must never inherit export mode');
assert.match(encoded, /hotel=test\+property\+%26\+spa/);
assert.match(encoded, /existing=yes/);
assert.match(encoded, /#rate$/);
assert.strictEqual(contract.queryForState({ auth: 'in' }, { nopanel: 1 }), '?auth=in');

const normalized = contract.normalizedEntry(source.usecases[0]);
assert(normalized.screens.every(screen => screen.width === 390 && screen.height === 844));
assert(normalized.screens.every(screen => !screen.deepLink.includes('nopanel')));
assert(screens.includes('m-dashboard.html') && screens.includes('m-dashboard-en.html'));
assert.strictEqual(new Set(screens).size, screens.length, 'manifest choices must be unique base screen paths');

async function testRepresentativeCaptures() {
  const entries = [contract.normalizedEntry(source.usecases[0]), contract.normalizedEntry(source.usecases[1])];
  let pageCount = 0;
  const fakePage = () => ({
    setViewport: async () => {},
    goto: async () => {},
    evaluate: async () => {},
    screenshot: async () => {},
    close: async () => {},
  });
  const fakeBrowser = {
    newPage: async () => {
      pageCount += 1;
      return fakePage();
    },
    close: async () => {},
  };
  const fakeFs = {
    existsSync: () => true,
    mkdirSync: () => {},
    renameSync: () => {},
    unlinkSync: () => {},
  };
  const captures = await captureEntries(entries, root, path.join(root, 'docs/usecases.md'), {
    chrome: '/fake/chrome',
    fileSystem: fakeFs,
    loadPuppeteer: () => ({ launch: async () => fakeBrowser }),
    pruneStale: false,
  });
  assert.strictEqual(pageCount, entries.length, 'capture work must grow by one page per use case');
  assert.strictEqual(captures.size, entries.length, 'each use case must produce one representative capture');
  entries.forEach(entry => {
    assert(captures.has(`${entry.id}\0${entry.screens[0].screen}`));
    entry.screens.slice(1).forEach(screen => assert(!captures.has(`${entry.id}\0${screen.screen}`)));
  });
}

testRepresentativeCaptures()
  .then(() => {
    process.stdout.write('usecases-contract-qa: shared contract, 100 scenarios, safe links and capture scaling — OK\n');
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
