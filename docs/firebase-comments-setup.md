# Firebase stakeholder comments: setup, verification and recovery

This runbook activates the prototype comment layer without making the repository public by accident. The layer is disabled while `comments.config.json` and the `COMMENTS_CONFIG_JSON` repository secret are absent. Repository preparation does not include authenticating to Google, creating cloud resources or changing GitHub.

## Non-negotiable boundaries

- Use a dedicated Firebase project and web app for this prototype. Do not reuse a production or shared project. The `owner` role is global to the Firebase project, not scoped to one prototype.
- Run every Firebase CLI command below in one private terminal session. Use the repository-pinned CLI, not `npx`, Homebrew or a globally installed CLI.
- Never paste a one-time authorization code, refresh token, service-account JSON, reviewer email list or comment export into chat, an issue, a build log or source control.
- `comments.config.json` contains Firebase web configuration, not an administrative credential, but it is deployment-specific and remains ignored. The workflow receives it through a repository secret.
- An Authentication authorized domain controls which web origins may start sign-in. It does not authorize a reviewer. Firestore rules are the data-access boundary.
- `allowedEmailDomains` in `comments.config.json` must describe the approved policy, but it is not a substitute for the matching rule in `comments.rules`.

Before starting, record these operator-approved values outside the repository:

| Value | Required meaning |
| --- | --- |
| Firebase project ID | A new, dedicated project ID, never a production project. |
| Live prototype URL | The final HTTPS GitHub Pages URL, including its repository path. |
| Live authorized hostname | Only the hostname from that URL, without scheme, path or port. |
| Approved reviewer email domain(s) | The exact domain alternatives allowed by Firestore rules. |
| Owner email | The exact, verified Google email that receives owner-only deletion controls. |
| Additional reviewer emails | Exact, verified Google emails when explicit exceptions are required. |

Do not substitute the GitHub Pages hostname for an email domain. They solve different problems.

## 1. Start one private Firebase CLI session

Install the locked tooling first:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
npm --prefix tools ci
```

Start one user-approved, network-capable PTY and keep it open through login, verification and deployment. In a managed agent environment this is the escalated PTY; do not start login in a sandboxed process and finish it elsewhere. Run this block in that one terminal:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
set -euo pipefail

FIREBASE_CLI_CONFIG_DIR="$(mktemp -d /private/tmp/spa-cz-firebase-cli.XXXXXX)"
case "$FIREBASE_CLI_CONFIG_DIR" in
  /private/tmp/spa-cz-firebase-cli.*) ;;
  *) echo "Unexpected Firebase CLI config path" >&2; exit 1 ;;
esac
chmod 700 "$FIREBASE_CLI_CONFIG_DIR"
export XDG_CONFIG_HOME="$FIREBASE_CLI_CONFIG_DIR"

FIREBASE_BIN="$PWD/tools/node_modules/.bin/firebase"
test -x "$FIREBASE_BIN"
PINNED_FIREBASE_VERSION="$(node -p "require('./tools/package-lock.json').packages['node_modules/firebase-tools'].version")"
test "$PINNED_FIREBASE_VERSION" = "15.26.0"
"$FIREBASE_BIN" --config firebase.json --version

"$FIREBASE_BIN" --config firebase.json --interactive login --reauth --no-localhost
"$FIREBASE_BIN" --config firebase.json login:list
"$FIREBASE_BIN" --config firebase.json projects:list
```

The CLI prints a Google URL because `--no-localhost` is intentional. Open that URL yourself and return the one-time code only to the still-running Firebase prompt in the same PTY. Do not start a second login command, change `XDG_CONFIG_HOME`, set `CI=1`, or pass the code as `firebase login <code>`.

The two verification commands must run immediately in the same shell. Confirm that `login:list` names the intended Google account and that `projects:list` is readable. Merely seeing a browser success page is not sufficient verification.

## 2. Create and configure the dedicated Firebase project

Use the Firebase console while the verified CLI PTY remains open:

