# Implementation guide — SPA.CZ Firebase activation correction

**Sources:** `docs/audits/firebase-activation-findings-20260807-2215.md`; `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md`  
**Generated:** 2026-08-07 22:18 CEST  
**Severity filter:** medium — all open Firebase findings included  
**Toolkit version:** 7.1.1  
**Expected base:** `b781dccd646b916eee67403f3fde0d64b687980f`

## Triage and convergence history

This is the first corrective cycle for `IV-01`, `OP-01` and `OP-02`. The first implementation added the repository runbook but deliberately stopped before authenticated execution. The first real authenticated run exposed two previously unmeasured deployment defects: the config-directory containment failure and automatic `nam5` database creation. No prior corrective attempt exists, so the non-convergence gate does not apply.

### IMPL-01: Add executable comments configuration and Firestore rules tests

**Source:** `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md#IV-01`  
**Severity/Priority:** Medium  
**Workstream:** A — Comments security gates  
**Reasoning tier:** high

#### Context

The package includes the config validator and Firestore rules-testing dependency, but the green suite exercises neither an invalid/valid configuration matrix nor the actual rules authorization matrix.

#### What to do

1. Add a Node unit test covering a valid deployment config and invalid shapes/values that matter to the browser layer. Exercise the same exported validator and schema used at deployment, without live credentials.
2. Add an emulator-backed Firestore rules test for signed-out, unapproved-domain, approved-domain reviewer, explicit allowlisted reviewer and exact owner identities. Verify read/create/reply/resolve/reopen permissions and owner-only deletion according to `comments.rules`.
3. Start the emulator through the pinned local Firebase CLI, on fixed loopback-only ports, with a deterministic demo project ID and no live project access.
4. Wire both suites into `npm --prefix tools test` and GitHub Actions. Pin a Java runtime in CI; document the local Java prerequisite and keep live credentials out of all fixtures/output.

#### Scope

- Files: `tools/package.json`, `.github/workflows/prototype-refresh.yml`, `README.md`, `CLAUDE.md`
- New files: `tools/test-comments-config.js`, `tools/test-comments-rules.js`
- Dependencies: existing `@firebase/rules-unit-testing`, `firebase-tools`, Firebase client SDK

#### Definition of Done

- [ ] Valid and invalid configuration cases execute in the default local/CI test gate.
- [ ] Emulator tests prove owner, reviewer, explicit allowlist, unapproved and signed-out behavior for thread/reply/state/delete operations.
- [ ] Tests use only deterministic fake identities and a `demo-` project; no network call can reach the live project.
- [ ] CI installs a declared Java runtime and runs the same emulator command as local development.
- [ ] Static, lint, format and emulator/browser gates pass.

#### Test scenarios

- **Unit:** missing/unknown fields, invalid URL/domain/state keys, incomplete Firebase app config, valid canonical config and no mutation of input.
- **Integration:** signed-out denial; unapproved denial; approved-domain and explicit allowlist reviewer CRUD allowed except delete; exact owner delete allowed; cross-prototype/invalid data denied.

#### Dependencies

- Blocked by: none
- Blocks: final rules deployment and `IMPL-03`

### IMPL-02: Make the Firebase deployment configuration executable

**Source:** `docs/audits/firebase-activation-findings-20260807-2215.md#OP-01`  
**Severity/Priority:** High  
**Workstream:** B — Firebase deploy contract  
**Reasoning tier:** high

#### Context

Firebase CLI treats the directory containing `--config` as the project boundary. `tools/firebase.json` cannot legally reference root `comments.rules`, so the documented dry run always fails after external APIs may already have changed.

#### What to do

1. Move the canonical Firebase CLI configuration to repository-root `firebase.json`, with root-relative `comments.rules` and the existing loopback emulator settings. Remove the unusable `tools/firebase.json` rather than keeping two authorities.
2. Update every runbook/README/CLAUDE command to pass `--config firebase.json` from the repository root.
3. Add a repository preflight/test that loads the exact deployment config, resolves the rules path, proves it is a regular file contained within the config directory, checks emulator hosts are loopback-only and fails on the retired tools config.
4. Run the real authenticated dry run after the rules domain is patched and after `IMPL-03` confirms the database location.

#### Scope

- Files: `tools/firebase.json` (remove), `docs/firebase-comments-setup.md`, `README.md`, `CLAUDE.md`, `tools/test-mobile.js`, `tools/package.json`
- New files: `firebase.json`, `tools/test-firebase-deploy-config.js`
- Dependencies: IMPL-01 for the final gate

