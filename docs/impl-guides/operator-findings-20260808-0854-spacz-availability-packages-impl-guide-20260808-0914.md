# Implementation Guide — SPA.CZ availability and package management

**Toolkit version:** 7.2.0
**Generated:** 2026-08-08 09:14:02 CEST
**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
**Severity filter:** `medium`
**Baseline commit:** `e1823f73234c1684cfaa8fbb346b73f3dc994e18` — `docs: add availability package review cycle`

## Triage and lineage

All six source findings clear the `medium` threshold and receive a card. No finding is proposed for rejection.

- `OP-01` has one related prior cycle: `docs/audits/operator-findings-20260807-2103.md#OP-03` removed unsupported public-fact framing but deliberately retained demo framing. This is below the subject-recurrence gate and does not expand the source scope.
- `docs/audits/operator-findings-20260807-2103.md#OP-06` concerns Firebase Comments configuration. It is legacy integrity evidence only and is excluded from every card in this guide. Any attempt to add it requires the explicit scope gate.

### IMPL-01: Remove prototype framing from rendered product copy

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-01`
**Severity/Priority:** Medium
**Workstream:** A — product vocabulary and fixture identities
**Reasoning tier:** high

#### Context

The app uses deterministic fixtures, but product screens, sheets, toasts, route-visible IDs, review controls, and published use cases repeatedly expose `demo`, `ukázka`, and `DEMO-` as product-facing framing. The product boundary requires fixture provenance to remain outside the product UI without turning those fixtures into claims of live or verified partner data.

#### What to do

1. Replace product-facing prototype markers with neutral, truthful partner-product copy across the screen generator, runtime feedback, review control labels, and published use-case source.
2. Migrate route-visible reservation fixture IDs to a neutral stable scheme, preserving exact-record behavior and unknown-record handling rather than removing identity tests.
3. Regenerate derived product/use-case artifacts from their canonical sources. Do not edit `m-*.html` or built use-case artifacts by hand.
4. Keep deterministic-fixture provenance only in permitted research/source documentation; do not replace the removed labels with statements that data is live, public, or verified.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `index.html`, `usecases.json`, `usecases.built.json`, `docs/usecases.md`, `tools/test-product-contract.js`, `tools/test-mobile-browser.js`, generated product/use-case artifacts
- Dependencies: none

#### Definition of Done

- [ ] Rendered mobile screens, sheets, toasts, account/review controls, route-visible IDs, `index.html`, and published use-case content contain no `demo`, `ukázka`, or `DEMO-` marker.
- [ ] Reservation identity routing still renders the selected known record and an explicit unknown-record state using neutral fixture IDs.
- [ ] No product copy claims that fixture data is live, public, or verified.
- [ ] Generated artifacts are rebuilt only from canonical sources.
- [ ] Existing and added copy/identity tests pass in Czech and English.

#### Edge cases

- Do not remove tests merely because their old `DEMO-` fixtures no longer exist; migrate them to neutral fixtures with equivalent identity assertions.
- Provenance in `research/` remains outside the product-facing scan.

#### Test scenarios

- **Static:** assert the forbidden-marker scan is clean in the specified generated product targets while the neutral fixture IDs retain all existing record-route coverage.
- **Browser:** open known and unknown reservation routes in Czech and English and assert the exact identity behavior after the vocabulary migration.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-05, IMPL-06

### IMPL-02: Persist numeric room-day availability and stop-sell state

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-02`
**Severity/Priority:** Medium
**Workstream:** B — availability state and editing
**Reasoning tier:** high

#### Context

The availability matrix currently stores no room/date identity and changes a cell only by toggling visible text. It cannot represent numeric zero separately from stop sell, persist a change, or protect state from read-only and Channel Manager modes.

#### What to do

1. Build the single-cell editor on the shared room-type model from IMPL-04: identify the room type and date, show the current state, validate an availability value in the `0–255` range, and expose stop sell as a distinct action.
2. Introduce one durable prototype-state mechanism so a numeric value, numeric `0`, and stop sell each survive reload and navigation independently of the localized screen.
3. Make the saved result visible in the originating matrix and prevent both control-level and runtime writes for read-only and Channel Manager states.
4. Keep numeric zero visibly distinct from the stop-sell symbol in every state restoration path.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`, product-model contract tests as needed
- Dependencies: IMPL-04

#### Definition of Done

- [ ] Each editable matrix cell has a stable room-type and date identity.
- [ ] A user can change `4 → 3`, set numeric `0`, and set stop sell through a labelled editor with room/date context.
- [ ] `0` renders as `0`; stop sell renders as `×`; neither state is coerced into the other.
- [ ] Reload and route navigation restore the saved state in Czech and English.
- [ ] Read-only and Channel Manager states cannot mutate data through either direct UI or event handling.

#### Edge cases

- Reject values outside `0–255` without replacing the existing saved state.
- A saved state must be keyed by room type and date, not by rendered row order or translated label.

#### Test scenarios

- **Browser:** exercise `4 → 3`, reload, numeric `0`, stop sell, and state restoration in both languages.
- **Browser:** repeat attempted writes in read-only and Channel Manager modes and assert no state changes after reload.

#### Dependencies

- Blocked by: IMPL-04
- Blocks: IMPL-03

### IMPL-03: Apply scoped bulk availability changes

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-03`
**Severity/Priority:** Medium
**Workstream:** B — availability state and editing
**Reasoning tier:** high