1. Create a new project dedicated to `spa-cz-partner-mobile`. Record its exact project ID. Do not enable unrelated products or connect production data.
2. In Project settings, register one Web app for the prototype. Record its `apiKey`, `authDomain`, `projectId` and `appId`. No service account is needed for browser comments or a rules deployment.
3. Do not open a rules deployment or any console flow that can create Firestore implicitly. Create and verify `(default)` from the repository root first, using the approved EU region `europe-west3`:

   ```bash
   FIREBASE_PROJECT_ID='spa-cz-partner-mobile'
   FIRESTORE_DATABASE_ID='(default)'
   FIRESTORE_LOCATION='europe-west3'
   test "$FIREBASE_PROJECT_ID" = 'spa-cz-partner-mobile'
   test "$FIRESTORE_DATABASE_ID" = '(default)'
   test "$FIRESTORE_LOCATION" = 'europe-west3'
   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" projects:list | rg -F "$FIREBASE_PROJECT_ID"

   assert_firestore_database() {
     expected_location="$1"
     database_state="$FIREBASE_CLI_CONFIG_DIR/firestore-database.json"
     "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" firestore:databases:get "$FIRESTORE_DATABASE_ID" --json > "$database_state"
     node - "$database_state" "$FIREBASE_PROJECT_ID" "$FIRESTORE_DATABASE_ID" "$expected_location" <<'NODE'
   const assert = require('node:assert/strict');
   const fs = require('node:fs');
   const [statePath, projectId, databaseId, expectedLocation] = process.argv.slice(2);
   const response = JSON.parse(fs.readFileSync(statePath, 'utf8'));
   const database = response.result || response;
   assert.equal(database.name, `projects/${projectId}/databases/${databaseId}`);
   assert.equal(database.type, 'FIRESTORE_NATIVE');
   assert.equal(database.databaseEdition, 'STANDARD');
   assert.equal(database.locationId, expectedLocation);
   NODE
   }

   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" firestore:databases:create "$FIRESTORE_DATABASE_ID" --location "$FIRESTORE_LOCATION" --edition standard
   assert_firestore_database "$FIRESTORE_LOCATION"
   ```

   The assertion is machine-readable and must confirm the exact resource name, `FIRESTORE_NATIVE`, `STANDARD` and `europe-west3`. If creation says `(default)` already exists, stop. Verify it with the same function; use the guarded recovery section only for the exact empty `spa-cz-partner-mobile` database in the known wrong location. Never let a rules dry run create the database.
4. Review the checked-in `auth.providers.googleSignIn` block in root `firebase.json`. It is the deployment authority for the OAuth brand, support email and these authorized redirect hosts only: `https://mateuszkoslacz.com` and `http://127.0.0.1`. Firebase authorizes the local host independently of the server port. Deploy and verify it from the same authenticated PTY:

   ```bash
   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only auth --dry-run
   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only auth
   ```

   Do not add another provider or broader redirect URI. Firebase's default `firebaseapp.com` handler is provisioned automatically. Add `localhost` only by a reviewed source change when that exact origin will be used.

Confirm that the `projectId` reported by the Web app is the same dedicated project ID shown by the CLI. Stop if it differs.

## 3. Establish reviewer and owner access

The security policy has two independent inputs:

1. Keep the anchored `hostedDomain()` policy restricted to the approved `szallas.group` reviewer email domain. Do not put the GitHub Pages hostname there. Changing or broadening this rule requires the emulator authorization matrix to pass before deployment.
2. In Firestore, create collection `allowed`. Create a document whose document ID is the owner's exact verified Google email. Add exactly this owner field:

   ```json
   {
     "user": "owner"
   }
   ```

   The document ID comparison is exact and case-sensitive. Copy the email shown by the authenticated Google account; do not normalize, encode or abbreviate it.

For an approved reviewer outside the hosted domains, create `allowed/{exact-verified-email}` with a non-owner marker such as:

```json
{
  "user": "reviewer"
}
```

Never assign `"owner"` to a group address or shared account. A normal reviewer's document only needs to exist; the `user` value must not be `owner`.

## 4. Test and deploy Firestore rules