#### Definition of Done

- [ ] Root config resolves root `comments.rules` inside its project boundary; the real CLI dry run no longer emits the outside-project error.
- [ ] One canonical config powers emulator tests and live rules deployment; no stale command or second config remains.
- [ ] Default tests fail on path escape, missing/non-regular rules, non-loopback emulator hosts or reintroduction of `tools/firebase.json`.
- [ ] Documentation commands are executable from the stated working directory and use explicit `--project` without `.firebaserc`.

#### Test scenarios

- **Unit/static:** canonical config valid; traversal path, symlink/non-file target, missing rules, public emulator host and duplicate tools config rejected.
- **Integration:** authenticated CLI `deploy --only firestore:rules --dry-run` reaches rule compilation for the exact dedicated project.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-03 and final activation

### IMPL-03: Make Firestore location selection precede every deployment

**Source:** `docs/audits/firebase-activation-findings-20260807-2215.md#OP-02`  
**Severity/Priority:** High  
**Workstream:** B — Firebase deploy contract  
**Reasoning tier:** high

#### Context

The first dry run created the default database in `nam5` before any explicit choice. The dedicated database is still empty and no rules/config/secret/comments have been deployed, so this is the only safe correction window.

#### What to do

1. Amend the runbook so project creation is followed immediately by explicit default-database creation in the approved EU location and a machine-readable location assertion, before any rules command.
2. Add a guarded recovery path for a just-created empty database in the wrong location. It must identify the exact project/database, confirm no comment activation occurred, delete only that database and honor any recreate cooldown before creating `(default)` in the approved location.
3. In the current authenticated session, correct the dedicated project's empty `(default)` database from `nam5` to `europe-west3`, then verify name, type, edition and location before rules deployment.
4. Make all later deploy steps depend on the location assertion and leave rollback/disable behavior intact.

#### Scope

- Files: `docs/firebase-comments-setup.md`, `README.md`, `CLAUDE.md`
- External system: only `projects/spa-cz-partner-mobile/databases/(default)`, currently empty and not activated
- Dependencies: IMPL-02 for canonical deploy command

#### Definition of Done

- [ ] No runbook rules command occurs before explicit database creation and location verification.
- [ ] Recovery enumerates and validates the exact target and refuses a project/database/location mismatch or any activated/comment-bearing environment.
- [ ] Dedicated `(default)` database reports `FIRESTORE_NATIVE`, `STANDARD` and `europe-west3` before rule deployment.
- [ ] The preflight/runbook prevents another implicit default-location creation.
- [ ] No comment data, unrelated Firebase project or existing Litoralul resource is modified.

#### Test scenarios

- **Static:** runbook order assertion; explicit project/database/location guards; no deploy command before location gate.
- **External integration:** exact database get/delete/create/get sequence, followed by canonical rules dry run.

#### Dependencies

- Blocked by: IMPL-02
- Blocks: final rules/config/secret/Pages/live-comment activation

## New patterns this guide introduces

| Pattern | Created by | Location | Used by |
|---|---|---|---|
| Credential-free comments security matrix | IMPL-01 | `tools/test-comments-*.js` | local and CI gates |
| One canonical root Firebase project boundary | IMPL-02 | `firebase.json` | emulator and live rules deployment |
| Explicit Firestore location gate | IMPL-03 | runbook + external verification | every live Firebase activation |

## Execution plan

### Round 1 — parallel, high reasoning

- **Agent 1 — Workstream A:** IMPL-01; owns comments config/rules tests and package/CI wiring.
- **Agent 2 — Workstream B:** IMPL-02 and repository/documentation portion of IMPL-03; owns root Firebase config, deploy preflight and runbook changes.
- **Orchestrator:** integrates overlapping package/docs files, installs/runs the local Java prerequisite, applies the external empty-database correction in the already authenticated PTY, then completes original `IMPL-06` through rules, allowlist, secret, Pages and live smoke evidence.

## Handoff

- Source: `docs/audits/firebase-activation-findings-20260807-2215.md`, `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md`
- Scope: `docs/audits/firebase-activation-findings-20260807-2215.md#{OP-01,OP-02}`, `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md#IV-01`
- State: `planned`
- Evidence: `uncommitted`
- Next: `/start-impl docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`
