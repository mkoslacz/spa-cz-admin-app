#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..');
const canonicalConfigPath = path.join(repositoryRoot, 'firebase.json');
const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);

function isContained(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function validateFirebaseDeployConfig(root = repositoryRoot, configPath = path.join(root, 'firebase.json')) {
  const expectedConfigPath = path.join(root, 'firebase.json');
  assert.strictEqual(path.resolve(configPath), expectedConfigPath, 'firebase.json must be the canonical root config');
  assert(
    !fs.existsSync(path.join(root, 'tools', 'firebase.json')),
    'tools/firebase.json is retired; keep one Firebase authority'
  );

  const configStat = fs.lstatSync(configPath);
  assert(configStat.isFile() && !configStat.isSymbolicLink(), 'firebase.json must be a regular file, not a symlink');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.deepStrictEqual(
    config.auth,
    {
      providers: {
        googleSignIn: {
          oAuthBrandDisplayName: 'SPA CZ Partner Mobile',
          supportEmail: 'mateusz.koslacz@szallas.group',
          authorizedRedirectUris: ['https://mateuszkoslacz.com', 'http://127.0.0.1'],
        },
      },
    },
    'firebase.json must keep the exact Google Sign-In deployment contract'
  );
  assert(config.firestore && typeof config.firestore.rules === 'string', 'firebase.json must declare firestore.rules');

  const configDirectory = path.resolve(path.dirname(configPath));
  const unresolvedRulesPath = path.resolve(path.dirname(configPath), config.firestore.rules);
  assert(
    isContained(configDirectory, unresolvedRulesPath),
    'firestore.rules must resolve inside the Firebase project directory'
  );
  const realConfigDirectory = fs.realpathSync(configDirectory);
  const rulesStat = fs.lstatSync(unresolvedRulesPath);
  assert(
    rulesStat.isFile() && !rulesStat.isSymbolicLink(),
    'firestore.rules must resolve to a regular, non-symlink file'
  );
  const rulesPath = fs.realpathSync(unresolvedRulesPath);
  assert(
    isContained(realConfigDirectory, rulesPath),
    'the real firestore.rules target must stay inside the project directory'
  );

  assert(config.emulators && typeof config.emulators === 'object', 'firebase.json must configure local emulators');
  const configuredHosts = Object.entries(config.emulators)
    .filter(([, settings]) => settings && typeof settings === 'object' && Object.hasOwn(settings, 'host'))
    .map(([name, settings]) => [name, settings.host]);
  assert(configuredHosts.length > 0, 'at least one emulator host must be explicit');
  for (const [name, host] of configuredHosts) {
    assert(loopbackHosts.has(host), `${name} emulator host must be loopback-only, received ${host}`);
  }

  return { config, configPath: expectedConfigPath, rulesPath };
}

function validateFirebaseRunbook(root = repositoryRoot) {
  const activeDocumentation = ['README.md', 'CLAUDE.md', 'docs/firebase-comments-setup.md'];
  const documents = Object.fromEntries(
    activeDocumentation.map(relative => [relative, fs.readFileSync(path.join(root, relative), 'utf8')])
  );
  for (const [relative, contents] of Object.entries(documents)) {
    assert(!contents.includes('tools/firebase.json'), `${relative} must not reference the retired Firebase config`);
  }

  const runbook = documents['docs/firebase-comments-setup.md'];
  const cliLines = runbook.split('\n').filter(line => line.trim().startsWith('"$FIREBASE_BIN"'));
  assert(cliLines.length > 0, 'the runbook must contain pinned Firebase CLI commands');
  for (const line of cliLines) {
    assert(line.includes('--config firebase.json'), `Firebase CLI command lacks canonical --config: ${line.trim()}`);
  }

  const createIndex = runbook.indexOf('firestore:databases:create "$FIRESTORE_DATABASE_ID"');
  const getIndex = runbook.indexOf('firestore:databases:get "$FIRESTORE_DATABASE_ID" --json');
  const firstDeployIndex = runbook.indexOf('deploy --only firestore:rules');
  assert(createIndex >= 0 && getIndex >= 0 && firstDeployIndex >= 0, 'runbook must create, get and deploy Firestore');
  assert(
    createIndex < firstDeployIndex && getIndex < firstDeployIndex,
    'database creation and location get must precede deploy'
  );
  assert(runbook.includes("FIRESTORE_LOCATION='europe-west3'"), 'approved Firestore location must be europe-west3');
  assert(runbook.includes("FIRESTORE_CURRENT_LOCATION='nam5'"), 'recovery must guard the observed nam5 location');
  assert(
    runbook.includes("FIREBASE_PROJECT_ID='spa-cz-partner-mobile'"),
    'runbook must guard the exact dedicated project'
  );
  assert(runbook.includes("FIRESTORE_DATABASE_ID='(default)'"), 'runbook must guard the exact default database');
  assert(
    runbook.includes("RECOVERY_EMPTY_DATABASE_CONFIRMED='NO'"),
    'recovery must fail closed on the empty-data confirmation'
  );
  assert(
    runbook.includes("RECOVERY_NO_ACTIVATION_CONFIRMED='NO'"),
    'recovery must fail closed on activation confirmation'
  );

  const runbookLines = runbook.split('\n');
  for (let index = 0; index < runbookLines.length; index += 1) {
    if (!runbookLines[index].includes('deploy --only firestore:rules')) continue;
    assert(
      runbookLines[index].includes('--project "$FIREBASE_PROJECT_ID"'),
      'every rules deploy must use the guarded project'
    );
    const previousCommand = runbookLines
      .slice(0, index)
      .reverse()
      .find(line => line.trim() && !line.trim().startsWith('```'));
    assert.strictEqual(
      previousCommand.trim(),
      'assert_firestore_database "$FIRESTORE_LOCATION"',
      'every rules deploy must be immediately gated by the live location assertion'
    );
  }

  return {
    cliCommandCount: cliLines.length,
    deployCommandCount: (runbook.match(/deploy --only firestore:rules/g) || []).length,
  };
}

function validateRepositoryFirebaseContract(root = repositoryRoot) {
  return {
    deployment: validateFirebaseDeployConfig(root),
    runbook: validateFirebaseRunbook(root),
  };
}

function writeFixture(root, config, rules = 'rules_version = "2";') {
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(root, 'firebase.json'), `${JSON.stringify(config, null, 2)}\n`);
  if (rules !== null) fs.writeFileSync(path.join(root, 'comments.rules'), rules);
}

