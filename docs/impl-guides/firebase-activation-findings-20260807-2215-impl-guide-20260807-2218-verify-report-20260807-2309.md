# Implementation Verification Report

## Verification moment

- **Date:** 2026-08-07 23:09:40 CEST
- **Branch:** `main`
- **Commit:** `f846a6b5c6b6c503af928391d2ee5c5365a8fe8e` — `docs: record Firebase activation implementation`
- **Verified implementation commit:** `c2d70a6f340804728c10a623eb8971be801701e2` — `feat: activate secure Firebase comments`
- **Impl guide:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`
- **Implementation report:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-impl-report-20260807-2255.md`
- **Secondary remeasurement:** `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md`, previous attempt `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md`
- **Source reports:** `docs/audits/firebase-activation-findings-20260807-2215.md`, `docs/audits/operator-findings-20260807-2103.md`
- **Reviewer:** Codex (impl-verify skill), fresh independent agent
- **Toolkit version:** 7.2.0
- **Reasoning tier applied:** `high`; Codex collaboration agent on `gpt-5.6-sol` with parent-inherited high effort. Implementing tier read from the implementation report: `gpt-5.6-sol`, high reasoning for both workstreams and orchestrator; no degradation reported.

## Dashboard

| Metric | Value |
|--------|-------|
| Total card rows | 9 — 3 primary cards, 6 secondary-guide remeasurement rows |
| Cards checked | 5 |
| ✅ Implemented | 4 / 5 checked (80%) |
| ⚠️ Partial | 1 / 5 checked (20%) |
| ❌ Not implemented | 0 |
| Not checked | 4 — previously verified secondary cards outside this remeasurement scope |
| 🔀 Differently than plan | 0 |
| 🗑️ No longer needed | 0 |
| Total DoD points checked | 24 |
| DoD points met | 23 / 24 (95.8%) |
| Tests required | 10 checked card-level categories |
| Tests existing | 10 / 10 |
| Tests passing | 9 / 10 evidenced; live signed-in identity matrix not re-executed |
| Branch coverage (changed files) | N/A — no configured coverage command or CI coverage job |
| Mutation score (changed files) | N/A — mutation testing not configured |
| New findings (holistic audit) | 2 |

## Completion score: 90%

Calculated over the five checked cards as `(4 × 1.0 + 1 × 0.5) / 5 × 100`; four `not checked` abstentions from the secondary remeasurement are excluded.

---

## Card verification

| Card | Outcome | Evidence |
|------|---------|----------|
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-01` | verified | `c2d70a6f340804728c10a623eb8971be801701e2`; local static/config gates passed; CI/Pages run `31217975147` succeeded at `f846a6b5c6b6c503af928391d2ee5c5365a8fe8e` with Java 21 and the default `npm --prefix tools test` gate. |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-02` | verified | Root `firebase.json` is the only authority; six negative preflight cases passed; the published comments layer loads its injected configuration and the implementation report records successful canonical dry-run and rules release. |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-03` | verified | Static order/location guards passed; the implementation report records the exact machine-readable `europe-west3` database assertion before deployment; the published configured comment layer is consistent with completion of that gated path. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-01` | verified | Re-measured because package/workflow/test scope changed: local static workshop tests passed and CI/Pages run `31217975147` supplied the previously missing successful CI evidence at current HEAD. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-02` | not checked | Previously verified; no file in its declared implementation scope changed after the prior verification commit. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-03` | not checked | Previously verified; no file in its declared implementation scope changed after the prior verification commit. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-04` | not checked | Previously verified; no file in its declared implementation scope changed after the prior verification commit. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-05` | not checked | Previously verified; no file in its declared implementation scope changed after the prior verification commit. |
| `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#IMPL-06` | partial | Project/config/rules/secret/Pages activation is now observable and the local test gaps are closed, but this verifier had no signed-in owner, reviewer and unapproved accounts; live create/reply/resolve/reopen/delete and unauthorized-denial evidence was not re-executed. |

---

## Per-card verification

### IMPL-01 — Add executable comments configuration and Firestore rules tests ✅

**Status:** Implemented; repository and CI gates contain both required test surfaces.

**DoD checklist:**

- [x] Canonical plus 14 invalid configuration cases run in the default gate — `tools/test-comments-config.js`, `tools/package.json`.
- [x] The emulator suite covers signed-out, unapproved-domain, approved-domain, explicit allowlist and owner identities across thread, reply, state and two-phase deletion behavior — `tools/test-comments-rules.js`.
- [x] The suite uses deterministic fake identities and `demo-spa-cz-comments`; Firebase CLI explicitly reports that attempts to reach non-emulated services fail.
- [x] CI installs Temurin 21 and runs the same package gate as local development — `.github/workflows/prototype-refresh.yml`.
- [x] Static, lint and format checks passed locally; the full emulator/browser gate passed in CI run `31217975147`.

