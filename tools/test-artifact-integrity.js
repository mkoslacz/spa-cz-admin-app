#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const artifactIntegrity = require('./artifact-integrity.js');
const { writeAtomically } = require('./atomic-write.js');
const { ToolError, changelogSource } = require('./build-changelog.js');
const refresh = require('./refresh.js');
const { ArtifactIntegrityError, artifactInventory, validateReceipt, validateRefreshedArtifacts } = artifactIntegrity;

const root = path.resolve(__dirname, '..');

function copyFilter(source) {
  const relative = path.relative(root, source);
  const ignored = [path.join('tools', 'node_modules')];
  return !ignored.some(entry => relative === entry || relative.startsWith(`${entry}${path.sep}`));
}

function withTemporaryRepository(callback) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-cz-artifact-integrity-'));
  try {
    fs.cpSync(root, temporary, { filter: copyFilter, recursive: true });
    callback(temporary);
  } finally {
    fs.rmSync(temporary, { force: true, recursive: true });
  }
}

function expectIntegrityError(run, pattern, message) {
  assert.throws(run, error => error instanceof ArtifactIntegrityError && pattern.test(error.message), message);
}

function withMutatedFile(repository, relative, mutate, check) {
  const file = path.join(repository, relative);
  const original = fs.readFileSync(file);
  try {
    mutate(file, original);
    check();
  } finally {
    fs.writeFileSync(file, original);
  }
}

function firstTextNode(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstTextNode(entry);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  if (typeof value.text === 'string') return value;
  for (const entry of Object.values(value)) {
    const found = firstTextNode(entry);
    if (found) return found;
  }
  return null;
}

function commit(repository, paths, message) {
  childProcess.execFileSync('git', ['add', '--', ...paths], { cwd: repository, stdio: 'ignore' });
  childProcess.execFileSync(
    'git',
    [
      '-c',
      'user.name=Artifact integrity test',
      '-c',
      'user.email=artifact-integrity@test.invalid',
      'commit',
      '-m',
      message,
    ],
    { cwd: repository, stdio: 'ignore' }
  );
}

