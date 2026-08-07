# Implementation Guide — Review Scaffolding and Hub Truthfulness

- **Source:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md`
- **Generated:** 2026-08-07 23:16 CEST
- **Severity filter:** `low` (default; all actionable findings included)
- **Toolkit version:** 7.2.0
- **Expected base commit:** `290832985507f48de67677a0a4b36e123750a7b3`

## Triage and prior-cycle accounting

| Finding | Severity | Area | Decision | Prior cycles on the exact subject |
|---|---|---|---|---|
| `IV-01` | ⚠️ med. | Responsive review controls | Card `IMPL-01` | 0 — earlier rounds did not plan or verify the floating panel's wide/narrow Review pages geometry; the source verification first emitted this subject. |
| `IV-02` | ℹ️ low | Hub activation copy | Card `IMPL-02` | 0 — Firebase activation changed the deployed state, but no earlier finding or card planned the hub copy/package agreement; the source verification first emitted this subject. |

No finding is rejected or excluded. Neither subject reaches the non-convergence gate.

## Implementation cards

### IMPL-01: Make Review pages a vertical, overflow-safe control

**Source:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md#IV-01`
**Severity/Priority:** ⚠️ med.
**Workstream:** A — Review panel geometry
**Reasoning tier:** standard

#### Context

`proto-tools.js` already gives the three destinations a dedicated `.pt-pages` container, but `proto-tools.css` treats it like every horizontal segmented control. The 194 px wide floating panel therefore compresses Changelog, Use cases and Comments until their labels overlap at the required 1280 × 844 review viewport; the current 390 × 844 browser pass does not measure their geometry.

#### What to do

1. Give `.pt-pages` a dedicated full-width vertical layout in both the wide floating-panel placement and the narrow responsive placement. Each destination must be a separate row; do not change the horizontal behavior of ordinary switch controls.
2. Preserve the existing destinations and carried URL state. Keep each link independently focusable, visibly focused and visually separated from its neighbours.
3. Extend the browser gate to measure the expanded panel at 1280 × 844 and 390 × 844. Assert three links in strict vertical order, readable label dimensions and no panel/document horizontal overflow.

Follow the pattern in: the existing geometry and overflow assertions in `tools/test-mobile-browser.js` and the dedicated `.pt-sheet` variants in `proto-tools.css`.

#### Scope

- Files: `proto-tools.css`, `tools/test-mobile-browser.js`
- New files: none
- Dependencies: none

#### Definition of Done

- [ ] Changelog, Use cases and Comments render as three separate full-width rows in the expanded panel at both 1280 × 844 and 390 × 844.
- [ ] Their top coordinates are strictly increasing, every link has `clientWidth >= scrollWidth`, and neither the panel nor the document overflows horizontally at either viewport.
- [ ] Keyboard focus remains visible on each destination, while unrelated segmented switches remain horizontal and usable.
- [ ] `npm --prefix tools run test:browser`, the existing static suite, lint and format checks pass.

#### Edge cases

- The responsive rule must not reapply generic equal-width flex sizing to `.pt-pages` or collapse the links back into one row.
- The collapsed panel may continue hiding all rows; assertions apply after the panel is expanded.

#### Test scenarios

- **Static:** the dedicated Review pages styling is scoped to `.pt-pages` and does not alter `.pt-sw` controls.
- **Browser:** open an ordinary generated mobile screen with the panel expanded at each required viewport; measure order, widths, scroll widths, focus treatment, panel bounds and document bounds.

#### Dependencies

- Blocked by: none
- Blocks: nothing

### IMPL-02: Keep hub activation copy and the published package truthful

**Source:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md#IV-02`
**Severity/Priority:** ℹ️ low
**Workstream:** B — Hub and package contract
**Reasoning tier:** standard

#### Context

`index.html` hard-codes that `comments.config.json` is absent and comments are disabled, while the Pages workflow can inject, validate and package that exact file from `COMMENTS_CONFIG_JSON`. The live hub can therefore contradict the comment runtime even when deployment is correct. The current static gate checks that the workflow mentions the secret and validator, but does not lock the assembled package to the actual configured/unconfigured state.

#### What to do

1. Replace the deployment-specific sentence in the Comment privacy section with state-neutral copy that is true in both modes: comments activate only when a validated configuration is packaged; otherwise the review layer remains disabled. Keep the existing storage, allowlist and privacy warnings.
2. After package assembly and before upload, make the workflow assert two-way parity for the exact `comments.config.json` path: a validated source config must be present in the package, and an absent source config must not appear there. Fail without printing the secret or file contents.
3. Extend the static package contract in `tools/test-mobile.js` so it rejects the stale absent/disabled claim and requires the post-assembly exact-file parity guard alongside the existing secret, validation and include-list checks.

Follow the pattern in: the existing `comments.config.json` Git/schema guards and workflow assertions in `tools/test-mobile.js`, plus the fail-closed `index.html` package check in `.github/workflows/prototype-refresh.yml`.

#### Scope

- Files: `index.html`, `.github/workflows/prototype-refresh.yml`, `tools/test-mobile.js`
- New files: none
- Dependencies: none

#### Definition of Done

- [ ] The hub no longer claims a particular deployment is configured or unconfigured; its activation and privacy explanation remains accurate in both states.
- [ ] The publication job fails before upload if source/package presence of the exact `comments.config.json` file differs in either direction.
- [ ] The parity check reveals only presence/absence and never echoes configuration contents.
- [ ] The default static gate protects both the neutral-copy contract and the packaged-config presence guard; existing tests, lint and format checks pass.

#### Edge cases

- Example and schema files matching `comments.config*.json` must not count as the exact runtime configuration.
- An empty or invalid secret must continue to be rejected by the existing injection/validation path rather than being treated as a successfully configured package.

#### Test scenarios

- **Static:** assert the hub contains no unconditional absent/disabled claim and the workflow compares the exact source and package paths after assembly.
- **Integration:** exercise the publication contract with config absent and with a validated config present; only the latter package may contain exact `comments.config.json`.

#### Dependencies

- Blocked by: none
- Blocks: nothing

## Execution plan

Runtime and workspace mode: resolved at execution time per `references/runtime-execution.md`. Expected base commit for every agent: `290832985507f48de67677a0a4b36e123750a7b3`. This guide has one single-tier round and disjoint file ownership.

### Round 1 — `standard` (parallel, then one sequential integration gate)

- **Agent 1 — Workstream A: Review panel geometry** — IMPL-01 — files: `proto-tools.css`, `tools/test-mobile-browser.js` — complexity: S — reasoning: standard
- **Agent 2 — Workstream B: Hub and package contract** — IMPL-02 — files: `index.html`, `.github/workflows/prototype-refresh.yml`, `tools/test-mobile.js` — complexity: S — reasoning: standard
- **Integration within Round 1 (sequential):** after both workstreams land, run `npm --prefix tools test`, `npm --prefix tools run lint`, `npm --prefix tools run format:check` and `npm --prefix tools run test:browser`; inspect the combined wide and narrow panel measurements and the two package-presence paths.

| Round | Agents | Cards | Complexity | Reasoning | Dependencies |
|---|---:|---:|---|---|---|
| 1 | 2 + sequential integration | 2 | S | standard | none |

## Handoff

- Source: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md`
- Scope: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309.md#{IV-01,IV-02}`
- State: `planned`
- Evidence: `uncommitted`
- Next: `/start-impl docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218-verify-report-20260807-2309-impl-guide-20260807-2316.md`
