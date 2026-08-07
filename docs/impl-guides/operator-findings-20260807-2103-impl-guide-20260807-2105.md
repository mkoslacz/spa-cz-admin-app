# Implementation guide — SPA.CZ mobile prototype interaction round

**Source:** `docs/audits/operator-findings-20260807-2103.md`  
**Generated:** 2026-08-07 21:05 CEST  
**Severity filter:** low — all findings included  
**Toolkit version:** 7.1.1  
**Expected base:** `67d3ab9296ca4b59af08ada3c891f965f5634daa`

## Triage and convergence history

All six findings become implementation cards. The initial prototype round created these surfaces and the readability round changed their presentation, but neither round emitted or attempted a corrective finding about use-case authoring, dead affordances, routed identity or Firebase login recovery. This is the first corrective cycle for each subject; the non-convergence gate does not apply.

### IMPL-01: Build a scalable local use-case workshop

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-01`  
**Severity/Priority:** High  
**Workstream:** A — Use-case workshop  
**Reasoning tier:** high

#### Context

`usecases.json` is an arbitrary-length declared matrix, but the review page is a one-way renderer and static QA freezes the current count at eight. The live review surface must support workshop authoring without pretending that static GitHub Pages can write back to Git and without attaching Firebase comments to uncommitted local drafts.

#### What to do

1. Add an authoring section directly to `usecases.html`: create, edit, duplicate, delete, search, reset, import and export. Keep the canonical published list and its stable `data-c="uc-<id>"` anchors unchanged; local draft cards must use a separate non-comment anchor namespace.
2. Extract shared browser/Node contract functions for validation, normalization and deep-link generation. Make `tools/build-usecases.js` consume the same contract, retaining its filesystem-containment check for named screens.
3. Persist a namespaced local draft with a fingerprint of the published source. Treat an upstream source change as an explicit conflict with Keep local, Download and Reset outcomes. Import must validate atomically before replacing the draft; export must refuse unknown axes/options, duplicate IDs, missing screens and incomplete global option coverage.
4. Populate screen choices from `prototype.json`, state choices from `usecases.json`, keep existing IDs immutable, mint unique draft IDs, render imported strings as text, cap imported payload size/count, and generate every preview URL with `URLSearchParams` and without `nopanel`.
5. Remove the eight-case limit from tests, hub copy and README. Publish the source JSON files needed by the workshop. Make captures scale to many scenarios by capturing one representative screen per use case while retaining deep links for every declared screen.

#### Scope

- Files: `usecases.html`, `usecases.json`, `usecases.built.json`, `docs/usecases.md`, `docs/usecases/`, `index.html`, `.github/workflows/prototype-refresh.yml`, `tools/build-usecases.js`, `tools/test-mobile.js`, `tools/package.json`
- New files: `usecases-contract.js`, `usecases-workshop.js`, `usecases-workshop.css`, `tools/test-usecases-contract.js`, `tools/test-usecases-workshop-browser.js`
- Dependencies: none

#### Definition of Done

- [ ] A reviewer can create, edit, duplicate and delete many locally persisted scenarios from Use cases, preview every deep link, reload without loss, and export/import normalized `usecases.json`.
- [ ] Importing 100 valid scenarios succeeds; malformed, oversized or unsafe content never mutates the current draft and never becomes executable markup.
- [ ] Existing canonical IDs and `data-c` anchors are stable; drafts have no comment anchors and load no separate comment store.
- [ ] Published-source conflicts and delete consequences are explicit; export is blocked while the declared state-option coverage is incomplete.
- [ ] Source count is no longer fixed to eight, source/built counts agree, and capture work grows by one image per scenario rather than one image per screen.
- [ ] Unit/static/browser tests, linting and CI pass.

#### Edge cases

- `file://` remains readable but explains that authoring data needs HTTP; private browsing or unavailable storage degrades to an in-memory draft with an explicit status.
- Reset and import are destructive only after confirmation; a failed import leaves the prior draft byte-for-byte intact.
- A changed published fingerprint never silently overwrites local work.

#### Test scenarios

- **Unit:** arbitrary length, duplicate IDs, unknown axes/options, traversal screen, missing screen/doc, uncovered option, canonical round-trip and encoded deep links.
- **Integration:** HTTP workshop create/edit/reload/duplicate/delete/reset, valid 100-case import/export, invalid atomic import, XSS-as-text, stable canonical anchors and absence of draft comment anchors.

#### Dependencies

- Blocked by: none
- Blocks: integration refresh and publication