function expectRejected(label, setup, pattern) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-cz-firebase-config-test-'));
  try {
    setup(fixture);
    assert.throws(() => validateFirebaseDeployConfig(fixture), pattern, label);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

function runScenarioTests() {
  const validConfig = {
    auth: {
      providers: {
        googleSignIn: {
          oAuthBrandDisplayName: 'SPA CZ Partner Mobile',
          supportEmail: 'mateusz.koslacz@szallas.group',
          authorizedRedirectUris: ['https://mateuszkoslacz.com', 'http://127.0.0.1'],
        },
      },
    },
    firestore: { rules: 'comments.rules' },
    emulators: { firestore: { host: '127.0.0.1', port: 8187 } },
  };

  const repositoryContract = validateRepositoryFirebaseContract();
  const canonical = repositoryContract.deployment;
  assert.strictEqual(canonical.rulesPath, path.join(repositoryRoot, 'comments.rules'));

  expectRejected(
    'path traversal must fail',
    root => writeFixture(root, { ...validConfig, firestore: { rules: '../comments.rules' } }),
    /inside the Firebase project directory/
  );
  expectRejected('missing rules must fail', root => writeFixture(root, validConfig, null), /ENOENT/);
  expectRejected(
    'directory rules target must fail',
    root => {
      writeFixture(root, validConfig, null);
      fs.mkdirSync(path.join(root, 'comments.rules'));
    },
    /regular, non-symlink file/
  );
  expectRejected(
    'symlink rules target must fail',
    root => {
      writeFixture(root, validConfig, null);
      fs.writeFileSync(path.join(root, 'actual.rules'), 'rules_version = "2";');
      fs.symlinkSync('actual.rules', path.join(root, 'comments.rules'));
    },
    /regular, non-symlink file/
  );
  expectRejected(
    'public emulator host must fail',
    root =>
      writeFixture(root, {
        ...validConfig,
        emulators: { firestore: { host: '0.0.0.0', port: 8187 } },
      }),
    /loopback-only/
  );
  expectRejected(
    'retired tools config must fail',
    root => {
      writeFixture(root, validConfig);
      fs.writeFileSync(path.join(root, 'tools', 'firebase.json'), '{}\n');
    },
    /tools\/firebase\.json is retired/
  );

  return repositoryContract;
}

if (require.main === module) {
  const contract = runScenarioTests();
  process.stdout.write(
    `firebase-deploy-config: canonical root config, ${contract.runbook.cliCommandCount} guarded CLI commands and 6 rejection scenarios — OK\n`
  );
}

module.exports = {
  runScenarioTests,
  validateFirebaseDeployConfig,
  validateFirebaseRunbook,
  validateRepositoryFirebaseContract,
};
