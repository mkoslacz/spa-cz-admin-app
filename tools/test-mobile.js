#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { captureJobs } = require('./capture-previews.js');
const { normaliseUsecase } = require('./build-usecases.js');
const { normalizedViewportHeight, normalizedViewportWidth } = require('./dump-dom.js');
const { frameQueue } = require('./dump-frames.js');
const { frameDimensions } = require('./generate-fig.js');
const { validateRepositoryFirebaseContract } = require('./test-firebase-deploy-config.js');

const root = path.resolve(__dirname, '..');
const areas = [
  'dashboard',
  'reservations',
  'reservation-detail',
  'availability',
  'offer',
  'rate-edit',
  'billing',
  'more',
];
const expectedScreens = areas.flatMap(area => [`m-${area}.html`, `m-${area}-en.html`]).sort();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

const actualScreens = fs
  .readdirSync(root)
  .filter(name => /^m-.*\.html$/.test(name))
  .sort();
assert.deepStrictEqual(actualScreens, expectedScreens, 'the product layer must contain exactly 16 mobile screens');
assert.strictEqual(
  fs.readdirSync(root).filter(name => /^(d-|desktop-).*\.html$/i.test(name)).length,
  0,
  'desktop product screens are outside this prototype scope'
);

for (const screen of actualScreens) {
  const html = read(screen);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(html, /data-viewport="mobile"/);
  assert.match(html, /class="mobile-bottom-nav"/);
  assert.strictEqual((html.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/) || [''])[0].match(/<a /g)?.length, 5);
  assert.match(html, /proto-tools\.js/);
  assert.match(html, /proto-comments\.js/);
  assert.match(html, /proto-m\.js/);
  assert.doesNotMatch(html, /prototype-hint|Interactive prototype/i);
  assert.doesNotMatch(html, /\{\{|\bLOREM IPSUM\b|TODO:|PLACEHOLDER_[A-Z_]+/i);

  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1]);
  for (const reference of references) {
    if (/^(?:#|https?:|mailto:|tel:|data:)/.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    if (!clean) continue;
    assert(exists(clean), `${screen} points to missing local file ${clean}`);
  }
}

const manifest = JSON.parse(read('prototype.json'));
const frames = manifest.rows.flatMap(row => row.frames);
assert.strictEqual(frames.length, 24, 'Figma export must declare 24 mobile frames');
assert.strictEqual(manifest.width, 390, 'the mobile export width must be 390 px');
assert.strictEqual(manifest.height, 844, 'the mobile export height must be one 844 px phone viewport');
assert(
  frames.every(frame => {
    const dimensions = frameDimensions(frame, manifest, { w: manifest.width, h: manifest.height });
    return dimensions.width === 390 && dimensions.height === 844 && /^m-/.test(frame.page);
  }),
  'every Figma frame must resolve to a 390×844 mobile viewport'
);

const previewJobs = captureJobs(manifest);
assert.strictEqual(previewJobs.length, 8, 'the review hub must have eight mobile preview captures');
assert(
  previewJobs.every(job => job.width === 390 && job.height === 844),
  'every review preview must capture one 390×844 phone viewport'
);

const queue = frameQueue(manifest, root, new Set(), { fs, path }).queue;
assert.strictEqual(queue.length, 24, 'the DOM dump queue must preserve all 24 declared frames');
assert(
  queue.every(job => job.width === 390 && job.height === 844),
  'the manifest height must reach every DOM dump job'
);
assert.strictEqual(normalizedViewportWidth(390), 390);
assert.strictEqual(normalizedViewportHeight(844), 844);

const usecases = JSON.parse(read('usecases.json'));
const builtUsecases = JSON.parse(read('usecases.built.json'));
assert(usecases.usecases.length > 0, 'the reviewer handoff must contain declared use cases');
assert.strictEqual(
  builtUsecases.usecases.length,
  usecases.usecases.length,
  'published source and built use-case counts must agree'
);
assert(
  usecases.usecases.every(
    usecase =>
      usecase.viewport.width === 390 &&
      usecase.viewport.height === 844 &&
      usecase.screens.every(screen => /^m-/.test(screen)) &&
      normaliseUsecase(usecase, root).screens.every(screen => screen.width === 390 && screen.height === 844)
  ),
  'every use case must remain mobile-only'
);
const usecaseCaptures = fs
  .readdirSync(path.join(root, 'docs/usecases'))
  .filter(name => /\.png$/i.test(name))
  .sort();
const expectedUsecaseCaptures = usecases.usecases
  .map(usecase => `${usecase.id}-${path.basename(usecase.screens[0], path.extname(usecase.screens[0]))}.png`)
  .sort();
assert.deepStrictEqual(
  usecaseCaptures,
  expectedUsecaseCaptures,
  'the published package must keep exactly one representative capture per use case'
);

assert(exists('comments.config.example.json'));
assert(exists('comments.config.schema.json'));
assert(exists('comments.rules'));
assert(exists('firebase.json'));
validateRepositoryFirebaseContract(root);
const hub = read('index.html');
assert.doesNotMatch(
  hub,
  /currently disabled because[\s\S]{0,160}intentionally absent/i,
  'the hub must not hard-code the current comments deployment state'
);
assert.match(
  hub,
  /comment layer activates only when a validated <code>comments\.config\.json<\/code> is packaged with the deployment; when the file is absent, the review layer remains disabled/i,
  'the hub must describe both configured and unconfigured comment modes'
);
if (exists('comments.config.json')) {
  const ignored = childProcess.spawnSync('git', ['check-ignore', '-q', 'comments.config.json'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(ignored.status, 0, 'configured comments.config.json must stay git-ignored');
  const indexed = childProcess.spawnSync('git', ['ls-files', '--error-unmatch', 'comments.config.json'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.notStrictEqual(indexed.status, 0, 'comments.config.json must never enter the Git index');
  const status = childProcess.spawnSync(
    'git',
    ['status', '--short', '--untracked-files=all', '--', 'comments.config.json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.strictEqual(status.status, 0, 'Git status check for comments.config.json must succeed');
  assert.strictEqual(status.stdout, '', 'comments.config.json must remain absent from Git status');
  const validation = childProcess.spawnSync(
    process.execPath,
    ['tools/validate-comments-config.js', 'comments.config.json'],
    {
      cwd: root,
      encoding: 'utf8',
    }
  );
  assert.strictEqual(validation.status, 0, 'configured comments.config.json must pass schema validation');
}
const publishWorkflow = read('.github/workflows/prototype-refresh.yml');
assert.match(publishWorkflow, /secrets\.COMMENTS_CONFIG_JSON/);
assert.match(publishWorkflow, /validate-comments-config\.js comments\.config\.json/);
assert.match(publishWorkflow, /^\s+comments\.config\*\.json$/m);
assert.match(publishWorkflow, /^\s+prototype\.json$/m);
assert.match(publishWorkflow, /^\s+usecases\.json$/m);
const packageCopyIndex = publishWorkflow.indexOf('cp -R "$match" "$destination/"');
const sourceConfigGuardIndex = publishWorkflow.indexOf('if [[ -f comments.config.json ]]');
const packageConfigRequiredIndex = publishWorkflow.indexOf('if [[ ! -f "$PACKAGE_DIR/comments.config.json" ]]');
const packageConfigForbiddenIndex = publishWorkflow.indexOf('elif [[ -e "$PACKAGE_DIR/comments.config.json" ]]');
const uploadIndex = publishWorkflow.indexOf('actions/upload-pages-artifact@v3');
assert(packageCopyIndex >= 0, 'the package workflow must assemble files before checking parity');
assert(
  sourceConfigGuardIndex > packageCopyIndex,
  'the exact comments config parity guard must run after package assembly'
);
assert(
  packageConfigRequiredIndex > sourceConfigGuardIndex,
  'a source comments config must require the exact packaged file'
);
assert(
  packageConfigForbiddenIndex > packageConfigRequiredIndex,
  'an absent source comments config must forbid the exact packaged file'
);
assert(uploadIndex > packageConfigForbiddenIndex, 'comments config parity must be checked before artifact upload');
const unsafeConfigOutputLines = publishWorkflow.split('\n').filter(line => {
  if (!/\$(?:\{)?COMMENTS_CONFIG_JSON\b/.test(line) || !/\b(?:echo|printf)\b/.test(line)) return false;
  return !/^\s*printf '%s\\n' "\$COMMENTS_CONFIG_JSON" > comments\.config\.json\s*$/.test(line);
});
assert.deepStrictEqual(
  unsafeConfigOutputLines,
  [],
  'the workflow may write the comments configuration only to its exact private source file'
);

const runtime = read('proto-m.js');
assert.doesNotMatch(runtime, /commissionRate|Provize 15|Commission 15/);
assert.match(runtime, /entry\.id === state\.reservation/);
assert.match(runtime, /entry\.id === state\.offer/);
assert.match(read('tokens-m.css'), /--brand-500: #1174bb/);
assert.match(read('tokens-m.css'), /--accent-400: #89c02c/);
assert.match(read('tokens-m.css'), /--accent-500: #76b82a/);
assert.match(read('tokens-m.css'), /--space-compression: 0\.7/);
assert.match(read('app-m.css'), /width: min\(100%, var\(--mobile-width\)\)/);

process.stdout.write(
  `mobile-static-qa: ${actualScreens.length} screens, ${frames.length} Figma frames, ${usecases.usecases.length} use cases — OK\n`
);
