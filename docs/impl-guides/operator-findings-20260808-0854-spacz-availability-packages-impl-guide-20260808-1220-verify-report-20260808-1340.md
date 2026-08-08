# Implementation Verification Report

## Verification moment

- **Date:** 2026-08-08 13:40:28 CEST
- **Branch:** `main`
- **Commit under verification:** `ef1f26eb387ac2d79d51f424ea2a2cbc0e25b02c` — `fix: restrict receipt promotion to refresh`
- **Impl guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md`
- **Implementation report:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-impl-report-20260808-1324.md`
- **Previous verification:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1334.md`
- **Source reports:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- **Reviewer:** Codex (`impl-verify` skill), independent re-measurement after the staged final gate
- **Toolkit version:** 7.2.0
- **Reasoning tier applied:** verification `high`; implementation required `high` for both cards in the guide.

## Dashboard

| Metric | Value |
|---|---:|
| Total cards | 2 |
| ✅ Verified | 1 (50%) |
| ⚠️ Partial | 1 (50%) |
| ❌ Not implemented | 0 (0%) |
| ⛔ Blocked | 0 (0%) |
| Total DoD points | 10 |
| DoD points met | 8 (80%) |
| Test evidence groups required | 4 |
| Test evidence groups passing | 3 / 4 |
| Branch coverage (changed files) | N/A — no coverage tooling configured |
| Mutation score (changed files) | N/A — no mutation tooling configured |
| New findings (holistic audit) | 1 × Medium |

## Completion score: 75%

Calculated as `(1 × 1.0 + 1 × 0.5) / 2 × 100`.

## Card verification

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#IMPL-01` | verified | `proto-m.js:952-1032` derives the rendered date axis and refuses non-member/gapped ranges; the independent CZ/EN browser matrix passes. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#IMPL-02` | partial | Product artifacts and direct receipt checks are correct, but `tools/test-artifact-integrity.js` fails after the required reports/artifacts are staged because its temporary repository copies the caller’s staged `.git/index` (`IV-03`). |

## Per-card verification

### IMPL-01 — Reject bulk ranges outside the supported calendar ✅

**Status:** Implemented as canonical date-axis membership validation, with no clipping of an out-of-period selection.

**DoD checklist:**

- [x] Below-minimum and above-maximum ranges preview zero, display localized available-period errors, keep the editor open and preserve state — `proto-m.js:993-1016`; `tools/test-mobile-browser.js:862-910,992-994`.
- [x] The exact `2026-10-12…2026-10-23` boundary is inclusive and previews/mutates exactly twelve Double cells — `tools/test-mobile-browser.js:997-1045`.
- [x] Existing Double 16–17 October numeric and all-room two-date paths remain scoped — `tools/test-mobile-browser.js:1085-1247`.
- [x] Invalid ranges remain non-mutating through reload with `novalidate` present — `tools/test-mobile-browser.js:862-910`.
- [x] Czech and English execute the range suite alongside zero, stop-sell, restriction and storage-failure paths — `tools/test-mobile-browser.js:1593-1648`.

**Tests:**

- Browser CZ/EN: ✅ `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm --prefix tools run test:browser`.
- Regression: ✅ 16-screen click matrix and 8-anchor workshop suite pass.

**Edge cases:**

- ✅ Non-member endpoints and gaps in a future axis are rejected before cells are selected.
- ✅ Numeric `0`, stop sell, permissions and failed-storage rollback remain distinct.

**Architecture:** ✅ The runtime derives the axis from rendered availability cells; no hand-maintained duplicate calendar exists.

### IMPL-02 — Regenerate and prove freshness of product-derived artifacts ⚠️

**Status:** The implementation and artifact outputs are correct, but the mandatory static proof cannot run in the lifecycle-required staged state.

**DoD checklist:**

- [x] All 24 tracked dump files are manifest-accounted and marker-free — `tools/artifact-integrity.js:104-129,209-254`; direct marker scan returns no matches.
- [x] Eight previews, eight representative captures and the Figma export are regenerated; Availability and Offer previews were independently inspected, and Figma decodes to 24/24 `390×844` frames.
- [ ] The complete artifact contract is not reliable with staged lifecycle artifacts: its generated-only history probe inherits unrelated index entries and reports a false stale receipt (`IV-03`).
- [x] A full project-owned refresh creates the declared chain and generated mobile screens remain byte-consistent — `tools/refresh.js:452-491`; `tools/test-mobile.js:47-64,137-151`.
- [ ] The existing source/product contract suite is not green in the required staged gate because `test-artifact-integrity.js` stops at `IV-03` before the remaining static/config checks.

