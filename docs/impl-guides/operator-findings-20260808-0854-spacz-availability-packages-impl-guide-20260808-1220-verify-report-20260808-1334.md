# Implementation Verification Report

## Verification moment

- **Date:** 2026-08-08 13:34:36 CEST
- **Branch:** `main`
- **Commit under verification:** `ef1f26eb387ac2d79d51f424ea2a2cbc0e25b02c` — `fix: restrict receipt promotion to refresh`
- **Impl guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md`
- **Implementation report:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-impl-report-20260808-1324.md`
- **Prior verification:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- **Source reports:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- **Reviewer:** Codex (`impl-verify` skill), fresh independent session
- **Toolkit version:** 7.2.0
- **Reasoning tier applied:** verification `high`; implementation required `high` for both cards in the guide.

## Dashboard

| Metric | Value |
|---|---:|
| Total cards | 2 |
| ✅ Verified | 2 (100%) |
| ⚠️ Partial | 0 (0%) |
| ❌ Not implemented | 0 (0%) |
| ⛔ Blocked | 0 (0%) |
| Total DoD points | 10 |
| DoD points met | 10 (100%) |
| Test evidence groups required | 4 |
| Test evidence groups passing | 4 / 4 |
| Branch coverage (changed files) | N/A — no coverage tooling configured |
| Mutation score (changed files) | N/A — no mutation tooling configured |
| New findings (holistic audit) | 0 |

## Completion score: 100%

Calculated as `(2 × 1.0) / 2 × 100`.

## Card verification

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#IMPL-01` | verified | `proto-m.js:952-1032` derives the rendered date axis and refuses non-member/gapped ranges; independently re-run CZ/EN browser matrix passes. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#IMPL-02` | verified | Receipt inventories 16 screens, 24 dumps, eight previews and eight captures; stale/inventory/marker/atomic-promotion cases pass and the full source-commit → refresh → generated-only-commit sequence was reproduced in an isolated clone. |

## Per-card verification

### IMPL-01 — Reject bulk ranges outside the supported calendar ✅

**Status:** Implemented as canonical date-axis membership validation, with no clipping of an out-of-period selection.

**DoD checklist:**

- [x] `2026-10-10…2026-10-17` and `2026-10-18…2026-10-25` preview zero, display a localized available-period error, keep the editor open and preserve state — `proto-m.js:993-1016`; `tools/test-mobile-browser.js:862-910,992-994`.
- [x] The exact `2026-10-12…2026-10-23` boundary is inclusive and previews/mutates exactly twelve Double cells — `tools/test-mobile-browser.js:997-1045`.
- [x] Existing Double 16–17 October numeric and all-room two-date paths remain covered without widening the selection — `tools/test-mobile-browser.js:1085-1247`.
- [x] Invalid ranges stay non-mutating through reload while `novalidate` remains present — `tools/test-mobile-browser.js:862-910`.
- [x] Both Czech and English execute the range suite, alongside zero, stop-sell, restrictions and storage-failure paths — `tools/test-mobile-browser.js:1593-1648`.

**Tests:**

- Browser CZ/EN: ✅ `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm --prefix tools run test:browser`.
- Regression: ✅ 16-screen click matrix and 8-anchor workshop suite pass.

**Edge cases:**

- ✅ Syntactically valid but non-member endpoints are rejected before a cell list is formed.
- ✅ A gap in the rendered axis is rejected by the consecutive-date check.
- ✅ Numeric `0`, stop sell, permissions and failed-storage rollback remain distinct.

**Architecture:** ✅ The runtime derives its axis from rendered availability cells; no second hand-maintained calendar was added.

### IMPL-02 — Regenerate and prove freshness of product-derived artifacts ✅

**Status:** Implemented as a manifest-derived inventory plus content-hash receipt, emitted only after the complete refresh chain.

**DoD checklist:**