**Tests:** `npm --prefix tools run test:static`, `node tools/test-comments-config.js`, lint and format passed. The local emulator launch was refused by the process sandbox (`listen EPERM` on loopback); the test did not reach assertions and this is not a failing rules verdict. A requested out-of-sandbox rerun was unavailable because the Codex account hit its execution limit. CI provides the complete Java/emulator run at the tested HEAD.

**Architecture and security:** ✅ One exported validator/schema contract is shared with deployment; emulator hosts are loopback-only and the demo project prevents live Firebase access.

### IMPL-02 — Make the Firebase deployment configuration executable ✅

**Status:** The nested-project-boundary failure is removed systemically.

**DoD checklist:**

- [x] Root `firebase.json` resolves root `comments.rules` inside the same real project directory.
- [x] `tools/firebase.json` is removed and repository/docs contain no stale active reference.
- [x] Six negative cases reject traversal, missing/non-file/symlink rules, public hosts and a duplicate nested config — `tools/test-firebase-deploy-config.js`.
- [x] All runbook commands use explicit root `--config firebase.json`; live commands also use explicit project identity.

**Tests:** `npm --prefix tools run test:static` passed and reported 16 guarded CLI commands plus six rejection scenarios. The implementation report records that the exact root-config dry run compiled and the same rules were released. No authenticated deployment command was repeated because this verification was explicitly read-only and the runbook states even a dry run may mutate external API state.

**Architecture:** ✅ One canonical deploy contract serves CI emulator tests and live deployment.

### IMPL-03 — Make Firestore location selection precede every deployment ✅

**Status:** The repository contract prevents rules deployment from becoming implicit database creation; the authenticated implementation evidence records the corrected EU database.

**DoD checklist:**

- [x] Database creation and machine-readable location assertion precede every rules deploy.
- [x] Recovery is constrained to the exact project/database/old location and refuses data or activation.
- [x] The implementation report records exact `(default)`, `FIRESTORE_NATIVE`, `STANDARD`, `europe-west3` evidence before rules release.
- [x] Every rules deployment is immediately preceded by `assert_firestore_database "$FIRESTORE_LOCATION"`; the static test enforces the order.
- [x] Diff scope and guarded procedure show no unrelated Firebase or Litoralul resource target.

**Tests:** The static preflight passed. External database state was not mutated or re-read with private credentials in this read-only round; public live activation is consistent with the recorded gated deployment.

**Architecture:** ✅ The location assertion is a reusable prerequisite for both dry-run and real deploy paths, not a one-off checklist note.

### Secondary IMPL-01 — Build a scalable local use-case workshop ✅

**Status:** The sole previous blocker, missing CI publication evidence, is now closed.

**DoD checklist:**

- [x] CRUD/search/reload/deep-link and normalized import/export behavior remains covered.
- [x] The 100-scenario valid/invalid/XSS/atomicity matrix remains covered.
- [x] Canonical anchors and draft isolation remain unchanged.
- [x] Conflict/reset/export coverage remains unchanged.
- [x] Source/built/capture scale assertions passed locally.
- [x] CI now passes at published HEAD `f846a6b5c6b6c503af928391d2ee5c5365a8fe8e` — run `31217975147`.

**Tests:** The static suite passed locally; the published CI/Pages run supplies the full browser/refresh evidence that was absent from the 22:08 verification.

### Secondary IMPL-06 — Make Firebase comments setup recoverable and run it in one session ⚠️

**Status:** External activation and local security gates converged, but the full live signed-in identity matrix remains unverified in this round.

**DoD checklist:**

- [x] Implementation evidence records fresh same-context login and project reads.
- [x] Dedicated project, Web app, Google provider, EU Firestore, owner allowlist and rules release are recorded; live pages load the configured comment layer.
- [ ] Published config/Pages are proven and signed-out behavior is observed, but owner CRUD/delete, approved non-owner no-delete and unapproved-account denial were not re-executed.
- [x] Git status exposes the local config only as ignored; no credential, one-time code or export is tracked or printed.
- [x] The runbook includes guarded recovery, disable and rollback paths.

**Tests:** Config validator, static Firebase preflight and CI emulator matrix pass. Live `comments.html` shows the signed-out wall and sign-in action rather than the unconfigured error. No suitable authenticated identity set was available to execute destructive disposable-thread smoke tests, so the card remains `partial`, not silently closed.

---

## Holistic audit

### Consistency across cards — ✅

Root Firebase configuration, deployment preflight, emulator suite and runbook all use the same rules file, project identity and location gate. No second Firebase authority or project alias remains.

### Regressions — ⚠️

