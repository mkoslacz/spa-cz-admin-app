# Implementation report — availability and package management

**Guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`  
**Source:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`  
**Implemented:** 2026-08-08 11:45 CEST  
**Implementation commits:** `af88a29`, `f76518b`, `007d17b`, `a62b633`, `9989d41`, `7bdbd45`  
**Toolkit version:** 7.2.0

## Outcome

All six implementation cards are implemented and committed. The mobile prototype now uses neutral product vocabulary, one room-type model, durable normalized overlays for availability and packages, and a package editor selected by stable package ID. Generated screens were rebuilt only through `tools/build-screens.js`; no generated `m-*.html` file was manually edited.

This is implementation evidence, not a verification verdict. Independent `/impl-verify` and effect measurement remain required.

## Card results

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-01` | implemented | Product-facing screens, routes, generated use cases and runtime no longer expose `demo`, `ukázka` or `DEMO-`; reservation fixtures use stable neutral `RSV-*` identities with known/unknown route coverage in CZ and EN. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-02` | implemented | Each room/date cell has a contextual numeric `0–255` or distinct stop-sell editor. Normalized `roomTypeId:dateId` mutations survive navigation/reload, reject forced read-only/CHM writes, and roll back rather than claim success when durable storage fails. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-03` | implemented | The localized bulk flow supports Units or Stop sell, inclusive dates, All or named room type, exact affected-cell count, validation, persistence and precise selected-only mutation. CZ/EN browser coverage includes `Double × 16–17 → 3`, All rooms/two dates stop sell, numeric zero and storage-failure rollback. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-04` | implemented | `ROOM_TYPES` and canonical dates drive availability and package prices. Every price relation resolves to a room type; the selected rate view is labelled `Package prices by room type` and explains that inventory limits sales without being changed by package content. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-05` | implemented | Visible localized Add package creates collision-free `local-package-N` drafts in normalized persistent state, adds their cards and opens their distinct selected-package editor. Identity survives reload, list return, CZ↔EN and a non-package screen; legacy `{title,nights}` drafts migrate to complete safe defaults. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-06` | implemented | Every package exposes distinct Edit package and Rates actions. The selected-ID editor atomically persists title, description, existing-gallery IDs, inclusions, nights, meal, room coverage/prices, publication, procedures and settings. It prevents first-fixture fallback, orphan prices, unsupported references, availability mutations and false success on storage failure; Rates is explicitly read-only and links back to the same selected editor. |

## Delivered changes

- `tools/build-screens.js` now owns the shared room/package fixtures, canonical gallery/settings references, package editor and generated read-only rate surface.
- `proto-m.js` resolves fixtures, package overrides and drafts by stable IDs; it validates and persists only normalized overlays, including transactional rollback when local storage rejects a write.
- `tools/test-product-contract.js` protects neutral vocabulary, generated-model references, distinct Edit/Rates routes, no first-fixture fallback, no simulated upload and no pretend price save.
- `tools/test-mobile-browser.js` exercises all required CZ/EN flows, including real visible pointer saves, non-first-package edits, draft migration, persistence through unrelated screens, write restrictions and forced storage failures.
- All 16 generated `m-*.html` screens were regenerated from canonical source.
- `CLAUDE.md` records the shared room/package model, stable-ID overlay rule, read-only rate boundary and no-success-without-durable-state rule.

## Verification performed

| Command/check | Result |
|---|---|
| `npm --prefix tools test` | partial environment result — static use-case/product/mobile/Firebase-config and comments-config stages pass; Firestore rules emulator cannot start because Java Runtime is absent from the workstation PATH. No test was skipped, changed or weakened. |
| `npm --prefix tools run lint` | pass — zero warnings |
| `npm --prefix tools run format:check` | pass |
| `npm --prefix tools run test:browser` | pass — HTTP, 16 generated screens, CZ/EN click matrix, identities, filters, focus/roles and workshop CRUD/100-case/conflict/safe fallback |
| `git diff --check` | pass before each implementation commit |
| generated product marker/model contracts | pass — no product-facing demo markers, no `OFFERS[0]` selected-package fallback, no `data-save-rates` pretend persistence and no file-upload control |
| `finding_guard.py check --root . --base HEAD` | pass — 17 findings, 17 cards, 7 open lifecycle refs before independent verification |

## External environment limitation

`npm --prefix tools test` still exits at `test:comments-rules` because `java -version` fails on the workstation. The static suite and comments configuration test complete before that point. This pre-existing Firebase-emulator environment limitation is neither suppressed nor attributed to the availability/package implementation.

## Suggested project-memory updates

Applied in `CLAUDE.md`:

- canonical room types, availability and package prices share one fixture model;
- persisted overlays use stable identifiers, never list position or a first fixture;
- the rate view is read-only and all package writes are atomic, durable or explicitly reported as unsaved.

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#{IMPL-01,IMPL-02,IMPL-03,IMPL-04,IMPL-05,IMPL-06}`
- State: `implemented`
- Evidence: `9989d416478fa19c87b6526e1bcb2ebbc3778b6e`; final full browser gate passed; `7bdbd45b1dce97cc0671f11d937ee716cce2a60d` records the project conventions
- Next: `/impl-verify docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