- [x] All 24 tracked dump files are present, manifest-accounted and marker-free — `tools/artifact-integrity.js:104-129,209-254`; independent `rg -n -i 'demo|ukázk|DEMO-' tools/dumps` returns no matches.
- [x] Eight previews, eight representative captures and the Figma export are regenerated and current; both Availability and Offer previews were independently inspected, and the Figma archive decodes to 24/24 `390×844` frames.
- [x] Missing, extra, stale, corrupt and marker-bearing outputs are rejected; expected dumps/previews/captures are derived from `prototype.json` and `usecases.json`, not a duplicate list — `tools/artifact-integrity.js:104-129,194-304`; `tools/test-artifact-integrity.js:117-290`.
- [x] A full project-owned refresh produces the declared chain and verifies byte-consistency of every generated mobile screen — `tools/refresh.js:452-491`; `tools/test-mobile.js:47-64,137-151`.
- [x] Existing source/product vocabulary, identity and use-case contracts remain green — `npm --prefix tools test` static/config stages and the browser matrix.

**Tests:**

- Static integrity: ✅ `node tools/artifact-integrity.js --check` and `node tools/test-artifact-integrity.js` (stale input/output, missing/extra dump, marker, corrupt receipt, failed atomic promotion, shallow history and generated-only history controls).
- Full artifact flow: ✅ in isolated clone: source commit `3dca2c7` correctly invalidated the receipt before refresh; after complete refresh, all 28 changed files satisfied `generatedArtifactOnly`, generated-only commit `1e27702` preserved a passing receipt check.
- Browser/export: ✅ full CZ/EN browser gate; `unzip -t spa-cz-partner-mobile.fig`; decoded Figma tree contains 24/24 `390×844` top-level frames.

**Edge cases:**

- ✅ The receipt uses hashes rather than timestamps, includes the package lock and output inventory, and blocks direct receipt promotion.
- ✅ A source commit intentionally invalidates receipt/changelog provenance until the required complete refresh; a following generated-only refresh commit is excluded from source history and remains valid.
- ✅ No `m-*.html`, dump, PNG or `.fig` was manually edited in this verification.

**Architecture:** ✅ The manifest owns frame/preview identity; `tools/refresh.js` owns receipt promotion after screens → changelog → use cases/captures → previews → dumps/Figma.

## Holistic audit

### Consistency across cards — ✅

The bulk validation uses the runtime’s rendered availability model. The artifact receipt binds that model, generated screens, captures, dumps, previews, Figma output and changelog provenance together without adding a second calendar or preview list.

### Regressions — ✅ with external environment disclosure

- ✅ `npm --prefix tools run lint`
- ✅ `npm --prefix tools run format:check`
- ✅ `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm --prefix tools run test:browser` — 16 screens, CZ/EN click matrix and 8-anchor workshop/100-case suite.
- ✅ `node tools/artifact-integrity.js --check`
- ✅ `git diff --cached --check`
- ⚠️ `npm --prefix tools test` passes all static/product/artifact-integrity/Firebase-config/comments-config stages, then reaches the unchanged external limitation: `test:comments-rules` cannot start the Firestore emulator because Java Runtime is absent. No test was skipped, removed or weakened; this is the explicitly excluded legacy Firebase boundary.

### Missed aspects — ✅

No new availability/package finding was observed. `docs/audits/operator-findings-20260807-2103.md#OP-06` remains Firebase Comments work and was not inspected, planned or added to scope.

### Implementation cleanliness — ✅

No hand-edited generated mobile HTML was found; static reproduction assertions, immutable receipt data and exact inventory checks are present.

### Quality metrics — ✅

Coverage and mutation scripts are not configured. The project provides the applicable static, browser and export gates instead.

### Security & performance of new code — ✅

The new validation rejects malformed/non-canonical inputs before mutations. Receipt promotion remains private to the completed refresh orchestration, and no unbounded runtime network path was added.

## Findings

No new `IV-nn` findings.

## Recommendation

✅ **Implementation complete** — both repair cards are independently verified. Re-measure the original six-card guide and the six source effects as the next lifecycle evidence.

## Next step

`/outcome-review docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1332.md`

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-impl-report-20260808-1324.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md#{IMPL-01,IMPL-02}`
- State: `verified`
- Evidence: `ef1f26eb387ac2d79d51f424ea2a2cbc0e25b02c`; independent full CZ/EN browser gate, artifact-integrity contract and isolated complete receipt flow.
- Next: `/outcome-review docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1332.md`
