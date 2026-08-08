# Implementation Verification Report

## Verification moment

- **Date:** 2026-08-08 12:04:04 CEST
- **Branch:** `main`
- **Commit:** `fb88086a8297cbbf7e78967a0955f3340001c889` — `docs: record availability package implementation`
- **Verified implementation commit:** `9989d416478fa19c87b6526e1bcb2ebbc3778b6e` — `feat: persist package-specific editor state`
- **Impl guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
- **Implementation report:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-impl-report-20260808-1145.md`
- **Source report:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
- **Reviewer:** Codex (impl-verify skill), fresh independent session
- **Toolkit version:** 7.2.0
- **Reasoning tier applied:** high
- **Lifecycle durability:** this report is staged, checked, fully gated, and committed with its verification evidence.

## Dashboard

| Metric | Value |
|---|---:|
| Total cards | 6 |
| ✅ Verified | 4 (66.7%) |
| ⚠️ Partial | 2 (33.3%) |
| ❌ Not implemented | 0 |
| ⛔ Blocked | 0 |
| Total DoD points | 30 |
| DoD points met | 28 (93.3%) |
| New findings | 2 × Medium |

## Completion score: 83.3%

Calculated as `(4 × 1.0 + 2 × 0.5) / 6 × 100`.

## Card verification

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-01` | partial | Current screens, hub and published text are clean and 16/16 screens match the generator, but all 24 tracked DOM dumps plus the affected preview/use-case images still depict the pre-change prototype framing (`IV-02`). |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-02` | verified | Browser CZ/EN exercises `4 → 3`, numeric `0`, stop sell, navigation/reload, read-only, Channel Manager and storage-failure rollback. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-03` | partial | Units/stop-sell, inclusive valid ranges, exact counts, persistence and restrictions work; a range crossing the supported boundary is silently intersected and mutates cells (`IV-01`). |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-04` | verified | One `ROOM_TYPES` model drives availability and package prices; static and CZ/EN rate-screen checks confirm references and relationship copy. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-05` | verified | A visible localized add action creates a collision-safe draft, routes by exact ID and persists it across reload/navigation/CZ↔EN. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-06` | verified | The selected package editor persists all required fields by stable package ID; non-first-package, permission, invalid-state and storage-failure cases pass. |

## Per-card verification

### IMPL-01 — Remove prototype framing from rendered product copy ⚠️

- [x] Current generated mobile screens, hub, use-case source/payload/documentation, generator and runtime contain no product-facing `demo`, `ukázka` or `DEMO-` marker.
- [x] Neutral `RSV-*` identity routing preserves both known and explicit unknown states in Czech and English.
- [x] 16/16 `m-*.html` files are byte-consistent with `renderPage(page, lang)`; none was hand-edited.
- [ ] Tracked downstream dumps, previews and published use-case captures were not regenerated after the vocabulary migration (`IV-02`).
- [ ] The completeness contract does not currently fail when those downstream artifacts are stale (`IV-02`).

### IMPL-02 — Persist numeric room-day availability and stop-sell state ✅

- [x] Cells are keyed by stable room-type/date IDs.
- [x] Numeric values, numeric zero and stop sell are distinct and survive reload/navigation/CZ↔EN.
- [x] Read-only and Channel Manager paths reject direct UI and runtime write attempts.
- [x] A storage failure rolls the state back, keeps the editor open and does not announce success.
- [x] Boundary values and selected-record identity are covered in the browser suite.

### IMPL-03 — Apply scoped bulk availability changes ⚠️

- [x] The bulk editor has explicit units/stop-sell actions, inclusive dates, all-or-one room selection and action-dependent numeric input.
- [x] Valid `Double`, 16–17 October, `3` changes exactly two cells; two dates for all five room types changes exactly ten.
- [x] Valid results persist and retain zero versus stop-sell semantics; restricted modes and failed persistence do not mutate state.
- [ ] A syntactically valid range with an endpoint outside the supported calendar is incorrectly clipped to visible cells and applied (`IV-01`).
- [ ] Browser coverage misses below-minimum and above-maximum endpoints (`IV-01`).

### IMPL-04 — Establish one room-type model for inventory and package prices ✅

- [x] `ROOM_TYPES` is the single stable room-type source.
- [x] Every package price/eligibility reference resolves to that source.
- [x] The rate surface is labelled “Package prices by room type” and explains that inventory constrains sales without being changed by package content.
- [x] Static model checks and Czech/English browser behavior pass.
- [x] Package editing does not mutate availability.

### IMPL-05 — Create a visible package draft with stable identity ✅

- [x] The localized add action is visible in both languages.
- [x] A named draft is created under collision-safe `local-package-N`, shown on the list and opened by exact route identity.
- [x] Reload, return navigation, a non-package screen and Czech/English switches retain that identity.
- [x] Invalid title and failed storage persistence cannot create a partial record.
- [x] Existing filters and unknown-offer behavior remain explicit.

### IMPL-06 — Save package-specific content and settings ✅

- [x] Every card separates Edit package from read-only Rates.
- [x] The selected editor stores title, description, existing gallery selection, inclusions, nights, meal, room coverage/prices, publication, procedures and settings atomically.
- [x] A non-first package (`spa-week`) changes independently; the first fixture and availability remain unchanged.
- [x] List, editor and rate surface preserve the selected record after reload/navigation/CZ↔EN.
- [x] Unknown/corrupt state, read-only/Channel Manager bypasses and persistence failures are rejected without a false success claim.

## Holistic audit

- **Shared state:** availability uses room/date keys and package changes use stable package IDs; no first-fixture fallback or list-order identity was found.
- **Generated artifacts:** all 16 mobile HTML screens reproduce from the generator. The outstanding derived-artifact issue is limited to dumps/previews/captures described by `IV-02`.
- **Regression gates:** static, lint, format and browser CZ/EN gates passed. The umbrella `npm --prefix tools test` reaches the existing Firebase rules-emulator Java Runtime absence after all static/config stages pass; it is unrelated to this source scope and does not mask an implementation result.
- **Legacy scope:** `docs/audits/operator-findings-20260807-2103.md#OP-06` concerns Firebase Comments and remains excluded. It was neither inspected as a card nor added to this guide.
- **No other holistic finding** was found.

