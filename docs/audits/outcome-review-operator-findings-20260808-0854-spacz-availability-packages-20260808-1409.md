# Outcome Review — SPA.CZ availability and package management

## Review moment

- **Date:** 2026-08-08 14:09:33 CEST
- **Branch:** `main`
- **Commit:** `bbae428e11b0606b144ee996350f1ccffb143193` — `fix: isolate artifact receipt test index`
- **Source report:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
- **Closing report:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1332.md`
- **Current repair verification:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342-verify-report-20260808-1403.md`
- **Guide:** `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914.md`
- **Findings:** 6 in source — 6 measured, 0 excluded
- **Reviewer:** Codex (outcome-review skill), fresh independent session
- **Toolkit version:** 7.2.0

## Measurements

| Finding | Class | Observable | Value at emission | Value now | Read how |
|---|---|---|---|---|---|
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-01` | achieved | Rendered product copy has no `demo`, `ukázka`, or `DEMO-` marker while provenance stays outside product UI. | `491` broad generated/runtime markers; at least nine visible Offer markers and several Availability markers. | `0` matches in all `m-*.html`, `index.html`, and `usecases.built.json`; product contract covers 16 screens and the fresh CZ/EN browser sweep passes with no product-facing marker. | `npm --prefix tools run test:static`; `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`; `rg -o -i '\\b(demo|ukázk|DEMO-)\\b' m-*.html index.html usecases.built.json | wc -l`. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-02` | achieved | A chosen room/date cell saves a number, numeric `0`, or separate stop sell; exact state persists and restricted writes remain rejected. | A click changed `4 → ×`; no numeric editor or persistence. | In both CZ and EN, the browser flow proves `4 → 3`, reload, numeric `0`, separate `×` stop sell, reload/navigation/language persistence, and no mutation after read-only or Channel Manager forced writes. | Fresh `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-03` | achieved | Bulk units and stop sell mutate exactly the selected inclusive room/date set, report its count, and retain state. | One close-range form, `2` date inputs, `0` numeric inputs, no matrix mutation. | In both CZ and EN, `Double` on 16–17 October with `3` previews and writes exactly `2` keys; all five rooms on 17–18 October previews and writes exactly `10` stop-sell keys; unselected cells remain unchanged and both results survive reload. Invalid outside-boundary and reversed ranges remain non-mutating. | Fresh `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-04` | achieved | Package prices name known room types, availability has one room-type source, and the selected rate screen explains the inventory-sale relationship. | Separate literal availability/rate arrays; `OFFERS` had no room-type relation. | Static model contract passes unique `ROOM_TYPES`, references, coverage, and duplicate-row rejection. The CZ/EN selected-package rate surface shows `Package prices by room type` / `Ceny balíčku podle typu pokoje`, the five known room IDs, and the inventory-constrains-sale explanation. | `npm --prefix tools run test:static`; fresh `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-05` | achieved | A visible Add-package action creates a draft, shows it in the list, opens its own editor, and preserves identity. | Icon-only two-field form ended in a toast; list remained four static cards. | Both language flows expose `Add package` / `Přidat balíček`, create a collision-safe `local-package-N`, resolve its own editor and card, then retain that exact ID after reload, return navigation, unrelated screens, and language switch. | Fresh `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`. |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-06` | achieved | Every package has a clear edit action and a package-specific editor that persists content, gallery selection, details, room prices, publication, procedures, and settings. | Only disconnected name/stay/publication forms; price hydration fell back to the first fixture. | Both language flows distinguish `Edit package` / `Upravit balíček` from rates, edit non-first `spa-week` title, description, gallery, inclusions, publication, procedures, settings, covered rooms and prices, and preserve the selected record through list/rates/reload while the first fixture and availability remain unchanged. | Fresh `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/test-mobile-browser.js`. |

## Excluded from measurement

None. The source report's six findings are all independently `verified` in the named closing report and none appears in the current open set.

## Scope boundary

`docs/audits/operator-findings-20260807-2103.md#OP-06` is the sole open finding reported by `finding_guard.py`, but it concerns Firebase Comments rather than this source report. It was neither measured nor changed here and still requires an explicit scope gate.

## Findings

No `EFF-*` finding is emitted: every admissible expected effect is achieved on the current artifact.

## Next step

None — the measured source scope is complete.

## Handoff

- Source: `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-0914-verify-report-20260808-1332.md`, `docs/impl-guides/operator-findings-20260808-0854-spacz-availability-packages-impl-guide-20260808-1220-verify-report-20260808-1340-impl-guide-20260808-1342-verify-report-20260808-1403.md`
- Scope: none
- State: `reviewed`
- Evidence: `bbae428e11b0606b144ee996350f1ccffb143193`; fresh `npm --prefix tools run test:static`, artifact receipt check, CZ/EN mobile-browser run, marker scan, and `finding_guard.py open --root .`
- Next: none
