#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { setLogLevel } = require('firebase/firestore');

setLogLevel('silent');

const PROJECT_ID = 'demo-spa-cz-comments';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8187;
const PROTOTYPE_ID = 'spa-cz-partner-mobile';
const OTHER_PROTOTYPE_ID = 'another-prototype';

const identities = Object.freeze({
  domainReviewer: Object.freeze({ uid: 'domain-reviewer', email: 'reviewer@szallas.group' }),
  explicitReviewer: Object.freeze({ uid: 'explicit-reviewer', email: 'reviewer@external.invalid' }),
  owner: Object.freeze({ uid: 'exact-owner', email: 'owner@external.invalid' }),
  unapproved: Object.freeze({ uid: 'unapproved-reviewer', email: 'reviewer@unapproved.invalid' }),
});

function requireDemoEmulator() {
  assert(PROJECT_ID.startsWith('demo-'), 'rules tests must use a Firebase demo project');
  assert.strictEqual(
    process.env.FIRESTORE_EMULATOR_HOST,
    `${FIRESTORE_HOST}:${FIRESTORE_PORT}`,
    `rules tests require the loopback emulator at ${FIRESTORE_HOST}:${FIRESTORE_PORT}`
  );
}

function authContext(testEnv, identity) {
  return testEnv.authenticatedContext(identity.uid, {
    email: identity.email,
    email_verified: true,
  });
}

function threadPath(threadId, prototypeId = PROTOTYPE_ID) {
  return `prototypes/${prototypeId}/threads/${threadId}`;
}

function messagePath(threadId, messageId = 'message-1', prototypeId = PROTOTYPE_ID) {
  return `${threadPath(threadId, prototypeId)}/messages/${messageId}`;
}

function validAnchor(overrides = {}) {
  return {
    page: 'm-dashboard.html',
    viewport: 'mobile',
    lang: 'cs',
    state: { auth: 'in', access: 'full' },
    selector: '[data-c="dashboard-overview"]',
    selectorKind: 'data',
    rx: 0.5,
    ry: 0.5,
    label: 'Dashboard overview',
    text: '',
    ...overrides,
  };
}

function threadFor(identity, overrides = {}) {
  return {
    createdBy: { uid: identity.uid, email: identity.email },
    createdAt: '2026-08-07T20:00:00.000Z',
    updatedAt: '2026-08-07T20:00:00.000Z',
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    orphaned: false,
    anchor: validAnchor(),
    ...overrides,
  };
}

function messageFor(identity, overrides = {}) {
  return {
    author: { uid: identity.uid, email: identity.email },
    agent: false,
    body: 'Deterministic emulator reply',
    createdAt: '2026-08-07T20:01:00.000Z',
    updatedAt: '2026-08-07T20:01:00.000Z',
    ...overrides,
  };
}

async function seed(testEnv, documents) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await Promise.all(Object.entries(documents).map(([documentPath, data]) => database.doc(documentPath).set(data)));
  });
}

async function reset(testEnv, allowed = {}) {
  await testEnv.clearFirestore();
  const documents = {};
  for (const [email, user] of Object.entries(allowed)) documents[`allowed/${email}`] = { user };
  if (Object.keys(documents).length) await seed(testEnv, documents);
}

async function assertDeniedIdentity(testEnv, context, identity, label) {
  const threadId = `${label}-thread`;
  await reset(testEnv);
  await seed(testEnv, { [threadPath(threadId)]: threadFor(identities.domainReviewer) });
  const database = context.firestore();
  await assertFails(database.doc(threadPath(threadId)).get());
  await assertFails(database.collection(`prototypes/${PROTOTYPE_ID}/threads`).get());
  await assertFails(database.doc(threadPath(`${threadId}-create`)).set(threadFor(identity)));
  await assertFails(database.doc(messagePath(threadId)).set(messageFor(identity)));
  await assertFails(
    database.doc(threadPath(threadId)).update({
      status: 'resolved',
      resolvedAt: '2026-08-07T20:02:00.000Z',
      resolvedBy: { uid: identity.uid, email: identity.email },
      updatedAt: '2026-08-07T20:02:00.000Z',
    })
  );
  await assertFails(database.doc(threadPath(threadId)).delete());
}