## Findings

| ID | Type | Severity | Source | Location | Problem | Recommendation |
|---|---|---|---|---|---|---|
| IV-01 | Validation and missing test | Medium | `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-03` | `tools/build-screens.js:948-956`; `proto-m.js:952-991`; `tools/test-mobile-browser.js:927-953` | The bulk form has `novalidate`; runtime accepts endpoints outside its min/max then intersects them with rendered cells. `2026-10-10…2026-10-17` previews six cells and changes Double on 12–17 October instead of rejecting the operation. | Validate both endpoints against the canonical supported date IDs before selecting cells; return zero cells and a localized boundary error for either outside endpoint. Add below-minimum, above-maximum and valid-full-boundary CZ/EN browser cases that prove no mutation after reload. |
| IV-02 | Stale derived artifacts and missing completeness test | Medium | `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#IMPL-01` | `tools/dumps/dump-m-availability.json`; `tools/dumps/dump-m-offer.json`; `tools/dumps/dump-m-reservations.json`; `preview-m-availability.png`; `preview-m-offer.png`; `docs/usecases/UC-06-m-availability.png`; `docs/usecases/UC-07-m-offer.png` | 24/24 tracked DOM dumps retain pre-change markers and published visual artifacts were captured before the change. Existing marker tests scan a narrower textual set and therefore pass. | Refresh dumps, hub previews, use-case captures and the declared Figma artifact from canonical sources; add a contract that rejects forbidden markers in text-derived artifacts and detects stale generated output. |

## Expected effects

| Finding | Observable | Read how | Value at emission |
|---|---|---|---|
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md#IV-01` | An out-of-period bulk range shows a localized error, previews zero cells and cannot mutate any visible cell; an exact full-period range remains valid and inclusive. | Run CZ/EN browser cases for below-minimum, above-maximum and exact-boundary ranges; inspect persisted mutations after reload. | Below-minimum `2026-10-10…2026-10-17` previews `6` and changes six visible Double cells. |
| `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md#IV-02` | Every tracked dump, preview, representative use-case capture and declared Figma export reflects the current marker-free product. | Regenerate each declared artifact, check reproducibility and scan text-derived dumps for the forbidden marker set. | 24/24 tracked dumps match the old marker set; affected images visibly show pre-change framing. |

## Recommendation

**Requires one scoped repair iteration.** Generate a fresh implementation guide from this verification report for `IV-01` and `IV-02`, implement only those cards, then re-verify the original guide and remeasure the six source effects.

## Handoff

- Source: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-impl-report-20260808-1145.md`, `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
- Scope: `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md#{IMPL-01,IMPL-02,IMPL-03,IMPL-04,IMPL-05,IMPL-06}`, `IV-01`, `IV-02`
- State: `partial`
- Evidence: `fb88086a8297cbbf7e78967a0955f3340001c889`; independent static/browser checks listed above
- Next: `/impl-guide docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md medium`