### IMPL-02: Make dashboard actions and routed identity truthful

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-02`  
**Severity/Priority:** High  
**Workstream:** B — Product interaction contract  
**Reasoning tier:** high

#### Context

Dashboard cards look actionable but are static, attention links have no usable touch box, and record parameters are carried without changing the detail content. The same identity leak exists when multiple offer cards open one hard-coded rate editor.

#### What to do

1. Render each KPI and attention row as one complete semantic link with at least a 44 px touch target, preserved prototype state and a meaningful destination/filter: arrivals and departures to the matching reservation queue, free rooms to availability, approvals to billing, and attention items to their named workflow.
2. Make reservation and offer IDs explicit fixture keys. Resolve query identity into the destination heading, guest/stay/status/amount or package/rate context; never show a different record than the URL names.
3. Turn property selection and the signed-out CTA into real URL/state changes. Route notifications to a real notification sheet. Remove or replace any nearby product control whose only outcome is a generic placeholder toast.
4. Preserve Czech/English parity and back/navigation state.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `app-m.css`, `proto-m.css`, `m-*.html`
- Dependencies: none

#### Definition of Done

- [ ] All four KPIs and all three attention rows are fully clickable and navigate to the exact intended route/filter with prototype state preserved.
- [ ] Every supported reservation and offer link opens matching destination content; DEMO-10477 does not render DEMO-10482/Jana data.
- [ ] Property and authentication controls mutate the corresponding URL/state and notification controls open meaningful content.
- [ ] Touch targets are at least 44 px and keyboard semantics/focus are native.
- [ ] Czech and English behavior is equivalent.

#### Edge cases

- Unknown fixture IDs fall back to an explicit not-found demo state, not to a different record.
- Read-only/no-access/channel-manager modes continue to restrict writes after navigation.

#### Test scenarios

- **Unit:** fixture lookup for valid/unknown reservation and offer IDs; state-preserving URL construction.
- **Integration:** click every dashboard action in CZ/EN, assert exact pathname/query, target hitbox, and destination identity.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-05

### IMPL-03: Replace invented public-fact framing with honest demo copy

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-03`  
**Severity/Priority:** Medium  
**Workstream:** B — Product interaction contract  
**Reasoning tier:** high

#### Context

The selected property/package/price can remain deterministic demo content, but “Public offer fact”, “Public fact” and “Public baseline” are not partner-product concepts. The source provenance belongs in research documentation, not inside the mobile product.

#### What to do

1. Replace the affected dashboard, reservation, offer, rate and use-case copy with ordinary SPA.CZ offer/package and clearly marked demo-price language.
2. Remove the public-fact rule from the canonical use case while preserving a meaningful offer-to-rate story.
3. Regenerate derived screens and documentation; keep the external source only in `research/fact-base.md` as provenance.

#### Scope

- Files: `tools/build-screens.js`, `usecases.json`, generated `m-*.html`, `usecases.built.json`, `docs/usecases.md`, `README.md`
- Dependencies: none

#### Definition of Done

- [ ] The targeted phrase scan returns zero outside `research/fact-base.md`.
- [ ] The UI labels the values as demo data and does not claim a product concept or verification state that the partner panel does not provide.
- [ ] Offer-to-rate navigation and fixture consistency remain intact.

#### Edge cases

- Do not remove the actual SPA.CZ brand/status label or package information merely because “public fact” framing is removed.

#### Test scenarios

- **Unit:** static phrase-ban across source and generated product/use-case artifacts.
- **Integration:** dashboard, offer, reservation detail and rate editor retain comprehensible CZ/EN copy.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-05

### IMPL-04: Replace More placeholders with real routes and contextual sheets

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-04`  
**Severity/Priority:** High  
**Workstream:** B — Product interaction contract  
**Reasoning tier:** high

#### Context

The More tile factory defaults to `href="#"` and a generic toast, so almost the entire settings surface is an attractive directory of non-features. Role attributes are malformed and not enforced.

#### What to do

1. Replace the default placeholder factory with a required, exactly-one outcome descriptor: semantic route, contextual sheet/form, or explicit terminal result. A missing or conflicting outcome must fail generation/test.
2. Map Rooms to Availability and Billing to the existing billing flow. Give gallery, hotel profile, price-list import, invoices/payment documents, contract, users/permissions, channel manager, settings, change approvals and help meaningful contextual sheets or forms grounded in the routed partner areas.
3. Use one reusable sheet structure/pattern where sensible, but give every entry specific content and a verifiable outcome. Wire bell notifications into the same system.
4. Implement role/access filtering with valid attributes and runtime behavior. Preserve focus into a sheet, Escape/close behavior and focus return to the opener.
5. Eliminate duplicate attributes, `a[href="#"]` and generic “In prototype” / “V prototypu” placeholder messages from visible product controls.

#### Scope

- Files: `tools/build-screens.js`, `proto-m.js`, `app-m.css`, `proto-m.css`, generated `m-*.html`
- Dependencies: none

#### Definition of Done

- [ ] All fourteen More tiles in CZ/EN produce exactly one meaningful route, sheet/form, or explicit terminal result; none changes the URL to `#`.
- [ ] Users/Permissions obey access state, all sheets have specific titles/content/actions, and forms provide observable demo results.
- [ ] Sheet focus, Escape, backdrop/close and focus restoration work on a phone viewport.
- [ ] No duplicate HTML attributes, placeholder anchors or generic placeholder toasts remain.
- [ ] Notification entry points open the notification surface on all generated screens.