#### Context

The only existing bulk sheet collects a date range and room selector, then closes without changing the matrix. The operation needs to share the exact same availability semantics as the single-cell editor rather than introducing a second representation of closures.

#### What to do

1. Replace the close-only flow with one labelled bulk editor that selects `Set available units` or `Stop sell`, an inclusive date range, and all room types or one named room type.
2. Require and validate a quantity only for the numeric action; reuse the same `0–255` and separate-stop-sell domain state as IMPL-02.
3. Calculate and show the exact affected-cell count before submit, then apply the change only to the selected room/date keys and persist it through reload.
4. Respect the same read-only and Channel Manager write restrictions as single-cell editing.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`
- Dependencies: IMPL-02

#### Definition of Done

- [ ] The bulk editor has an explicit action selector, inclusive start/end dates, all-or-one room selection, and a numeric field only when appropriate.
- [ ] The preview count matches the selected date/room set before submission.
- [ ] `Double`, 16–17 October, `3` changes exactly those two cells; all-room stop sell across two dates changes exactly the selected matrix cells.
- [ ] Saved bulk results survive reload and retain the `0` versus stop-sell distinction.
- [ ] Restricted modes cannot apply the operation.

#### Edge cases

- Invalid or reversed date ranges cannot mutate state.
- A numeric zero bulk update remains an available-units value, never a closure.

#### Test scenarios

- **Browser:** assert changed and unchanged cells after numeric and stop-sell operations, before and after reload, in Czech and English.
- **Browser:** assert action-dependent validation, scope count, and write restrictions.

#### Dependencies

- Blocked by: IMPL-02
- Blocks: nothing

### IMPL-04: Establish one room-type model for inventory and package prices

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-04`
**Severity/Priority:** Medium
**Workstream:** A — product vocabulary and fixture identities
**Reasoning tier:** high

#### Context

Room types are the shared inventory dimension; packages are separate sellable products with prices and eligibility by room type. The prototype currently duplicates room names in unrelated availability and rate arrays and lets the rate page make room types appear to be package inventory.

#### What to do

1. Define the fixture room types once with stable IDs, localized labels, capacity metadata, and availability defaults; make rendered availability rows and runtime state reference those IDs.
2. Extend each package fixture with explicit covered room types and package-price references instead of independent literal rate rows.
3. Render the package rate surface as `Package prices by room type` and explain that package content does not mutate inventory while inventory constrains sales of linked packages.
4. Add a source-level product-model contract that detects duplicate room definitions, unknown price references, and incomplete room-type coverage.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `tools/test-product-contract.js`, `tools/test-mobile-browser.js`
- Dependencies: none

#### Definition of Done

- [ ] Every room type has one stable fixture ID and is rendered from that source in availability and package-price contexts.
- [ ] Every package price/eligibility reference resolves to a known room type.
- [ ] The selected package's rate screen clearly labels `Package prices by room type` and explains the inventory-sale relationship.
- [ ] No independent hard-coded rate/availability row definitions remain.
- [ ] Static model assertions and labelled browser behavior pass in Czech and English.

#### Edge cases

- A package may cover a subset of available room types; that is valid only when references are explicit.
- Do not let package editing change inventory values.

#### Test scenarios

- **Contract:** validate unique room-type IDs, package price references, room-type coverage, and no duplicate literal row source.
- **Browser:** open a selected package rate screen and assert its label, referenced room types, and inventory constraint explanation in both languages.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-02, IMPL-05, IMPL-06

### IMPL-05: Create a visible package draft with stable identity

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-05`
**Severity/Priority:** Medium
**Workstream:** C — package lifecycle and editor
**Reasoning tier:** high

#### Context

Package creation is hidden behind an icon-only control and its form has no meaningful outcome beyond a toast. A created package must become a real, selected prototype record rather than a transient form result.

#### What to do

1. Replace the icon-only entry with a visible localized `Add package` action while preserving the mobile interaction contract.
2. Create a draft package in the shared persisted fixture state with a stable unique identity, a list card, and a route to that package's own editor.
3. Ensure returning to the list, navigating, and reloading preserve the created record and selected identity in both languages.
4. Use the shared package/room-type model and maintain the boundary that these are deterministic prototype fixtures rather than live partner records.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`, `tools/test-product-contract.js` as needed
- Dependencies: IMPL-01, IMPL-04

#### Definition of Done

- [ ] A visible, labelled add action opens the creation flow in Czech and English.
- [ ] Creating a named draft adds it to the package list and opens that draft's own editor.
- [ ] The route and rendered detail resolve the created draft rather than falling back to the first fixture.
- [ ] Reload and navigation preserve the draft and selected identity.
- [ ] Existing offer filtering and unknown-offer behavior remain intact.

#### Edge cases