async function exerciseReviewer(testEnv, identity, label, allowed = {}) {
  const threadId = `${label}-thread`;
  await reset(testEnv, allowed);
  const database = authContext(testEnv, identity).firestore();
  const thread = database.doc(threadPath(threadId));
  const message = database.doc(messagePath(threadId));

  await assertSucceeds(thread.set(threadFor(identity)));
  await assertSucceeds(thread.get());
  await assertSucceeds(database.collection(`prototypes/${PROTOTYPE_ID}/threads`).get());
  await assertSucceeds(message.set(messageFor(identity)));
  await assertSucceeds(message.get());
  await assertSucceeds(database.collection(`${threadPath(threadId)}/messages`).get());
  await assertSucceeds(message.update({ body: 'Updated deterministic reply', updatedAt: '2026-08-07T20:02:00.000Z' }));
  await assertSucceeds(
    thread.update({
      status: 'resolved',
      resolvedAt: '2026-08-07T20:03:00.000Z',
      resolvedBy: { uid: identity.uid, email: identity.email },
      updatedAt: '2026-08-07T20:03:00.000Z',
    })
  );
  await assertSucceeds(
    thread.update({
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
      updatedAt: '2026-08-07T20:04:00.000Z',
    })
  );
  await assertFails(thread.update({ status: 'deleting', updatedAt: '2026-08-07T20:05:00.000Z' }));
  await assertFails(message.delete());
  await assertFails(thread.delete());
}

async function exerciseOwner(testEnv) {
  const identity = identities.owner;
  const threadId = 'owner-thread';
  await reset(testEnv, { [identity.email]: 'owner' });
  const database = authContext(testEnv, identity).firestore();
  const thread = database.doc(threadPath(threadId));
  const message = database.doc(messagePath(threadId));

  await assertSucceeds(thread.set(threadFor(identity)));
  await assertSucceeds(message.set(messageFor(identity)));
  await assertSucceeds(thread.get());
  await assertSucceeds(message.get());
  await assertSucceeds(database.doc(`allowed/${identity.email}`).get());
  await assertSucceeds(
    thread.update({
      status: 'resolved',
      resolvedAt: '2026-08-07T20:03:00.000Z',
      resolvedBy: { uid: identity.uid, email: identity.email },
      updatedAt: '2026-08-07T20:03:00.000Z',
    })
  );
  await assertSucceeds(
    thread.update({
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
      updatedAt: '2026-08-07T20:04:00.000Z',
    })
  );
  await assertFails(message.delete());
  await assertFails(thread.delete());
  await assertSucceeds(thread.update({ status: 'deleting', updatedAt: '2026-08-07T20:05:00.000Z' }));
  await assertSucceeds(message.delete());
  await assertSucceeds(thread.delete());
}

async function exerciseInvalidAndCrossPrototypeWrites(testEnv) {
  const identity = identities.domainReviewer;
  await reset(testEnv);
  const database = authContext(testEnv, identity).firestore();

  await assertFails(
    database.doc(threadPath('invalid-anchor')).set(threadFor(identity, { anchor: validAnchor({ rx: 1.5 }) }))
  );
  await assertFails(
    database.doc(threadPath('wrong-creator')).set(
      threadFor(identity, {
        createdBy: { uid: identities.unapproved.uid, email: identities.unapproved.email },
      })
    )
  );

  await assertSucceeds(database.doc(threadPath('prototype-boundary')).set(threadFor(identity)));
  await assertFails(
    database
      .doc(messagePath('prototype-boundary', 'cross-prototype-message', OTHER_PROTOTYPE_ID))
      .set(messageFor(identity))
  );
  await assertSucceeds(database.doc(messagePath('prototype-boundary')).set(messageFor(identity)));
  await assertFails(
    database.doc(messagePath('prototype-boundary')).update({
      author: { uid: identities.unapproved.uid, email: identities.unapproved.email },
    })
  );
  await assertFails(
    database.doc(messagePath('prototype-boundary', 'agent-message')).set(messageFor(identity, { agent: true }))
  );
}

async function main() {
  requireDemoEmulator();
  const rules = fs.readFileSync(path.resolve(__dirname, '..', 'comments.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: FIRESTORE_HOST, port: FIRESTORE_PORT, rules },
  });

  try {
    await assertDeniedIdentity(
      testEnv,
      testEnv.unauthenticatedContext(),
      { uid: 'signed-out', email: 'signed-out@invalid.test' },
      'signed-out'
    );
    await assertDeniedIdentity(
      testEnv,
      authContext(testEnv, identities.unapproved),
      identities.unapproved,
      'unapproved'
    );
    await exerciseReviewer(testEnv, identities.domainReviewer, 'approved-domain');
    await exerciseReviewer(testEnv, identities.explicitReviewer, 'explicit-allowlist', {
      [identities.explicitReviewer.email]: 'reviewer',
    });
    await exerciseOwner(testEnv);
    await exerciseInvalidAndCrossPrototypeWrites(testEnv);
    process.stdout.write(
      'comments-rules-qa: signed-out, unapproved, domain, allowlist, owner and invalid/cross-prototype matrix — OK\n'
    );
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
