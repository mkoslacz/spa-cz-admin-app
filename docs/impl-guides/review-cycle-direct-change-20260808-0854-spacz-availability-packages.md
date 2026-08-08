# Cycle plan — direct-change — SPA.CZ availability and packages

**Toolkit version:** 7.2.0
**Generated:** 2026-08-08 08:54:02 CEST
**Commit:** `9306e4f9c81bb7ca2760422d63de146b6bc32a71` — `docs: verify review scaffold release`
**Entry artifact:** `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md`
**Goal loop available:** yes — a handoff is prepared below; no Goal was started by this plan

## Scope

This is the `direct-change` route. It is rooted only in `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#{OP-01,OP-02,OP-03,OP-04,OP-05,OP-06}`:

- remove redundant product-facing prototype markers without claiming fixture data is live;
- introduce numeric and bulk availability controls with a real shared prototype state;
- preserve the source SPA.CZ distinction between room types and packages while making their relationship explicit;
- make package creation and editing visible, package-specific, and behaviorally real.

`docs/audits/operator-findings-20260807-2103.md#OP-06` remains visible as legacy integrity evidence only. It is not in this plan and requires the scope gate before it can become a card.

## Steps

| # | Step | Invocation | Fresh session | Notes |
|---|---|---|---|---|
| 1 | Plan | `/impl-guide docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md medium` | no | Make the emitted guide the current guide and retain all six exact source refs. |
| 2 | Implement | `/start-impl {current guide path}` | no | Resolve the actual agent count and cost before implementation; do not edit generated `m-*.html` by hand. |
| 3 | Verify | `/impl-verify {current guide path}` | yes | Run the full quality block plus browser behavior for both languages, write a new minute-stamped verification report, and print its exact path. |
| 4 | Measure | `/outcome-review docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md {closing report path}` | yes | Measure every stated effect against the runnable prototype, not just source presence. |
| 5 | Re-plan if target work remains | `/impl-guide {newest exact *-verify-report-*.md}` | no | Replace the current guide and continue at step 2. Use the convergent-partial re-measurement branch only when its documented preconditions hold. |

## Runtime checkpoints

| Value | Resolution |
|---|---|
| source report | `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md` |
| baseline commit | `9306e4f9c81bb7ca2760422d63de146b6bc32a71`; `git cat-file -t` returned `commit` |
| current guide | deferred until step 1 emits it; replace after every re-plan |
| newest verification report | deferred until step 3 emits it |
| cost | `5 × (4 + A)` sessions, where `A` is the actual workstream-agent count in the first emitted guide; resolve and print it before step 2 |

## Goal handoff

Paste this condition after `/goal` if the bounded run should continue autonomously:

~~~text
Prowadź ograniczony cykl dla `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#{OP-01,OP-02,OP-03,OP-04,OP-05,OP-06}`. Najpierw uruchom `/impl-guide` na tym raporcie z progiem `medium`; potem każda iteracja to `/start-impl` na bieżącym przewodniku, świeże `/impl-verify`, pomiar efektów z raportu źródłowego i — jeśli coś z zakresu zostaje — nowy `/impl-guide` na najnowszym raporcie weryfikacji. W każdej turze wypisz numer iteracji, dokładne `O(n)`, `left(n)`, `entered(n)`, podzbiór OP-01…OP-06, status kart, ustalenia krytyczne/średnie/niskie, wyniki pełnych testów oraz pass/fail dla sześciu efektów. Po każdej zmianie uruchamiaj pełną bramkę i testy przeglądarkowe CZ/EN; nie edytuj ręcznie `m-*.html`, nie usuwaj ani nie osłabiaj testów. `docs/audits/operator-findings-20260807-2103.md#OP-06` jest poza zakresem i wymaga jawnej bramki zakresu. Zatrzymaj się z raportem, gdy wszystkie OP-01…OP-06 są niezależnie `verified` i ich efekty zielone, albo po 5 iteracjach, albo po 2 kolejnych turach bez `left(n)`, albo gdy karta wymaga decyzji/scope gate/subject recurrence. Przy zatrzymaniu wypisz `BLOCKED` z dokładnymi refami i powodem.
~~~

The filled handoff is below the 4,000-character Goal condition limit.

## Termination

| Element | Value | Where it comes from |
|---|---|---|
| progress measure | exact refs leaving the derived open set between iterations | this plan |
| stall window `K` | `2` consecutive iterations with empty `left(n)` | default |
| round bound | `5`, cycle-wide | default |
| severity floor | `medium`; all six target OP rows are Medium | operator default |
| subject recurrence | zero prior target cycles at emission; apply the `impl-guide` recurrence gate to any entered subject | `impl-guide` Step 1 |
| success | no open target ref at or above Medium and every expected-effect acceptance check passes | this plan |

## Open set at emission

| Ref | State | Severity | Target scope |
|---|---|---|---|
| `docs/audits/operator-findings-20260807-2103.md#OP-06` | verification open | Medium | legacy integrity |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-01` | unplanned | Medium | yes |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-02` | unplanned | Medium | yes |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-03` | unplanned | Medium | yes |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-04` | unplanned | Medium | yes |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-05` | unplanned | Medium | yes |
| `docs/audits/operator-findings-20260808-0854-spacz-availability-packages.md#OP-06` | unplanned | Medium | yes |

`O(0)` is the seven exact rows above. `left(0)` and `entered(0)` are not applicable at emission.

## Operator gates

| Gate | What pauses the loop | What it asks |
|---|---|---|
| proposed rejection | A card proposes to reject any target finding | Confirm or decline that exact finding decision. |
| scope | A later report emits a ref outside `OP-01` through `OP-06`, including the legacy Firebase ref | Include it through a new scoped plan or retain it as integrity evidence only. |
| data boundary | A proposed package field requires live partner data or production upload | Keep deterministic prototype fixtures and use an existing gallery choice, or obtain explicit scope for an external integration. |
| recurrence | An entering subject reaches the `impl-guide` recurrence threshold | Re-scope or stop rather than minting a new ID for the same unresolved subject. |

## Cost

The direct-change upper-bound formula is `5 × (4 + A)` sessions. `A` does not exist until the first guide selects its workstreams, so the first implementation step must print the resolved `A`, the exact session ceiling, and its allocation before work begins.

## Iteration ledger — one row per iteration, printed into the reply as it runs

| Iter | exact `O(n)` | exact `left(n)` | exact `entered(n)` | exact target subset | Current guide | Progress | Gate | Terminator |
|---|---|---|---|---|---|---|---|---|
