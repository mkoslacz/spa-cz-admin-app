# Outcome Review — operator findings availability and packages

## Review moment

- **Date:** 2026-08-08 12:15:53 CEST
- **Branch:** `main`
- **Commit:** `182f9fe7e5d31d1334d7efa59a408323ae640a4f` — `docs: verify availability package implementation`
- **Source report:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
- **Closing report:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- **Guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
- **Findings:** 6 in source — 4 measured, 2 excluded because they remain open
- **Reviewer:** Codex (outcome-review skill), fresh independent session
- **Toolkit version:** 7.2.0

## Measurements

| Finding | Class | Observable | Value at emission | Value now | Read how |
|---|---|---|---|---|---|
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-02` | achieved | A room/date cell saves a number, numeric `0` or separate stop sell, persists it, and rejects restricted writes. | A click only changed `4 → ×`; no numeric editor or persistence. | Browser CZ/EN covers `4 → 3`, reload, `0`, stop sell, read-only, Channel Manager and failed-storage rollback; all pass. | Fresh `npm --prefix tools run test:static` and `npm --prefix tools run test:browser`; inspect the current availability browser scenarios. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-04` | achieved | Package prices reference one room-type model and the selected rate surface explains the inventory-sale relationship. | Separate literal availability/rate arrays; packages had no room-type relation. | Static model contract and CZ/EN rate flow pass; current surface uses shared room types and states that inventory constrains linked package sales. | Fresh `npm --prefix tools run test:static` and current rate-screen browser coverage. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-05` | achieved | A visible add action creates a draft, renders it and opens its own editor with durable identity. | Icon-only form closed with a toast; the list stayed at four static cards. | Browser CZ/EN creates a named `local-package-N`, verifies its card and exact route, then reloads/navigates/language-switches without identity loss. | Fresh `npm --prefix tools run test:browser`; inspect create-draft scenario. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-06` | achieved | Each package has a separate editor which persists content, gallery, details, prices, publication, procedures and settings for the selected record. | The fixed forms could not update the selected package and derived rates from the first fixture. | Browser edits non-first `spa-week`, preserves independent changes through list/rates/reload/CZ↔EN and keeps the first package and availability unchanged. | Fresh `npm --prefix tools run test:browser`; inspect non-first-package scenario. |

## Excluded from measurement

| Finding | Reason | Evidence |
|---|---|---|
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-01` | still open; a conformance closure was not claimed | `finding_guard.py open --root . --base HEAD` lists the source ref as verification open and the linked `IV-02`. Current product text is clean, but 24/24 tracked dumps and affected visual artifacts remain pre-change. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-03` | still open; a conformance closure was not claimed | `finding_guard.py open --root . --base HEAD` lists the source ref as verification open and the linked `IV-01`. A range crossing the calendar boundary is still accepted and clipped to visible cells. |

## Findings

No `EFF-*` finding is emitted. The two not-yet-achieved effects are already carried by `IV-01` and `IV-02`; emitting a second identity for work that is still lifecycle-open would duplicate the repair path.

## Next step

`/impl-guide docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md medium`

## Handoff

- Source: `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md`
- Scope: none
- State: `reviewed`
- Evidence: fresh static/browser readings and `finding_guard.py open --root . --base HEAD` at `182f9fe7e5d31d1334d7efa59a408323ae640a4f`
- Next: `/impl-guide docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1204.md medium`