- ✅ Static tests, comments-config matrix, lint and format passed locally.
- ✅ CI/Pages run `31217975147` succeeded for `f846a6b5c6b6c503af928391d2ee5c5365a8fe8e` and the published application is reachable.
- ⚠️ Local emulator and HTTP browser suites could not bind loopback ports in the process sandbox. The requested escalation and direct GitHub API read were unavailable because the Codex account hit its execution limit; this is recorded as an environment limit, not a green local assertion.
- ❌ At a wide 1280 × 844 review viewport with the 390 px phone centered and the floating panel beside it, the three review-page links remain one compressed horizontal segment. Each rendered width is smaller than its text width, and the screenshot shows joined/overlapping labels (`IV-01`). At a browser viewport of 390 × 844 the responsive panel is wider and the overlap does not reproduce, which is why the prior narrow-only check missed it.

### Missed aspects — ⚠️

- The live hub still says `comments.config.json` is intentionally absent while the deployed comment layer reaches the signed-out state, proving that a valid configuration loaded (`IV-02`).
- The old Firebase card's exact owner/reviewer/unapproved live behavior remains unmeasured in this verifier session; it stays `partial` rather than spawning a duplicate finding.

### Implementation cleanliness — ✅

The implementation range contains one feature commit plus its immutable implementation report. `git diff --check` passed; local config and Firebase debug output remain ignored.

### Quality metrics — ⚠️

Coverage and mutation commands are not configured. Tier-1 local checks passed where they do not require loopback binding; the full configured gate is evidenced by CI.

### Security & performance of new code — ✅

Inputs are schema-validated, rules are exercised against bounded fake identities, emulators are loopback-only, project selection is explicit, database recovery fails closed and no retry loop or broad external target was introduced.

---

## Findings (sorted by severity)

| ID | Type | Severity | Source | Location | Problem | Recommendation |
|----|------|----------|--------|----------|---------|----------------|
| IV-01 | Responsive review-control defect | ⚠️ med. | holistic | `proto-tools.css`; `proto-tools.js`; `tools/test-mobile-browser.js` | In the required wide review layout, `.pt-pages` renders Changelog, Use cases and Comments as one three-part row. At 1280 × 844 all links share `top=717`; widths are 56/55/57 px while their scroll widths are 60/57/61 px, so labels join/overlap. The required outcome is three separate buttons stacked vertically. | Render the three review destinations as full-width separate rows in both panel placements, retain clear touch/focus states, and add wide and narrow browser assertions for vertical order and zero text overflow. |
| IV-02 | Stale activation copy | ℹ️ low | holistic | `index.html`; live review hub | The live hub says `comments.config.json` is intentionally absent, while the deployed comments runtime loads a valid config and shows the signed-out authentication wall. Reviewers receive contradictory activation status. | Make the hub copy neutral or derive the configured/unconfigured state from the same runtime probe as the comment layer; add a published-package assertion that hub status agrees with config presence. |

## Expected effects

| Finding | Observable | Read how | Value at emission |
|---|---|---|---|
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md#IV-01` | Wide floating-panel review controls at `.pt-pages` | At 1280 × 844 open a generated mobile screen with the panel expanded; read flex direction, link top coordinates, `clientWidth` and `scrollWidth`, then run the browser regression gate | `flex-direction: row`; all link tops `717`; widths `56/55/57` are below scroll widths `60/57/61`; labels visibly join |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md#IV-02` | Agreement between published config presence and hub activation copy | Load `/comments.html` signed out and `/`; compare unconfigured/signed-out state with the hub's Comment privacy paragraph | Comment layer reaches signed-out state, while hub says `comments.config.json` is intentionally absent |

## Recommendation

⚠️ **Requires fixes and final live identity verification** — the primary Firebase correction cards are verified and secondary `IMPL-01` is closed. Secondary `IMPL-06` remains partial until the exact owner, approved reviewer and unapproved-account live matrix is observed. Fix `IV-01` and `IV-02`, then verify the repair guide and remeasure original `IMPL-06` once with suitable accounts.

## Suggested CLAUDE.md Updates

### Known Issues Updates

- **ADD (medium):** The wide floating review panel compresses Review pages into one overflowing row; require three vertically stacked destinations and browser coverage for both wide-panel and phone-viewport placements.
- Keep the existing Firebase live-smoke boundary open until owner/reviewer/unapproved identities are exercised on the published site.

These updates were not applied because this verification was explicitly restricted to a new immutable report and no code/project-instruction changes.

## Next step

Generate a fix plan in a fresh session:

`/impl-guide docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md`

## Handoff

- Source: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`, `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-impl-report-20260807-2255.md`, `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md`, `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md`
- Scope: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#{IMPL-01,IMPL-02,IMPL-03}`, `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md#{IMPL-01,IMPL-02,IMPL-03,IMPL-04,IMPL-05,IMPL-06}`, `IV-01`, `IV-02`
- State: `partial`
- Evidence: `f846a6b5c6b6c503af928391d2ee5c5365a8fe8e`; `c2d70a6f340804728c10a623eb8971be801701e2`; local static/config/lint/format gates; CI/Pages run `31217975147`; live HTTP/browser inspection at 390 × 844 and 1280 × 844
- Next: `/impl-guide docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md`
