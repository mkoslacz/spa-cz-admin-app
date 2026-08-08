# Implementation Report — Review scaffolding and hub truthfulness

## Summary

- **Source guide:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md`
- **Source report:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md`
- **Result commit:** `f80932282231158220416e4cd3988a7518dbfbeb`
- **Toolkit version:** 7.2.0
- **Runtime and workspace mode:** two Codex collaboration agents worked in the shared repository with disjoint file ownership; the orchestrator reviewed and integrated their changes.
- **Reasoning tier applied:** standard for both cards, as required by the guide.
- **Agent base:** both agents confirmed `7a941c608abdaca67dbfcc3e61808fef945e0cc6`, the committed guide base.
- **Total cards:** 2 | ✅ 2 | ❌ 0 | ⏸️ 0
- **Cards merged:** none.

## Card results

| Card | Outcome | Evidence |
|---|---|---|
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md#IMPL-01` | implemented | Shared `.pt-pages` styling now renders Changelog, Use cases and Comments as three full-width rows with 44 px minimum height and an explicit keyboard focus treatment. The browser gate measures 1280 × 844 and 390 × 844, including strict vertical order, dimensions, focus, panel/document overflow and the unchanged horizontal ordinary switch. |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md#IMPL-02` | implemented | Hub copy describes configured and unconfigured modes without claiming the current deployment state. The Pages workflow checks exact source/package `comments.config.json` parity after assembly and before upload in both directions without printing contents. Static QA locks copy, include-list, command ordering, both parity branches and the sole permitted secret-to-file write. |

Fix level: shared mechanism. The correction applies once in the shared review panel and once in the common Pages packaging path rather than patching generated screens or one deployment.

## Validation

- `npm --prefix tools run test:static` — passed: use-case contract, product contract, mobile static QA and Firebase deployment preflight.
- `npm --prefix tools run lint` — passed.
- `npm --prefix tools run format:check` — passed.
- `git diff --check` — passed.
- `npm --prefix tools test` — all non-emulator suites passed; local Firestore emulator startup was blocked by sandbox `listen EPERM` after Java 21 was supplied.
- `npm --prefix tools run test:browser` — test code is present, but local startup was blocked by the same loopback policy. Both executable suites remain required in GitHub Actions before publication.

## Architectural changes

- Review destinations have a dedicated layout contract independent of generic segmented switches.
- Published comment configuration now has an explicit two-way source/package invariant at the final artifact boundary.
- Static QA rejects the stale deployment-specific copy and any removal or reordering of the parity guard.

## Warnings

- Local loopback restrictions prevented execution of the new live geometry assertions and the existing Firestore emulator in this sandbox. This is an environment limitation, not a passing test claim; the implementation must not be accepted until the Pages workflow executes both suites successfully.
- A live owner/reviewer/unapproved identity smoke remains the previously documented manual boundary and is not broadened by these two cards.

## Deviations from plan

- The guide requested integration exercise of both package-presence states. The configured state is exercised by the real Pages deployment; both directions are additionally locked by static command-order assertions. A separate temporary four-variant harness was rejected by the environment usage limit and was not retried through a workaround.

## Failed or skipped cards

None. Both cards are implemented; only environment-dependent execution evidence is deferred to CI.

## Follow-up

Run `/impl-verify` against the source guide after the pushed workflow is green, then confirm the published wide review panel and neutral hub copy.

## Handoff

- Source: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md`
- Scope: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md#{IMPL-01,IMPL-02}`
- State: `implemented`
- Evidence: `f80932282231158220416e4cd3988a7518dbfbeb`; static, lint, format and diff gates passed; browser/emulator evidence pending CI
- Next: `/impl-verify docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md`