**Tests:**

- Direct integrity: ✅ `node tools/artifact-integrity.js --check` — 16 screens, 24 dumps, eight previews and eight captures.
- Browser/export: ✅ full CZ/EN browser gate; `unzip -t spa-cz-partner-mobile.fig`; decoded Figma tree contains 24/24 `390×844` frames.
- Static staged gate: ❌ `npm --prefix tools test` reaches `tools/test-artifact-integrity.js:267` and throws `artifact integrity receipt changelog source is stale`.

**Edge cases:**

- ✅ The pre-existing direct contract still rejects stale input/output, missing/extra dump, marker, corrupt receipt and failed atomic promotion.
- ❌ Its generated-only-history control is contaminated by caller staging, so it cannot prove the intended invariant in the state in which lifecycle reports must be tested.

**Architecture:** ⚠️ Receipt production remains correctly private to complete refresh, but the test fixture must isolate its Git index from the caller before it commits an internal history probe.

## Holistic audit

### Consistency across cards — ⚠️

The product runtime and all generated outputs agree. The test fixture alone violates the lifecycle contract: it runs against a copied working tree but also inherits the caller’s index.

### Regressions — ⚠️

- ✅ `npm --prefix tools run lint`
- ✅ `npm --prefix tools run format:check`
- ✅ `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm --prefix tools run test:browser` — 16 screens, CZ/EN click matrix and 8-anchor workshop/100-case suite.
- ✅ `node tools/artifact-integrity.js --check`
- ✅ `git diff --cached --check`
- ❌ `npm --prefix tools test` fails before the known Java Runtime emulator boundary, at the new staged-index isolation defect.

### Missed aspects — ⚠️

The defect is new implementation-test behavior, not a Firebase issue. `docs/audits/operator-findings-20260807-2103.md#OP-06` remains excluded and was not inspected, planned or added to scope.

### Implementation cleanliness — ⚠️

No hand-edited generated mobile HTML was found. The only defect is a missing test-fixture isolation boundary.

### Quality metrics — ✅

Coverage and mutation scripts are not configured.

### Security & performance of new code — ✅

No new product input/authentication/performance issue was observed. The required correction is limited to a temporary Git index in the static test harness.

## Findings

| ID | Type | Severity | Source | Location | Problem | Recommendation |
|---|---|---|---|---|---|---|
| IV-03 | Test-fixture isolation | Medium | `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#IMPL-02` | `tools/test-artifact-integrity.js:23-30,65-80,264-267` | `withTemporaryRepository()` copies the caller’s `.git/index`; `commit(repository, [generatedOnly])` stages the sentinel path but also commits every unrelated staged lifecycle artifact. That source-containing test commit correctly changes the changelog digest, so the intended generated-only control falsely fails whenever reports/artifacts are staged. | After copying the temporary repository, reset only its index to `HEAD` while preserving its working tree; assert that the generated-only probe commit contains exactly `tools/dumps/receipt-history-probe.txt`; retain the deliberate later source-commit stale-receipt proof. |

## Expected effects

| Finding | Observable | Read how | Value at emission |
|---|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md#IV-03` | The generated-only probe in a temporary repository commits only `tools/dumps/receipt-history-probe.txt`, passes `validateReceipt`, and the subsequent deliberate source commit still fails the receipt check. | Stage a representative lifecycle report and generated outputs, run `node tools/test-artifact-integrity.js`, inspect the probe commit’s changed paths and its final source-history assertion. | With staged lifecycle reports, line 267 fails because the probe commit also contains unrelated staged files and `validateReceipt` reports a stale changelog source. |

## Recommendation

⚠️ **Requires fixes** — fix `IV-03` through a new scoped guide, then rerun the staged full gate, browser CZ/EN gate and independent verification.

## Next step

`/impl-guide docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md medium`

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-impl-report-20260808-1324.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1334.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#{IMPL-01,IMPL-02}`, `IV-03`
- State: `partial`
- Evidence: `ef1f26eb387ac2d79d51f424ea2a2cbc0e25b02c`; staged full-gate failure at `tools/test-artifact-integrity.js:267` and independent direct/browser/export evidence above.
- Next: `/impl-guide docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md medium`