Keep using the private PTY and the guarded values plus `assert_firestore_database` from step 2. The repository preflight and live location assertion are mandatory before both the dry run and the real deployment:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
FIREBASE_PROJECT_ID='spa-cz-partner-mobile'
test "$FIREBASE_PROJECT_ID" = 'spa-cz-partner-mobile'
test "$FIRESTORE_DATABASE_ID" = '(default)'
test "$FIRESTORE_LOCATION" = 'europe-west3'
printf '%s\n' "$FIREBASE_PROJECT_ID" | rg '^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$'
"$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" projects:list | rg -F "$FIREBASE_PROJECT_ID"

npm --prefix tools test
node tools/test-firebase-deploy-config.js
assert_firestore_database "$FIRESTORE_LOCATION"
"$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules --dry-run
assert_firestore_database "$FIRESTORE_LOCATION"
"$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules
```

The root `firebase.json` is the only authority for both emulator tests and live rules deployment. It resolves root `comments.rules` inside the same Firebase project boundary. Always run commands from the repository root and pass both `--config firebase.json` and the explicit `--project`; do not create or depend on a mutable `.firebaserc` alias. Read the dry-run and deploy summaries and confirm the target project ID before continuing. A dry run may enable a required Firebase API, so treat it as an external operation, not a no-write check.

For a domain-enabled deployment, this check must return no matches before the real deploy:

```bash
if rg -n -F -e 'your-company\\.example' -e 'partner\\.example' comments.rules; then
  echo 'Refusing domain-enabled deploy: placeholder reviewer domains remain.' >&2
  exit 1
fi
```

The deployed repository state must contain no reserved `.example` reviewer-domain placeholder. The exact `szallas.group` policy is covered by the emulator matrix.

## 5. Build and validate the ignored browser configuration

Create the local file only if one is not already present:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
test ! -e comments.config.json
cp comments.config.example.json comments.config.json
```

Edit `comments.config.json` locally:

- keep `prototypeId` as `spa-cz-partner-mobile`;
- set `prototypeUrl` to the exact live HTTPS GitHub Pages URL;
- copy only the Web app's `apiKey`, `authDomain`, `projectId` and `appId` into `firebase`;
- set `allowedEmailDomains` to the same approved email domains enforced by `hostedDomain()`;
- retain the declared `stateKeys` unless the prototype state contract changed.

Do not add a service account, private key, CLI token or one-time code. Then run all guards:

```bash
node tools/validate-comments-config.js comments.config.json
if rg -n 'replace-with|\.example' comments.config.json; then
  echo 'Refusing deployment: placeholder comments configuration remains.' >&2
  exit 1
fi
git check-ignore -q comments.config.json
test -z "$(git status --short --untracked-files=all -- comments.config.json)"
```

The expected validator output is `comments config valid: comments.config.json`. The ignored-file and status checks must exit successfully with no path staged or reported.

For local browser verification, serve the repository over HTTP; `file://` cannot exercise the complete comment layer:

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174/comments.html`. Its `127.0.0.1` host is declared in the Authentication deployment contract. Stop the server before changing to a different local hostname so the origin remains explicit.

## 6. Store the GitHub secret and publish

Run these commands only after the Firebase smoke test succeeds and only from the intended GitHub repository:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
gh repo view --json nameWithOwner,url
gh secret set COMMENTS_CONFIG_JSON < comments.config.json
gh secret list | rg '^COMMENTS_CONFIG_JSON\b'

gh workflow run prototype-refresh.yml --ref main
gh run list --workflow prototype-refresh.yml --event workflow_dispatch --limit 3
```

Select the newly created run by branch and timestamp, then verify it without exposing secret values:

```bash
PAGES_RUN_ID='SET_NEW_RUN_ID'
test "$PAGES_RUN_ID" != 'SET_NEW_RUN_ID'
printf '%s\n' "$PAGES_RUN_ID" | rg '^[0-9]+$'
gh run watch "$PAGES_RUN_ID" --exit-status
```

The workflow writes the secret to `comments.config.json`, validates it, and includes it in the GitHub Pages package. Never print the secret with shell tracing, `gh secret` cannot read its value back, and workflow logs must show validation status rather than configuration content.

