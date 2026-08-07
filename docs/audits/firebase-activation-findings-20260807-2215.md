# Operator findings — SPA.CZ Firebase activation

**Observed:** 2026-08-07 22:15 CEST  
**Repository commit:** `a1322516e71734334e0a4d9907c45fd05f619ed2`  
**Context:** first authenticated execution of `docs/firebase-comments-setup.md` against the new dedicated project `spa-cz-partner-mobile`  
**Toolkit version:** 7.1.1

## Findings

| ID | Type | Severity | Location | Problem | Recommendation |
|---|---|---|---|---|---|
| OP-01 | Broken deployment contract | High | `tools/firebase.json`; `docs/firebase-comments-setup.md` | The documented `--config tools/firebase.json` deployment cannot upload `../comments.rules`; Firebase CLI 15.26.0 resolves `tools/` as the project directory and refuses the rule file as outside it. The runbook therefore fails at the first real rules dry run despite repository-only checks being green. | Put the deployment config at the repository root with `comments.rules` inside the same project boundary, update every operator command, and add a static/executable preflight that proves the resolved rule file is contained and present. |
| OP-02 | Unsafe creation order | High | `docs/firebase-comments-setup.md`; dedicated Firebase project | The first rules dry run enabled Firestore and created `(default)` automatically in `nam5` before the runbook's promised deliberate region choice. Database location is immutable, so a deploy command must never be allowed to become the database-creation step. | Require an explicit, verified database-creation/location step before any rules deploy; make the preflight fail when the database is absent or its observed location differs from the approved EU location. Correct the still-empty newly created database before comment data exists. |

## Expected effects

| Finding | Observable | Read how | Value at emission |
|---|---|---|---|
| `docs/audits/firebase-activation-findings-20260807-2215.md#OP-01` | Firebase deployment config resolves its Firestore rules within its own project directory | Run a repository test that loads the deployment config, resolves `firestore.rules` from the config directory, checks path containment and executes the CLI rules dry-run after authentication | `tools/firebase.json` resolves to `../comments.rules`; real CLI exits with `Error: ../comments.rules is outside of project directory` |
| `docs/audits/firebase-activation-findings-20260807-2215.md#OP-02` | Dedicated project's default Firestore database location and creation order | In the authenticated Firebase session run `firebase firestore:databases:get '(default)' --project spa-cz-partner-mobile`; inspect runbook order before the first rules deploy | `(default)` exists in `nam5`, created by the first rules dry run before an explicit location choice |

## Operator evidence

- One-process login succeeded as the intended `szallas.group` account and same-context project listing worked.
- Dedicated project `spa-cz-partner-mobile` and its Web app were created; ignored `comments.config.json` validates and remains outside Git.
- No Firestore rules, allowlist document, GitHub secret or live comment data were deployed before these findings were emitted.

## Handoff

- Source: `docs/audits/firebase-activation-findings-20260807-2215.md`
- Scope: `OP-01`, `OP-02`
- State: `unplanned`
- Evidence: `uncommitted`
- Next: `/impl-guide docs/audits/firebase-activation-findings-20260807-2215.md`