#### Edge cases

- Read-only users can inspect allowed information but cannot submit writes; no-access/signed-out walls still suppress the product surface.
- Channel-manager configuration links back to availability/rates in the channel-manager state.

#### Test scenarios

- **Unit:** generator rejects zero/multiple outcomes, duplicate attributes, missing sheet targets and placeholder anchors/toasts.
- **Integration:** iterate every More tile in both languages and full/read access; assert route or sheet result, state preservation, focus lifecycle and no console error.

#### Dependencies

- Blocked by: none
- Blocks: IMPL-05

### IMPL-05: Add a no-dead-affordance quality gate

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-05`, `docs/audits/operator-findings-20260807-2103.md#OP-02`, `docs/audits/operator-findings-20260807-2103.md#OP-04`  
**Severity/Priority:** High  
**Workstream:** B — Product interaction contract  
**Reasoning tier:** high

#### Context

The current suite proves that pages render, not that visible actions work. The new shared outcome mechanism needs a gate that fails on the same classes of defect found in this review.

#### What to do

1. Add a static contract test that inventories generated product controls and forbids placeholder hrefs, generic placeholder toasts, duplicate attributes, missing route files/sheet targets and controls with zero or multiple declared outcomes.
2. Extend browser QA over HTTP to click dashboard KPIs/tasks, all More tiles, notification/property/auth controls, offer filters/cards and identity-bearing reservation/offer routes in both languages and relevant access states.
3. Assert touch boxes, exact path/query/state, exclusive/filtering behavior, destination identity, sheet focus/close lifecycle, visible terminal feedback and a clean console.
4. Keep the existing mobile viewport, state, export and overflow coverage.

#### Scope

- Files: `tools/test-mobile-browser.js`
- New files: `tools/test-product-contract.js`
- Dependencies: IMPL-02, IMPL-03, IMPL-04

#### Definition of Done

- [ ] Reverting each interaction class from IMPL-02 or IMPL-04 makes a named test fail.
- [ ] The browser gate covers CZ and EN, full/read/signed-out/channel-manager states and every generated More/dashboard control.
- [ ] Existing viewport/export/state tests remain green.
- [ ] Static, lint, format and browser commands pass.

#### Edge cases

- Tests wait for the actual navigation/sheet state rather than fixed sleeps and report the precise control that failed.
- An explicit terminal result is allowed only when it names the real demo limitation and produces visible status; a generic placeholder is not an outcome.

#### Test scenarios

- **Unit:** generated control/outcome inventory and phrase/attribute/path checks.
- **Integration:** full click matrix with exact destination/state, focus, filtering and console assertions.

#### Dependencies

- Blocked by: IMPL-02, IMPL-03, IMPL-04
- Blocks: integration refresh and publication

### IMPL-06: Make Firebase comments setup recoverable and run it in one session

**Source:** `docs/audits/operator-findings-20260807-2103.md#OP-06`  
**Severity/Priority:** Medium  
**Workstream:** C — Firebase comments activation  
**Reasoning tier:** high  
**Requires:** operator authentication in the opened Google/Firebase flow

#### Context

The expired two-step session cannot be retried. The CLI also cannot use its ordinary global config from the sandbox, so the pending verifier must live in one private, escalated interactive PTY from login through configuration.

#### What to do

1. Add a repository runbook that uses one temporary mode-700 `XDG_CONFIG_HOME`, one interactive PTY and the local pinned CLI. Cover fresh login, same-context `login:list`/`projects:list`, expired/malformed recovery and safe cleanup.
2. After product integration, start that fresh flow and keep the same PTY/config context while the operator authenticates. Do not log or persist one-time codes.
3. Create/select a dedicated Firebase project and web app, enable Google Sign-In and Firestore, add the live Pages domain, replace placeholder rule access with the approved domain/explicit `allowed/{email}` owner record, deploy rules with `tools/firebase.json`, and validate an ignored `comments.config.json`.
4. Set `COMMENTS_CONFIG_JSON` in GitHub, trigger one Pages deployment, and smoke-test signed-in comments plus unauthorized denial. Never commit config, reviewer exports or credentials.
5. Link the runbook from README with exact verification and rollback/disable steps.

