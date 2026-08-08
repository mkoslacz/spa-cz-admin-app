# Implementation report — receipt fixture index isolation

**Guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md`
**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md#IV-03`
**Implemented:** 2026-08-08 13:56 CEST
**Implementation commit:** `bbae428` — `fix: isolate artifact receipt test index`
**Toolkit version:** 7.2.0

## Outcome

The receipt test is self-contained in both dirty and clean caller states. It now creates a controlled staged caller index in an outer temporary repository, proves that an inner copy inherits it, then resets only the inner index before testing history behavior. The real repository's index is neither inspected as a dependency nor modified.

This is implementation evidence; a fresh verification remains required.

## Card results

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md#IMPL-01` | implemented | The outer fixture stages exactly a lifecycle-report probe and a derived-artifact probe as index-only Git blobs. The copied inner fixture must inherit exactly those paths, resets its own index to `HEAD`, proves it is empty, then commits exactly the generated-only sentinel (receipt stays valid) and exactly a non-generated source probe (receipt correctly becomes stale). |

## Delivered changes

- `tools/test-artifact-integrity.js` parameterizes repository copying by source root.
- It creates isolated outer/inner fixtures and asserts their index paths before and after isolation.
- It retains every prior input/output/inventory/marker/receipt/atomic-write negative proof.
- No product source or generated artifact was changed.

## Verification performed

| Command/check | Result |
|---|---|
| `node tools/test-artifact-integrity.js` | pass — controlled staged-index fixture, generated-only and source-history proofs |
| `npm --prefix tools run test:static` | pass — use-case, product, mobile, artifact-integrity and Firebase-config contracts |
| `npm --prefix tools run lint` | pass |
| `npm --prefix tools run format:check` | pass |
| `CHROME_PATH=… npm --prefix tools run test:browser` | pass — 16 screens, CZ/EN click matrix and workshop CRUD/100-case/conflict/safe fallback |
| `npm --prefix tools test` | static and comments-config stages pass; only the existing Java Runtime absence blocks Firestore emulator rules |
| independent pre-verify | pass — inner-only reset, exact paths and real-worktree non-mutation confirmed |

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md#IMPL-01`
- State: `implemented`
- Evidence: staged-index self-contained fixture and full static/CZ-EN browser gates at 13:56 CEST
- Next: `/impl-verify docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md`