## 7. Live smoke-test matrix

Use the published HTTPS URL, not a local file, and test each identity separately:

| Identity | Required result |
| --- | --- |
| Exact owner account | Sign in; load threads; create an anchored thread; reply; resolve; reopen; delete a disposable thread with owner-only controls. |
| Approved non-owner reviewer | Sign in; load threads; create; reply; resolve/reopen; no owner-only delete capability. |
| Unapproved Google account | Authentication may complete, but Firestore reads and writes are denied; no thread data becomes visible. |
| Signed-out visitor | No comment data is read or written; sign-in is offered. |

Also verify:

- a comment anchored on one mobile screen does not appear on an unrelated screen;
- a refresh preserves the thread, reply and resolved state;
- the owner account matches the exact `allowed/{email}` document ID;
- the browser network log contains no service-account material or CLI token;
- `comments.config.json` is present on the live deployment only after activation;
- the live hostname is authorized, while an unlisted origin cannot start Google sign-in.

Delete the disposable smoke-test thread as the owner. Do not take screenshots that expose reviewer emails or comment contents.

## Guarded recovery for a verified empty `nam5` database

The 7 August 2026 corrective run already recreated `projects/spa-cz-partner-mobile/databases/(default)` as `FIRESTORE_NATIVE`, `STANDARD`, `europe-west3`; do not delete that database. This recovery is retained only for the same fail-closed, pre-activation condition: a newly created exact dedicated database observed in `nam5` before rules, the GitHub secret or comments were activated. It is not a general database-migration procedure. Refuse recovery if the project, database ID or current location differs, if any collection exists, if rules/configuration were published, or if `COMMENTS_CONFIG_JSON` exists.

1. In the Firebase console, open the exact `spa-cz-partner-mobile` project and `(default)` database. Confirm that the Data view lists zero collections. In GitHub, confirm that `COMMENTS_CONFIG_JSON` is absent and the published site has no `comments.config.json`. Confirm that no reviewer was invited and no rules deployment succeeded.
2. In the original authenticated PTY, set the four immutable guard values and the two confirmations manually. Do not copy this block with the confirmations already changed:

   ```bash
   FIREBASE_PROJECT_ID='spa-cz-partner-mobile'
   FIRESTORE_DATABASE_ID='(default)'
   FIRESTORE_CURRENT_LOCATION='nam5'
   FIRESTORE_LOCATION='europe-west3'
   RECOVERY_EMPTY_DATABASE_CONFIRMED='NO'
   RECOVERY_NO_ACTIVATION_CONFIRMED='NO'

   test "$FIREBASE_PROJECT_ID" = 'spa-cz-partner-mobile'
   test "$FIRESTORE_DATABASE_ID" = '(default)'
   test "$FIRESTORE_CURRENT_LOCATION" = 'nam5'
   test "$FIRESTORE_LOCATION" = 'europe-west3'
   test "$RECOVERY_EMPTY_DATABASE_CONFIRMED" = 'YES_ZERO_COLLECTIONS'
   test "$RECOVERY_NO_ACTIVATION_CONFIRMED" = 'YES_NO_RULES_SECRET_OR_COMMENTS'
   if gh secret list | rg '^COMMENTS_CONFIG_JSON\b'; then
     echo 'Refusing recovery: the comments deployment secret exists.' >&2
     exit 1
   fi
   assert_firestore_database "$FIRESTORE_CURRENT_LOCATION"
   ```

3. Only after every guard passes, request deletion without `--force`. Read the interactive prompt and confirm that it names exactly `projects/spa-cz-partner-mobile/databases/(default)`:

   ```bash
   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" firestore:databases:delete "$FIRESTORE_DATABASE_ID"
   ```

4. Firebase may impose a recreate cooldown after deletion. Do not loop, change the database ID, or run a rules command while deletion/cooldown is pending. Wait for the service-reported cooldown, then issue the one exact create command and assert the result before returning to step 4:

   ```bash
   "$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" firestore:databases:create "$FIRESTORE_DATABASE_ID" --location "$FIRESTORE_LOCATION" --edition standard
   assert_firestore_database "$FIRESTORE_LOCATION"
   ```

