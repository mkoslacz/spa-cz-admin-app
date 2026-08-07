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
"$FIREBASE_BIN" --version

"$FIREBASE_BIN" --interactive login --reauth --no-localhost
"$FIREBASE_BIN" login:list
"$FIREBASE_BIN" projects:list
```

The CLI prints a Google URL because `--no-localhost` is intentional. Open that URL yourself and return the one-time code only to the still-running Firebase prompt in the same PTY. Do not start a second login command, change `XDG_CONFIG_HOME`, set `CI=1`, or pass the code as `firebase login <code>`.

The two verification commands must run immediately in the same shell. Confirm that `login:list` names the intended Google account and that `projects:list` is readable. Merely seeing a browser success page is not sufficient verification.

## 2. Create and configure the dedicated Firebase project

Use the Firebase console while the verified CLI PTY remains open:

1. Create a new project dedicated to `spa-cz-partner-mobile`. Record its exact project ID. Do not enable unrelated products or connect production data.
2. In Project settings, register one Web app for the prototype. Record its `apiKey`, `authDomain`, `projectId` and `appId`. No service account is needed for browser comments or a rules deployment.
3. Create the default Cloud Firestore database. Choose the region deliberately; moving an existing Firestore database later is not a routine configuration change.
4. In Authentication → Sign-in method, enable Google and select the operator-approved support email.
5. In Authentication → Settings → Authorized domains, add the exact live GitHub Pages hostname. Add `127.0.0.1` and/or `localhost` only when that exact local hostname will be used for an approved local smoke test. New Firebase projects do not necessarily add local hosts automatically.

Confirm that the `projectId` reported by the Web app is the same dedicated project ID shown by the CLI. Stop if it differs.

## 3. Establish reviewer and owner access

The security policy has two independent inputs:

1. In `comments.rules`, locate `DEPLOYMENT PATCH POINT` inside `hostedDomain()` and replace only the reserved `.example` alternatives with the approved reviewer email domains. Escape literal dots as `\\.` and keep the expression anchored. Do not put the GitHub Pages hostname there. The checked-in placeholders deliberately keep repository preparation closed; they must be replaced before activation.
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

Keep using the private PTY from step 1. Set and guard the dedicated project ID before any deploy:

```bash
cd /Users/mkoslacz/Workspaces/claude/spa-cz-admin-app
FIREBASE_PROJECT_ID='SET_DEDICATED_PROJECT_ID'
test "$FIREBASE_PROJECT_ID" != 'SET_DEDICATED_PROJECT_ID'
printf '%s\n' "$FIREBASE_PROJECT_ID" | rg '^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$'
"$FIREBASE_BIN" projects:list | rg -F "$FIREBASE_PROJECT_ID"

npm --prefix tools test
"$FIREBASE_BIN" --config tools/firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules --dry-run
"$FIREBASE_BIN" --config tools/firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules
```

`tools/firebase.json` deliberately resolves the deployed rules to `../comments.rules`. Always pass both `--config` and `--project`; do not create or depend on a mutable `.firebaserc` alias. Read the dry-run and deploy summaries and confirm the target project ID before continuing. A dry run may enable a required Firebase API, so treat it as an external operation, not a no-write check.

For a domain-enabled deployment, this check must return no matches before the real deploy:

```bash
if rg -n -F -e 'your-company\\.example' -e 'partner\\.example' comments.rules; then
  echo 'Refusing domain-enabled deploy: placeholder reviewer domains remain.' >&2
  exit 1
fi
```

Leaving the reserved `.example` values unchanged keeps domain-based access disabled; it is the safe repository default, not an activated deployment state.

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
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/comments.html`. This requires `127.0.0.1` to be an Authentication authorized domain. Stop the server before changing to a different local hostname so the origin remains explicit.

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

If the verified account is wrong, run `"$FIREBASE_BIN" logout` in the same private session, repeat the interactive reauthentication, and verify again before selecting or deploying to a project.

## Disable, rollback and clean up

To disable the browser layer without deleting comments:

```bash
gh secret delete COMMENTS_CONFIG_JSON
gh workflow run prototype-refresh.yml --ref main
```

Watch the new workflow run to completion and confirm that the published `comments.config.json` returns a not-found response. The site then loads the comment layer in disabled mode. Deleting the secret alone is not enough because the previous Pages deployment remains live until a successful republish.

For an immediate backend stop, disable the Google provider and deploy a reviewed deny-all Firestore ruleset to the exact dedicated project. Do not delete thread data as an incident response. Keep the prior rules revision for rollback, and use the same explicit `--config tools/firebase.json --project "$FIREBASE_PROJECT_ID" deploy --only firestore:rules` command after review. Re-enable access only after restoring the approved domain expression and exact allowlist records and repeating the smoke-test matrix.

When all Firebase work is complete, revoke the private CLI session and remove only its guarded temporary directory:

```bash
"$FIREBASE_BIN" logout
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