#### Scope

- Files: `README.md`, `comments.rules`
- New files: `docs/firebase-comments-setup.md`
- External systems: Firebase console/project, GitHub Actions secret, GitHub Pages deployment

#### Definition of Done

- [ ] A fresh one-process login replaces the expired session and `login:list`/`projects:list` succeed in the same private config context.
- [ ] Dedicated project, web app, Google provider, Firestore, authorized domain, allowlist/owner and deployed rules are verified.
- [ ] Ignored local config passes validation, the GitHub secret exists, Pages deploys it, and live comments pass authorized create/reply/resolve plus unauthorized denial.
- [ ] No credential, one-time code, config or comment export is committed or printed in reports.
- [ ] The runbook has explicit recovery and disable/rollback steps.

#### Edge cases

- If authentication or project creation requires operator confirmation, keep the PTY alive and stop at that exact boundary; do not mint another concurrent login session.
- If a rule or secret deployment fails, comments remain disabled and the public prototype stays usable.

#### Test scenarios

- **Unit:** config validator and Firestore rules emulator tests.
- **Integration:** same-context CLI account/project reads, rules deploy, GitHub secret presence, Pages workflow success and live authorized/unauthorized comment smoke test.

#### Dependencies

- Blocked by: operator authentication for external activation
- Blocks: final live-comments verification only

## New Patterns This Guide Introduces

| Pattern | Created by | Location | Used by |
|---|---|---|---|
| Shared use-case contract across browser and Node | IMPL-01 | `usecases-contract.js` | Workshop, generator and tests |
| Exactly-one visible control outcome | IMPL-04 | `tools/build-screens.js`, `proto-m.js` | More, notifications and future generated actions |
| Automated no-dead-affordance gate | IMPL-05 | `tools/test-product-contract.js`, `tools/test-mobile-browser.js` | All generated mobile screens |
| One-session private Firebase CLI setup | IMPL-06 | `docs/firebase-comments-setup.md` | Comments activation and recovery |

## Execution plan

Runtime and workspace mode: shared working directory. The orchestrator owns commits and integration; agents must not commit, stash, switch branches or edit files outside their assigned lists. All implementation cards require high reasoning because they create cross-cutting interaction, validation or security patterns.

### Round 1 — `high` (parallel)

- **Agent 1 — Workstream A: Use-case workshop** — IMPL-01 — files: `usecases.html`, `usecases.json`, `usecases.built.json`, `usecases-contract.js`, `usecases-workshop.js`, `usecases-workshop.css`, `docs/usecases.md`, `docs/usecases/*`, `index.html`, `.github/workflows/prototype-refresh.yml`, `tools/build-usecases.js`, `tools/test-mobile.js`, `tools/test-usecases-contract.js`, `tools/test-usecases-workshop-browser.js`, `tools/package.json` — complexity: L — reasoning: high
- **Agent 2 — Workstream B: Product interaction contract** — IMPL-02, IMPL-03, IMPL-04, IMPL-05 — files: `tools/build-screens.js`, `proto-m.js`, `app-m.css`, `proto-m.css`, `m-*.html`, `tools/test-mobile-browser.js`, `tools/test-product-contract.js` — complexity: L — reasoning: high
- **Agent 3 — Workstream C: Firebase activation runbook** — IMPL-06 repository preparation only — files: `README.md`, `comments.rules`, `docs/firebase-comments-setup.md` — complexity: M — reasoning: high

### Round 2 (sequential) — Integration and external activation

- Orchestrator verifies file ownership, integrates package scripts, resolves documentation references, updates `CLAUDE.md`, regenerates all screens/use-case captures/previews/DOM dumps/Figma, runs the full static/lint/format/browser/rules suite, commits the implementation report, deploys Pages, then continues IMPL-06 in one private interactive PTY through the operator-authentication boundary.

| Round | Agents | Cards | Complexity | Reasoning | Dependencies |
|---|---:|---:|---|---|---|
| 1 | 3 parallel | 6 | L | high | none inside the repository |
| 2 | 1 sequential | integration + external activation | L | high | Round 1; operator authentication for Firebase |

## Handoff
- Source: `docs/audits/operator-findings-20260807-2103.md`
- Scope: `docs/audits/operator-findings-20260807-2103.md#{OP-01,OP-02,OP-03,OP-04,OP-05,OP-06}`
- State: `planned`
- Evidence: `uncommitted`
- Next: `/start-impl docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105.md`
