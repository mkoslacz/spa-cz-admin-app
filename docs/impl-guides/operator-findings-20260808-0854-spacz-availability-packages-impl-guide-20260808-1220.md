# Implementation Guide — SPA.CZ availability and package verification repairs

**Toolkit version:** 7.2.0
**Generated:** 2026-08-08 12:20:00 CEST
**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
**Severity filter:** `medium`
**Baseline commit:** `2cf40c9a2bb58fe3da75eda3757ac9880013989c` — `docs: measure availability package outcomes`

## Triage and lineage

Both medium verification findings are repairable inside the original availability/package scope:

- `IV-01` traces directly to source `OP-03`; it corrects validation of the already-delivered bulk operation and adds the missing boundary proof.
- `IV-02` traces directly to source `OP-01`; it refreshes and guards declared product artifacts from their canonical sources.
- This is the first repair guide emitted from a fresh verification of this target. The earlier related vocabulary cycle did not emit a new availability/package finding, so the subject-recurrence stop gate is not met.
- `docs/audits/operator-findings-20260807-2103.md#OP-06` is Firebase Comments work. It is legacy integrity evidence only and is explicitly excluded; adding it requires a separate operator scope gate.

### IMPL-01: Reject bulk ranges outside the supported calendar

**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md#IV-01`
**Severity/Priority:** Medium
**Workstream:** A — availability range integrity
**Reasoning tier:** high

#### Context

The bulk form exposes a bounded availability calendar, but its custom runtime validation skips native constraints and silently intersects an out-of-period range with rendered cells. This makes an invalid request look like a smaller valid write.

#### What to do

1. Make the runtime derive one ordered canonical set of supported date IDs from the rendered availability model before it computes the selection; do not rely solely on HTML `min`/`max` attributes or lexicographic clipping.
2. Accept a bulk selection only if both endpoints are members of that set and `from <= to`. Build selected dates from the canonical inclusive slice, then select the named/all room cells from those date IDs.
3. For any malformed, reversed, below-minimum, above-maximum or non-canonical endpoint, show a localized period-boundary error, preview zero affected cells, keep the editor open and leave durable state unchanged.
4. Preserve valid inclusive behavior, numeric `0` versus stop sell, permissions and the existing storage-failure rollback behavior.

#### Scope

- Files: `proto-m.js`, `tools/test-mobile-browser.js`; generated screens only if canonical metadata must be emitted from `tools/build-screens.js`
- Dependencies: none

#### Definition of Done

- [ ] `2026-10-10…2026-10-17` and `2026-10-18…2026-10-25` each preview `0`, show a localized available-period error and cannot mutate any cell or persistent state.
- [ ] The exact supported boundary `2026-10-12…2026-10-23` is valid, inclusive and previews `12` cells for one room type.
- [ ] Existing valid `Double`, 16–17 October, `3` still changes exactly two cells; all rooms across two valid dates still changes exactly ten.
- [ ] All invalid cases remain non-mutating after reload, including an attempted submit with `novalidate` present.
- [ ] Czech and English tests exercise both outside-boundary directions and retain all existing zero/stop-sell, read-only, Channel Manager and storage-failure coverage.

#### Edge cases

- A boundary may be syntactically ISO-valid yet unsupported; treat it as invalid, not as an instruction to truncate.
- Do not introduce a duplicate hand-maintained date list in the runtime.
- A gap in a future availability axis must not turn a discontinuous range into an implicit selection.

#### Test scenarios

- **Browser CZ/EN:** below minimum, above maximum and exact full-boundary ranges; inspect preview, error, open sheet, changed/unchanged cells and persisted state after reload.
- **Regression browser:** retain reverse-range, `256`, `0`, stop-sell, named/all-room and failure rollback cases.

#### Dependencies

- Blocked by: none
- Blocks: nothing

### IMPL-02: Regenerate and prove freshness of product-derived artifacts

**Source:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md#IV-02`
**Severity/Priority:** Medium
**Workstream:** B — generated artifact integrity
**Reasoning tier:** high

#### Context

The live mobile screens and textual hub outputs are marker-free, but tracked DOM dumps, review previews and representative use-case captures still show the previous interface. The Figma export is derived from the same dumps, so freshness must be proved across the complete declared artifact chain rather than assumed from one screen source.

#### What to do