- Generate a collision-free local identity for multiple drafts without treating list order as identity.
- An empty or invalid required name cannot create a partial record.

#### Test scenarios

- **Browser:** create a named package, assert its card and route identity, reload, navigate back, and assert the same selected draft in both languages.

#### Dependencies

- Blocked by: IMPL-01, IMPL-04
- Blocks: IMPL-06

### IMPL-06: Save package-specific content and settings

**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-06`
**Severity/Priority:** Medium
**Workstream:** C — package lifecycle and editor
**Reasoning tier:** high

#### Context

Existing package cards expose only `Rates`; the sheets edit disconnected fields and hydrate pricing from the first fixture. The source product has package-specific content, gallery, pricing, procedures, publication, and settings, which the mobile prototype needs to represent as distinct editable package state.

#### What to do

1. Add a named `Edit package` destination distinct from `Rates` to every package card and route it to the selected package's editor.
2. Provide editable package-specific fields for title, description, existing-gallery selection, inclusions, nights, meal, covered room types and prices, publication, procedures, and applicable settings.
3. Persist all edits in the shared fixture state and update the selected card/detail/editor only for the record that was edited.
4. Reuse existing gallery fixtures only; do not imply upload, external media integration, production data, or a package-to-inventory mutation.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`, `tools/test-product-contract.js` as needed
- Dependencies: IMPL-04, IMPL-05

#### Definition of Done

- [ ] Every package card exposes a visible `Edit package` action distinct from its rate action.
- [ ] The editor exposes all required package-specific categories and validates required numeric and selection inputs.
- [ ] Editing a non-first package changes its own title, description, gallery selection, inclusion, publication state, and room price without mutating the first package.
- [ ] The list, editor, and rate surface render the selected package's saved values after return and reload.
- [ ] Existing gallery selection is used instead of a simulated upload.

#### Edge cases

- A package whose covered-room selection changes must preserve valid price references only.
- Editing a package cannot alter availability state or other package records.

#### Test scenarios

- **Browser:** edit a non-first package's title, description, gallery selection, inclusion, status, and room price; return, reload, and assert the same record in Czech and English.
- **Contract:** assert selected-package hydration never falls back to first-fixture pricing.

#### Dependencies

- Blocked by: IMPL-04, IMPL-05
- Blocks: nothing

## New Patterns This Guide Introduces

| Pattern | Created by | Location | Used by |
|---------|------------|----------|---------|
| Stable room-type source with package-price references | IMPL-04 | `tools/build-screens.js`, `proto-m.js` | IMPL-02, IMPL-03, IMPL-05, IMPL-06 |
| Persisted prototype domain state keyed by stable identities | IMPL-02 | `proto-m.js` | IMPL-03, IMPL-05, IMPL-06 |
| Selected-package editor distinct from package rates | IMPL-05 | `tools/build-screens.js`, `proto-m.js` | IMPL-06 |

## Execution plan

Runtime and workspace mode: resolved at execution time per `references/runtime-execution.md`. The cards intentionally run in one high-reasoning workstream per round because their shared generator, runtime, and browser-test files cannot be safely owned in parallel in a shared working directory.

### Round 1 — `high` (sequential)

- **Agent 1 — Workstream A: product vocabulary and fixture identities** — IMPL-01, IMPL-04 — files: `tools/build-screens.js`, `proto-m.js`, `index.html`, `usecases.json`, `usecases.built.json`, `docs/usecases.md`, `tools/test-product-contract.js`, `tools/test-mobile-browser.js`, generated artifacts — complexity: L — reasoning: high

### Round 2 — `high` (sequential; after Round 1)

- **Agent 2 — Workstream B: availability state and editing** — IMPL-02, IMPL-03 — files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`, product-model contract tests if required — complexity: L — reasoning: high

### Round 3 — `high` (sequential; after Round 2)

- **Agent 3 — Workstream C: package lifecycle and editor** — IMPL-05, IMPL-06 — files: `tools/build-screens.js`, `proto-m.js`, `tools/test-mobile-browser.js`, `tools/test-product-contract.js` if required — complexity: L — reasoning: high

### Round 4 — Integration

- Regenerate all derived artifacts from their canonical source, run the complete static/lint/format/browser gate, and verify Czech and English persistence/restriction flows without manually editing generated files.

| Round | Agents | Cards | Complexity | Reasoning | Dependencies |
|-------|--------|-------|------------|-----------|--------------|
| 1 | 1 sequential | IMPL-01, IMPL-04 | L | high | none |
| 2 | 1 sequential | IMPL-02, IMPL-03 | L | high | Round 1 |
| 3 | 1 sequential | IMPL-05, IMPL-06 | L | high | Round 2 |
| 4 | 1 sequential | integration | L | high | Round 3 |

## Handoff

- Source: `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
- Scope: `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#{OP-01,OP-02,OP-03,OP-04,OP-05,OP-06}`
- State: `planned`
- Evidence: `e1823f73234c1684cfaa8fbb346b73f3dc994e18`; `finding_guard.py check --root . --base HEAD` passed with 17 findings, 17 cards, and 7 open refs
- Next: `/start-impl docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
