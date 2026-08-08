# SPA.CZ partner mobile prototype — project instructions

## Product boundary

- This repository is a mobile-app prototype, not a responsive desktop redesign. Product frames are 390 × 844 and use the five-item bottom navigation.
- Product functions and business rules come from `../szallas-apps-master/spa/spacz_web`; the supplied design-system export supplies structure, while SPA.CZ colors and logo supply branding.
- Product data is deterministic fixture data. Never imply that a fixture is a live reservation, quotation, account balance, or partner-product “fact”. Keep provenance in `research/`, not in product labels.
- Do not import or reproduce production database rows for prototype content.

## Sources and generated files

- `tools/build-screens.js` is the source for all `m-*.html`; regenerate the screens instead of editing generated HTML by hand.
- `usecases.json` is the canonical published scenario matrix. `tools/build-usecases.js` generates `usecases.built.json`, `docs/usecases.md`, and captures under `docs/usecases/`.
- `tokens-m.css` and `app-m.css` are the mobile visual source of truth. `proto-m.js`, `proto-tools.*`, `proto-comments.*`, and `proto-discussion.*` are review scaffolding, not production application code.
- `prototype.json` controls previews, DOM dumps, and the editable Figma export. Keep every product/export frame mobile-only and 390 × 844.
- Room types, availability and package prices share one canonical fixture model. Persist only normalized overlays keyed by stable room/date or package IDs; never use list position or a first fixture as identity.
- Package editing is distinct from the read-only rates view. Use existing gallery fixture IDs only, and make package writes atomic: if durable local state cannot be stored, retain the form, explain the failure, and do not claim success.

## Interaction contract

- Every visible control must have exactly one observable result: a semantic route, a functioning sheet/form/state change, or a precise terminal limitation. Never use `href="#"`, duplicate HTML attributes, zero-sized links, or generic “In prototype” placeholder toasts.
- Links preserve relevant prototype state in the URL. Identity-bearing links must render the named reservation or offer; an unknown fixture must not silently fall back to another record.
- Touch targets are at least 44 px. Sheets move focus inside, close via their explicit control and Escape, and restore focus to the opener.
- Canonical use-case comment anchors are stable `data-c="uc-<id>"`. Local workshop drafts must not use `data-c` or mount their own comment layer.

## Quality gates

Run from the repository root:

```bash
npm --prefix tools test
npm --prefix tools run lint
npm --prefix tools run format:check
npm --prefix tools run test:browser
```

Chrome browser tests may require running outside the filesystem/process sandbox. Before publication, run the full artifact refresh:

```bash
node tools/refresh.js --allow-package-scripts
```

Then decode/check the `.fig`, confirm all 24 top-level frames are 390 × 844, and test the published HTTP URL rather than `file://`.

## Comments and Firebase

- `comments.config.json` may be absent (comments disabled) or locally present after explicit setup. When present, it must remain ignored, absent from the Git index/status and schema-valid; tests must inspect only those properties and never print its contents. Reviewer exports, credentials and one-time auth codes are also private.
- Root `firebase.json` is the only Firebase CLI authority. It serves emulator tests and live rules deployment; never add a second nested Firebase config or a `.firebaserc` alias.
- Run `node tools/test-firebase-deploy-config.js` from the repository root before emulator or deployment work. It rejects escaped, missing, non-file or symlinked rules paths, public emulator hosts and a second Firebase config.
- Use the pinned CLI in `tools/node_modules/.bin/firebase` and the one-session procedure in `docs/firebase-comments-setup.md`. Every Firebase command must pass `--config firebase.json`; every live resource command must also pass the exact `--project`.
- Create `(default)` explicitly in `europe-west3` and assert its exact name, `FIRESTORE_NATIVE` type, `STANDARD` edition and location from `firestore:databases:get --json` before any rules dry run or deployment. A deploy command must never become database creation.
- The `nam5` recovery path documents the pre-activation failure that was corrected on 7 August 2026; the current `(default)` is `FIRESTORE_NATIVE`, `STANDARD`, `europe-west3` and must not be deleted. Recovery requires exact project/database/current-location guards plus manual confirmation of zero collections and no deployed rules, secret or comments; never reuse it for an active database.
- Keep comments disabled if authentication, rules, allowlisting, secret injection or the live denial smoke test is incomplete. The product prototype must remain usable without Firebase.

## Known open boundary

- Firebase comments are not active until the dedicated EU database passes the location assertion, rules are deployed, `COMMENTS_CONFIG_JSON` is set in GitHub, and live authorized/unauthorized smoke tests pass.