The final assertion must report the exact default database as `FIRESTORE_NATIVE`, `STANDARD`, `europe-west3`. A mismatch stops the activation; it never licenses another delete.

## Malformed, expired or interrupted login recovery

Symptoms such as `No pending login`, an expired code, malformed auth state, or a browser success page followed by an unauthenticated CLI mean the verifier and callback did not complete in the same process/context.

1. Press Control-C once in the affected Firebase CLI process. Do not reuse its URL or code and do not run a completion command in a second shell.
2. If other Firebase login commands are running, stop them. Use one login at a time.
3. Clean only the validated private directory, then close that PTY:

   ```bash
   cleanup_target="${FIREBASE_CLI_CONFIG_DIR:-}"
   case "$cleanup_target" in
     /private/tmp/spa-cz-firebase-cli.*) ;;
     *) echo "Refusing unsafe cleanup target" >&2; exit 1 ;;
   esac
   test -d "$cleanup_target"
   test ! -L "$cleanup_target"
   rm -rf -- "$cleanup_target"
   unset XDG_CONFIG_HOME FIREBASE_CLI_CONFIG_DIR cleanup_target
   ```

4. Open a fresh PTY and repeat step 1 from `mktemp` through `login:list` and `projects:list`. Keep `--interactive --reauth --no-localhost`; do not set `CI=1`.

If the CLI reports that it cannot update `~/.config`, the private `XDG_CONFIG_HOME` was not set in that same shell. Do not run Firebase with `sudo` and do not change ownership or permissions on the user's normal configuration directory. Restart with the private directory instead.

If the verified account is wrong, run `"$FIREBASE_BIN" --config firebase.json logout` in the same private session, repeat the interactive reauthentication, and verify again before selecting or deploying to a project.

## Disable, rollback and clean up

To disable the browser layer without deleting comments:

```bash
gh secret delete COMMENTS_CONFIG_JSON
gh workflow run prototype-refresh.yml --ref main
```

Watch the new workflow run to completion and confirm that the published `comments.config.json` returns a not-found response. The site then loads the comment layer in disabled mode. Deleting the secret alone is not enough because the previous Pages deployment remains live until a successful republish.

For an immediate backend stop, disable the Google provider and deploy a reviewed deny-all Firestore ruleset to the exact dedicated project. Do not delete thread data as an incident response. Keep the prior rules revision for rollback. Before the reviewed deny-all deployment, repeat both repository and live database guards:

```bash
node tools/test-firebase-deploy-config.js
assert_firestore_database "$FIRESTORE_LOCATION"
"$FIREBASE_BIN" --config firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules
```

Re-enable access only after restoring the approved domain expression and exact allowlist records and repeating the smoke-test matrix.

When all Firebase work is complete, revoke the private CLI session and remove only its guarded temporary directory:

```bash
"$FIREBASE_BIN" --config firebase.json logout
cleanup_target="${FIREBASE_CLI_CONFIG_DIR:-}"
case "$cleanup_target" in
  /private/tmp/spa-cz-firebase-cli.*) ;;
  *) echo "Refusing unsafe cleanup target" >&2; exit 1 ;;
esac
test -d "$cleanup_target"
test ! -L "$cleanup_target"
rm -rf -- "$cleanup_target"
unset XDG_CONFIG_HOME FIREBASE_CLI_CONFIG_DIR cleanup_target
```

## Privacy and retention

Firebase stores reviewer identity, email, comment text, anchors and workflow state. Define an owner, retention period and deletion process before inviting reviewers. Treat any export under ignored `comments/` as personal data: keep it out of Git, Pages artifacts, chat and screenshots, and delete local copies when the review is closed. Never collect production guest or reservation data in comments.

Firebase Web app keys are intentionally browser-visible; they do not replace Firestore rules. CLI OAuth credentials remain in the private XDG directory and must be removed after the session. Administrative automation, if added later, must take a service-account file path through `FIREBASE_SERVICE_ACCOUNT`; never place JSON credentials in an environment value or repository file.