withTemporaryRepository(repository => {
  assert.strictEqual(
    artifactIntegrity.writeReceipt,
    undefined,
    'artifact contract must not expose a direct receipt-promotion API'
  );
  assert.strictEqual(
    artifactIntegrity.prepareReceipt,
    undefined,
    'artifact contract must not expose receipt preparation outside the refresh orchestrator'
  );
  assert.strictEqual(
    artifactIntegrity.receiptPayload,
    undefined,
    'artifact contract must not expose receipt content for direct promotion'
  );
  assert.strictEqual(
    refresh.refreshIntegrity,
    undefined,
    'refresh must not expose receipt promotion without its completed orchestration path'
  );
  assert.throws(
    () =>
      changelogSource(
        root,
        {},
        {
          gitRunner: {
            run: () => 'true',
          },
        }
      ),
    error => error instanceof ToolError && /Git history is shallow/.test(error.message),
    'receipt provenance must reject a shallow history exactly as the changelog generator does'
  );
  validateReceipt(repository);
  const inventory = artifactInventory(repository);

  withMutatedFile(
    repository,
    'proto-m.js',
    file => fs.appendFileSync(file, '\n// stale artifact-integrity input probe\n'),
    () =>
      expectIntegrityError(
        () => validateReceipt(repository),
        /inputs are stale/,
        'changed input must invalidate receipt'
      )
  );

  withMutatedFile(
    repository,
    'tools/build-changelog.js',
    file => fs.appendFileSync(file, '\n// stale changelog-generator input probe\n'),
    () =>
      expectIntegrityError(
        () => validateReceipt(repository),
        /inputs are stale/,
        'changed declared generator must invalidate its derived output receipt'
      )
  );

  withMutatedFile(
    repository,
    'tools/atomic-write.js',
    file => fs.appendFileSync(file, '\n// stale receipt-promotion input probe\n'),
    () =>
      expectIntegrityError(
        () => validateReceipt(repository),
        /inputs are stale/,
        'changed receipt-promotion implementation must invalidate its receipt'
      )
  );

  withMutatedFile(
    repository,
    inventory.previewPaths[0],
    file => fs.appendFileSync(file, Buffer.from([0])),
    () =>
      expectIntegrityError(
        () => validateReceipt(repository),
        /outputs are stale or incomplete/,
        'changed derived artifact must invalidate receipt'
      )
  );

  const dump = path.join(repository, inventory.dumpPaths[0]);
  const missingDump = `${dump}.missing`;
  fs.renameSync(dump, missingDump);
  try {
    expectIntegrityError(
      () => validateReceipt(repository),
      /DOM dump inventory differs/,
      'missing declared dump must fail the exact inventory'
    );
  } finally {
    fs.renameSync(missingDump, dump);
  }

  const extraDump = path.join(repository, 'tools/dumps/dump-unexpected.json');
  fs.writeFileSync(extraDump, '{}\n');
  try {
    expectIntegrityError(
      () => validateReceipt(repository),
      /DOM dump inventory differs/,
      'extra dump must fail the exact inventory'
    );
  } finally {
    fs.unlinkSync(extraDump);
  }

  const receipt = path.join(repository, inventory.receipt);
  const receiptBeforeDirectWriteProbe = fs.readFileSync(receipt);
  const directWrite = childProcess.spawnSync(
    process.execPath,
    [path.join(repository, 'tools/artifact-integrity.js'), '--write'],
    { cwd: repository, encoding: 'utf8' }
  );
  assert.notStrictEqual(directWrite.status, 0, 'receipt must not be writable outside the complete refresh');
  assert.match(directWrite.stderr, /usage: node tools\/artifact-integrity\.js --check/);
  assert.deepStrictEqual(
    fs.readFileSync(receipt),
    receiptBeforeDirectWriteProbe,
    'rejected direct receipt write must leave the prior receipt intact'
  );

  const receiptBeforeMarkerProbe = fs.readFileSync(receipt);
  withMutatedFile(
    repository,
    inventory.dumpPaths[0],
    (file, original) => {
      const dumpJson = JSON.parse(original.toString('utf8'));
      const textNode = firstTextNode(dumpJson);
      assert(textNode, 'fixture dump must contain a text node for the marker probe');
      textNode.text = `${textNode.text} DEMO-`;
      fs.writeFileSync(file, `${JSON.stringify(dumpJson, null, 2)}\n`);
    },
    () => {
      expectIntegrityError(
        () => validateRefreshedArtifacts(repository),
        /derived DOM dumps contain forbidden product markers/,
        'product marker in a derived dump must block receipt promotion'
      );
      assert.deepStrictEqual(
        fs.readFileSync(receipt),
        receiptBeforeMarkerProbe,
        'rejected receipt promotion must leave the previous receipt intact'
      );
    }
  );

  withMutatedFile(
    repository,
    inventory.receipt,
    file => fs.writeFileSync(file, '{not valid json\n'),
    () =>
      expectIntegrityError(
        () => validateReceipt(repository),
        /could not read artifact integrity receipt/,
        'corrupt receipt must be rejected'
      )
  );

  const receiptBeforeAtomicFailure = fs.readFileSync(receipt);
  const failingFileSystem = Object.create(fs);
  failingFileSystem.renameSync = () => {
    throw new Error('simulated receipt promotion failure');
  };
  assert.throws(
    () => writeAtomically(receipt, 'replacement receipt\n', failingFileSystem),
    /simulated receipt promotion failure/,
    'atomic receipt promotion must surface a failed final rename'
  );
  assert.deepStrictEqual(
    fs.readFileSync(receipt),
    receiptBeforeAtomicFailure,
    'failed atomic receipt promotion must not overwrite the prior receipt'
  );
  assert(!fs.existsSync(`${receipt}.tmp-${process.pid}`), 'failed promotion must clean up its temporary receipt');

  validateReceipt(repository);

  const generatedOnly = 'tools/dumps/receipt-history-probe.txt';
  fs.writeFileSync(path.join(repository, generatedOnly), 'generated history probe\n');
  commit(repository, [generatedOnly], 'test: generated artifact history probe');
  validateReceipt(repository);

  childProcess.execFileSync(
    'git',
    [
      '-c',
      'user.name=Artifact integrity test',
      '-c',
      'user.email=artifact-integrity@test.invalid',
      'commit',
      '--allow-empty',
      '-m',
      'test: source history probe',
    ],
    { cwd: repository, stdio: 'ignore' }
  );
  expectIntegrityError(
    () => validateReceipt(repository),
    /changelog source is stale/,
    'new source commit must invalidate the changelog receipt even when files are unchanged'
  );
});

process.stdout.write('artifact-integrity-contract: freshness, inventory, marker and atomic-promotion guards — OK\n');