1. Regenerate screens from `tools/build-screens.js`, then regenerate the declared derived chain from canonical inputs: use-case payload/documentation/captures, review previews, all DOM dumps and the Figma export. Use the project-owned commands; never edit `m-*.html`, dump JSON, PNG or `.fig` by hand.
2. Add a deterministic artifact-integrity contract that inventories the manifest's 24 frame dumps, eight hub previews and one representative use-case capture per published use case, and rejects the forbidden vocabulary in every text-derived downstream artifact.
3. Add a reproducibility/freshness proof appropriate to the existing generators so a future source change cannot leave old tracked artifacts passing only by file presence. The proof must cover the inputs that feed dumps, captures and Figma, without relying on timestamps alone.
4. Keep provenance out of rendered product and published artifacts; do not replace markers with claims that fixture data is live, public or verified.

#### Scope

- Files: `tools/build-screens.js` only as canonical generator input, `tools/build-usecases.js`, `tools/capture-previews.js`, `tools/dump-frames.js`, `tools/generate-fig.js`, `tools/test-mobile.js`, `tools/test-product-contract.js` as needed, and their regenerated tracked outputs
- Derived outputs: `m-*.html`, `tools/dumps/*.json`, `preview-m-*.png`, `docs/usecases/*.png`, `usecases.built.json`, `docs/usecases.md`, `spa-cz-partner-mobile.fig` and any declared refresh output
- Dependencies: none

#### Definition of Done

- [ ] All 24 tracked DOM dumps reflect current marker-free text; no dump contains `demo`, `ukázka`, `ukázkov*` or `DEMO-` in product content.
- [ ] The eight hub previews, published representative use-case captures and Figma export are regenerated from the current screens and visibly match the current product vocabulary.
- [ ] The artifact contract rejects missing, extra, stale or forbidden-marker downstream outputs and derives its expected inventory from `prototype.json`/`usecases.json`, not a second hard-coded list.
- [ ] Regenerating the declared chain produces the tracked artifacts without manual edits; generated mobile screens remain byte-consistent with their generator.
- [ ] The existing source/product vocabulary, identity and use-case contracts remain green.

#### Edge cases

- Do not discard a tracked image merely to make an inventory test pass; regenerate it from its declared source.
- Do not use PNG metadata or modification time as the only freshness signal.
- A product marker in a serialized text dump must fail even if the live HTML scan is clean.
- Preserve the established 390 × 844 capture dimensions and 24-frame manifest contract.

#### Test scenarios

- **Static:** source/product scan plus artifact inventory/freshness contract; all 24 dumps and every declared captured output are accounted for.
- **Browser/export:** regenerate and inspect Czech/English availability and offer captures; decode/check the Figma export after regeneration.
- **Regression:** run the complete static/lint/format/browser gate, including the CZ/EN mobile matrix and use-case workshop.

#### Dependencies

- Blocked by: none
- Blocks: nothing

## New patterns this guide introduces

| Pattern | Created by | Location | Used by |
|---|---|---|---|
| Canonical membership validation for bulk date selections | IMPL-01 | `proto-m.js` | all current/future bulk availability actions |
| Derived-artifact freshness contract | IMPL-02 | generators and static quality checks | previews, dumps, use-case captures and Figma export |

## Execution plan

The cards change different product subsystems but share derived outputs and the full browser/export workflow. Run them sequentially in one high-reasoning workstream, then regenerate once from the final canonical sources.

### Round 1 — `high`

- **Agent 1 — availability range integrity:** IMPL-01 — complexity M — files `proto-m.js`, `tools/test-mobile-browser.js`.

### Round 2 — `high`, after Round 1

- **Agent 2 — artifact integrity:** IMPL-02 — complexity L — generators, static contract and all derived outputs.

### Round 3 — integration

- Regenerate all declared artifacts from their canonical sources, check no generated file was edited manually, run `finding_guard.py check`, `npm --prefix tools test`, lint, format and the full CZ/EN browser gate.

| Round | Cards | Dependencies |
|---|---|---|
| 1 | IMPL-01 | none |
| 2 | IMPL-02 | Round 1 |
| 3 | integration | Round 2 |

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md#{IV-01,IV-02}`
- State: `planned`
- Evidence: `2cf40c9a2bb58fe3da75eda3757ac9880013989c`; first outcome measurement at `docs/audits/outcome-review-operator-findings-20260808-0854-spacz-availability-packages-20260808-1215.md`
- Next: `/start-impl docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220.md`
