# Implementation Guide — receipt test-fixture isolation

**Toolkit version:** 7.2.0
**Generated:** 2026-08-08 13:42 CEST
**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md`
**Severity filter:** `medium`
**Baseline commit:** `ef1f26eb387ac2d79d51f424ea2a2cbc0e25b02c` — `fix: restrict receipt promotion to refresh`

## Triage and lineage

`IV-03` is a bounded test-fixture isolation regression. It does not reopen the product/artifact freshness subject from `IV-02`: the current receipt, generated chain and direct artifact check are correct. Its new root cause is the copied caller Git index inside the test fixture, for which no earlier implementation cycle emitted a finding. The subject-recurrence stop gate is therefore not met.

The repair remains inside the original artifact-integrity scope. `docs/audits/operator-findings-20260807-2103.md#OP-06` is Firebase Comments work, is excluded, and still requires a separate operator scope gate.

### IMPL-01: Isolate the temporary receipt-test Git index

**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md#IV-03`
**Severity/Priority:** Medium
**Workstream:** A — artifact test-fixture isolation
**Reasoning tier:** high

#### Context

`tools/test-artifact-integrity.js` copies `.git` so its temporary repository can validate changelog provenance. That also copies the caller's staged index. Its generated-only probe then commits the requested sentinel plus unrelated staged lifecycle artifacts, correctly changing the changelog source digest but falsely failing the generated-only assertion.

#### What to do

1. After copying the temporary repository, reset only its Git index to `HEAD`; preserve the copied working tree, receipt and generated artifacts exactly as they are.
2. Assert the temporary index is empty before a probe begins, then assert the generated-only probe commit contains exactly `tools/dumps/receipt-history-probe.txt`.
3. Keep the two complementary proofs: that a generated-only probe leaves `validateReceipt` green, and that the subsequent deliberate non-generated source commit makes it fail with the changelog-source-stale error.
4. Retain every existing stale-input/output, inventory, marker, corrupt-receipt and atomic-write assertion. Do not bypass Git provenance, skip the staged state or weaken any test.

#### Scope

- Files: `tools/test-artifact-integrity.js`; only a support helper if it is needed solely for this fixture boundary
- Dependencies: existing `tools/artifact-integrity.js` and `tools/build-changelog.js` contracts
- Generated artifacts: none; do not edit `m-*.html`, dumps, captures, previews or `.fig`

#### Definition of Done

- [ ] With representative lifecycle reports and derived artifacts staged in the caller, `node tools/test-artifact-integrity.js` passes.
- [ ] The copied fixture has an empty index before the probe, while its copied worktree remains available for current receipt/input/output validation.
- [ ] The generated-only probe's committed path set is exactly `tools/dumps/receipt-history-probe.txt`, and `validateReceipt` passes immediately afterward.
- [ ] A following deliberate non-generated commit still makes `validateReceipt` fail specifically for stale changelog source.
- [ ] Existing negative checks and the static product/mobile/Firebase-config contracts stay green; CZ/EN browser and workshop regression gates remain green.

#### Edge cases

- Do not reset or alter the caller repository's index; the reset is confined to the newly created temporary repository.
- Do not use a clean source worktree as the proof: the regression only appears when lifecycle artifacts are staged.
- Do not make all documentation commits generated-only; the published changelog intentionally tracks them and a full refresh must follow their commit.

#### Test scenarios

- **Static staged fixture:** stage source lifecycle reports and derived outputs, run the artifact contract, inspect the empty temporary index and exact sentinel-only generated commit.
- **History boundary:** add a deliberate source commit in the temporary fixture and assert stale receipt rejection.
- **Regression:** full static/lint/format gate and full CZ/EN browser/workshop gate.

#### Dependencies

- Blocked by: none
- Blocks: final independent verification and outcome measurement

## Execution plan

One high-reasoning workstream changes only the isolated test fixture. Then run the full staged quality gate and browser matrix; regenerated product artifacts are not required because the canonical product inputs remain unchanged.

| Round | Cards | Dependencies |
|---|---|---|
| 1 | `IMPL-01` | none |
| 2 | staged gate and fresh verification | Round 1 |

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340.md#IV-03`
- State: `planned`
- Evidence: staged-gate reproduction at `tools/test-artifact-integrity.js:267`; prior repair verify report `...1220-verify-report-20260808-1334.md`
- Next: `/start-impl docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342.md`
