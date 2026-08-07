# Implementation Report — SPA.CZ Firebase activation correction

## Summary

- **Source guide:** `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`
- **Source report:** `docs/audits/firebase-activation-findings-20260807-2215.md`; continuation of `docs/impl-guides/operator-findings-20260807-2103-impl-guide-20260807-2105-verify-report-20260807-2208.md#IV-01`
- **Result commit:** `c2d70a6f340804728c10a623eb8971be801701e2`
- **Toolkit version:** 7.1.1
- **Runtime and workspace mode:** Codex collaboration agents launched with `spawn_agent`; two parallel workstreams and the orchestrator shared one working directory, with disjoint primary ownership and orchestrator integration.
- **Reasoning tier applied:** Workstream A (`IMPL-01`) and Workstream B (`IMPL-02`, repository portion of `IMPL-03`) used high reasoning with `gpt-5.6-sol`; the orchestrator used `gpt-5.6-sol` high reasoning for authenticated deployment, external-state guards and integration. No tier degraded and no card resolved off-table.
- **Agent bases:** both implementation agents reported `6b2d27f137151205d0dfab3260c788e3fdce8f46`; the orchestrator integrated their shared-tree changes from that exact base.
- **Baseline tests:** 5 executable suites before this correction round.
- **Final tests:** 8 executable suites (+3: Firebase deploy preflight, comments-config matrix and Firestore rules emulator matrix).
- **Branch coverage (changed files):** N/A — the repository has no coverage command.
- **Mutation score (changed files):** N/A — the repository has no mutation command.
- **Total cards:** 3 | ✅ 3 | ❌ 0 | ⏸️ 0
- **Cards merged (shared root cause):** none; the three cards remained independently auditable while sharing the canonical root Firebase configuration.

## Card results

| Card | Outcome | Evidence |
|------|---------|----------|
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-01` | implemented | Commit `c2d70a6f340804728c10a623eb8971be801701e2`; `npm --prefix tools test` executes the 14-case validator matrix and the real loopback Firestore emulator matrix for signed-out, unapproved, `@szallas.group`, explicit allowlist and owner identities, including thread/message/state/two-phase-delete behavior. |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-02` | implemented | Root `firebase.json` is the sole authority; the retired nested config is removed. `node tools/test-firebase-deploy-config.js` passes the canonical contract plus six negative path/host/config cases. Auth and rules dry runs and real deployments succeeded against explicit project `spa-cz-partner-mobile`; `comments.rules` compiled and was released. |
| `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#IMPL-03` | implemented | The accidentally created empty `nam5` database was deleted only before activation, recreated after the service cooldown and verified as exact `(default)`, `FIRESTORE_NATIVE`, `STANDARD`, `europe-west3`. The machine-readable assertion ran immediately before both rules deployments; the runbook now makes that order executable and retains the prior correction only as a fail-closed historical recovery. |

Fix level: shared mechanism — the root deployment contract, emulator suite and location assertion prevent recurrence across every future Firebase command.

## Architectural changes

- Root `firebase.json` now owns both Google Sign-In configuration and the loopback-only Firestore emulator/rules deployment. A nested config and mutable project alias are forbidden.
- The default test gate now treats an absent comments configuration as disabled and a present local configuration as valid only when ignored, unindexed, status-clean and schema-valid.
- Firestore authorization is executable evidence: deterministic demo identities exercise the same checked-in rules without any live credential or project access.
- Google Sign-In is deployed as code with one provider, one OAuth brand/support identity and the exact production/local authorized hosts.
- Firebase/Firestore debug logs are ignored to prevent accidental source-control disclosure.

## Warnings

- The macOS default `PATH` does not expose Java. Local emulator runs require `JAVA_HOME=/opt/homebrew/opt/openjdk@21` and `/opt/homebrew/opt/openjdk@21/bin` on `PATH`; CI installs Temurin 21 explicitly.
- Full signed-in browser verification still depends on an interactive Google session. Public Auth configuration, provider status, allowed hosts, rules and owner allowlist are verified independently; the production browser smoke test belongs to the post-publish verification round.

## CLAUDE.md Changes Made

- Documented the single root Firebase authority, mandatory deploy preflight, explicit project/config arguments and EU database assertion.
- Replaced the old “config must be absent” invariant with the fail-closed absent-or-ignored-and-valid contract.
- Recorded the corrected `nam5` incident boundary so the historical recovery cannot be reused against the active EU database.

## Deviations from plan

- The correction guide focused on rules and database safety. The orchestrator also encoded and deployed Google Sign-In from root `firebase.json`, completing the original guide's Firebase activation dependency without a console-only configuration branch.
- Firebase's live provisioning backend rejected `127.0.0.1:4174` even though the CLI documentation demonstrates redirect origins with ports. The deployed contract therefore authorizes the exact `127.0.0.1` host, which covers the local HTTP server independently of port; a safe API read confirmed both expected hosts after deployment.
- The initial rules dry run against the old nested config caused the source finding and occurred before this implementation. The corrected root-config dry run compiled successfully and no longer crosses the Firebase project boundary.

## Failed / skipped cards

None. Versioning was not changed because this static prototype has no versioning policy or release manifest.

## External activation evidence

- Dedicated project: `spa-cz-partner-mobile`; one active Web app, `SPA CZ Partner Mobile Review`.
- Authentication deploy: Google provider enabled; safe Admin API projection verified `google.com` enabled and authorized hosts `mateuszkoslacz.com`, `127.0.0.1` plus the two Firebase defaults.
- Firestore: exact default database verified as native, standard edition and `europe-west3`; rules dry run compiled, then the same rules were released.
- Allowlist: exact owner document was created with only `{ "user": "owner" }` and read back successfully.
- Browser configuration: ignored local file passed the shared validator and Git guards; GitHub secret `COMMENTS_CONFIG_JSON` exists in `mkoslacz/spa-cz-admin-app` without its value being read back.
- Local HTTP smoke: `comments.html` loaded the configured signed-out wall and Google Sign-In action. The in-app browser could not complete its own cross-origin Auth validation from localhost, while the public Auth endpoint independently returned HTTP 200 with an exact CORS allowance for the same origin. Production-origin sign-in is deferred to post-publish verification.

## Suggested Memory Updates

- Preference candidate: in clickable prototypes every visible affordance needs one observable outcome, and Use cases should be a generative workshop rather than a fixed read-only coverage document.
- Environment candidate: this repository's Firebase comments backend is the dedicated `spa-cz-partner-mobile` project with EU Firestore and Google Sign-In; deployment configuration is managed from root `firebase.json`.

## Follow-up

- Push `main`, watch the single Pages workflow run, then verify the production hub, packaged configuration and owner/unauthorized comment behavior.
- Run `/impl-verify docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md` with fresh eyes after publication evidence exists.

## Handoff

- Source: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`
- Scope: `docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md#{IMPL-01,IMPL-02,IMPL-03}`
- State: `implemented`
- Evidence: `c2d70a6f340804728c10a623eb8971be801701e2`; `npm --prefix tools test`; authenticated Auth/rules deploys and machine-readable EU database assertion
- Next: `/impl-verify docs/impl-guides/firebase-activation-findings-20260807-2215-impl-guide-20260807-2218.md`
