#!/usr/bin/env node
'use strict';

// Generate developer-facing state documentation and the compact panel payload
// from a prototype-root usecases.json. The matrix is intentionally declared:
// it documents meaningful product states without claiming that every possible
// combination of switches is a use case.
//
// Usage: node tools/build-usecases.js [--out docs/usecases.md]
//                                      [--json usecases.built.json]
//                                      [--no-capture] [--only UC-01]

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const usecasesContract = require('../usecases-contract.js');

class ToolError extends Error {}

const HELP = `Usage: node tools/build-usecases.js [options]

Reads usecases.json from the prototype root and writes developer documentation
plus the panel's usecases.built.json payload.

Options:
  --out <path>   Markdown output (default: docs/usecases.md)
  --json <path>  Panel JSON output (default: usecases.built.json)
  --no-capture   Do not open Chrome or create screenshots
  --only <id>    Generate/capture one declared use case after validating all states
  --help         Show this help
`;

function parseArgs(argv) {
  const options = { out: 'docs/usecases.md', json: 'usecases.built.json', capture: true, only: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--no-capture') {
      options.capture = false;
      continue;
    }
    if (arg === '--out' || arg === '--json' || arg === '--only') {
      const value = argv[++i];
      if (!value) throw new ToolError(arg + ' requires a value');
      options[arg.slice(2)] = value;
      continue;
    }
    throw new ToolError('unknown option: ' + arg + ' (use --help)');
  }
  return options;
}

function validateMatrix(matrix, root) {
  let allowedScreens = null;
  const manifestFile = path.join(root, 'prototype.json');
  if (fs.existsSync(manifestFile)) {
    try {
      allowedScreens = usecasesContract.screensFromManifest(JSON.parse(fs.readFileSync(manifestFile, 'utf8')));
    } catch (error) {
      throw new ToolError('could not parse prototype.json: ' + error.message);
    }
  }
  const result = usecasesContract.validateMatrix(matrix, {
    allowedScreens,
    maxUsecases: Number.MAX_SAFE_INTEGER,
    requireCoverage: true,
  });
  const errors = result.errors.slice();
  for (const [index, usecase] of (Array.isArray(matrix && matrix.usecases) ? matrix.usecases : []).entries()) {
    const label = 'use case #' + (index + 1);
    for (const screen of Array.isArray(usecase && usecase.screens) ? usecase.screens : []) {
      if (typeof screen !== 'string' || !screen.trim()) continue;
      const screenPath = safeScreenPath(root, screen, label, errors);
      if (screenPath && !fs.existsSync(screenPath)) errors.push(label + ' names a missing screen "' + screen + '"');
    }
  }
  if (errors.length) throw new ToolError(errors.join('; '));
  return usecasesContract.normalizeMatrix(matrix);
}

function safeScreenPath(root, screen, label, errors) {
  if (path.isAbsolute(screen)) {
    errors.push(label + ' screen must be relative: "' + screen + '"');
    return null;
  }
  const resolved = path.resolve(root, screen);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    errors.push(label + ' screen escapes the prototype root: "' + screen + '"');
    return null;
  }
  return resolved;
}

function queryForState(state, extra) {
  return usecasesContract.queryForState(state, extra);
}

function deepLink(screen, state) {
  return usecasesContract.deepLink(screen, state);
}

function viewportFor(screen, usecase) {
  return usecasesContract.viewportFor(screen, usecase);
}

function relativeScreenLink(outFile, root, screen, state) {
  const screenPath = path.resolve(root, screen);
  const relative = path.relative(path.dirname(outFile), screenPath).split(path.sep).join('/');
  return relative + queryForState(state);
}

function normaliseUsecase(usecase, root) {
  void root;
  return usecasesContract.normalizedEntry(usecase);
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function markdown(matrix, entries, outFile, root, captures, captureEnabled) {
  const lines = [
    '# Product use cases',
    '',
    'Generated from `usecases.json`. The matrix is declared rather than a full cross-product: every switch option is documented and appears in at least one product use case.',
    '',
    '## Local workshop',
    '',
    'Open [`usecases.html`](../usecases.html) over HTTP to create, edit, duplicate, delete, search, validate, preview, import and export scenarios. Drafts stay in this browser until a normalized `usecases.json` is downloaded and deliberately committed; they do not create Firebase comment anchors.',
    '',
    'The workshop protects local work when the published source fingerprint changes, caps imports at 1 MiB / 500 scenarios, and blocks export until every declared state option is covered. After replacing the source JSON, run `node tools/build-usecases.js` to regenerate this document, the review payload and one representative capture per scenario.',
    '',
    '## State reference',
    '',
  ];
  for (const [axis, definition] of Object.entries(matrix.states)) {
    lines.push('### ' + (definition.label || axis) + ' (`' + axis + '`)');
    lines.push('');
    lines.push(definition.doc);
    lines.push('');
    lines.push('| Option | Meaning |');
    lines.push('| --- | --- |');
    for (const [option, detail] of Object.entries(definition.options)) {
      lines.push(
        '| `' +
          option +
          '`' +
          (detail.label ? ' — ' + escapeMarkdown(detail.label) : '') +
          ' | ' +
          escapeMarkdown(detail.doc) +
          ' |'
      );
    }
    lines.push('');
  }
  for (const entry of entries) {
    lines.push('## ' + entry.id + ' — ' + entry.name);
    lines.push('');
    lines.push(entry.story);
    lines.push('');
    lines.push('### State');
    lines.push('');
    lines.push('| Axis | Selected option | Meaning |');
    lines.push('| --- | --- | --- |');
    for (const [axis, option] of Object.entries(entry.state)) {
      const axisDef = matrix.states[axis];
      const optionDef = axisDef.options[option];
      lines.push(
        '| ' +
          escapeMarkdown(axisDef.label || axis) +
          ' (`' +
          axis +
          '`) | `' +
          option +
          '`' +
          (optionDef.label ? ' — ' + escapeMarkdown(optionDef.label) : '') +
          ' | ' +
          escapeMarkdown(optionDef.doc) +
          ' |'
      );
    }
    lines.push('');
    lines.push('### Screens and deep links');
    lines.push('');
    for (const screen of entry.screens) {
      const docLink = relativeScreenLink(outFile, root, screen.screen, entry.state);
      const capture = captures.get(entry.id + '\0' + screen.screen);
      let line =
        '- **' +
        screen.viewport +
        ' · ' +
        screen.width +
        '×' +
        screen.height +
        '** — [' +
        screen.screen +
        '](' +
        docLink +
        ')';
      if (captureEnabled && capture) {
        const imageLink = path.relative(path.dirname(outFile), capture).split(path.sep).join('/');
        line += ' · [capture](' + imageLink + ')';
      }
      lines.push(line);
    }
    lines.push('');
    lines.push('### Engineering rules');
    lines.push('');
    if (entry.rules.length) entry.rules.forEach(rule => lines.push('- ' + rule));
    else lines.push('- No additional rules declared.');
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

function writeAtomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2, 8);
  try {
    fs.writeFileSync(temporary, contents);
    fs.renameSync(temporary, file);
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (_) {
      /* promoted or already absent */
    }
  }
}

function chromePath() {
  return process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

function timeout(promise, ms, description) {
  let timer;
  const expiry = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ToolError(description + ' timed out after ' + ms + ' ms')), ms);
  });
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer));
}

async function captureEntries(entries, root, outFile, dependencies = {}) {
  const fileSystem = dependencies.fileSystem || fs;
  const loadPuppeteer = dependencies.loadPuppeteer || (() => require('puppeteer-core'));
  let puppeteer;
  try {
    puppeteer = loadPuppeteer();
  } catch (_) {
    throw new ToolError('capture requires puppeteer-core; run npm ci in tools/ or pass --no-capture');
  }
  const chrome = dependencies.chrome || chromePath();
  if (!fileSystem.existsSync(chrome))
    throw new ToolError('Chrome not found at ' + chrome + ' — set CHROME_PATH or pass --no-capture');
  const captureDir = path.join(path.dirname(outFile), 'usecases');
  const captureTimeout = dependencies.captureTimeoutMs ?? Number(process.env.USECASE_CAPTURE_TIMEOUT_MS || 90000);
  const captures = new Map();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: 'new',
      args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
    });
    for (const entry of entries) {
      const screen = entry.screens[0];
      if (screen) {
        const source = path.resolve(root, screen.screen);
        const target = path.join(
          captureDir,
          entry.id + '-' + path.basename(screen.screen, path.extname(screen.screen)) + '.png'
        );
        const temporary = target + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2, 8);
        const page = await browser.newPage();
        try {
          await page.setViewport({ width: screen.width, height: screen.height, deviceScaleFactor: 1 });
          const url = pathToFileURL(source);
          for (const [key, value] of Object.entries(entry.state || {})) url.searchParams.set(key, String(value));
          url.searchParams.set('nopanel', '1');
          await timeout(
            page.goto(url.toString(), { waitUntil: 'networkidle0', timeout: 60000 }),
            captureTimeout,
            'capture ' + entry.id + ' ' + screen.screen
          );
          await page.evaluate(() => document.fonts && document.fonts.ready);
          await page.evaluate(() => {
            delete document.body.dataset.export;
          });
          await page.evaluate(
            () => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))
          );
          fileSystem.mkdirSync(path.dirname(target), { recursive: true });
          await timeout(
            page.screenshot({ path: temporary, fullPage: false, captureBeyondViewport: false }),
            captureTimeout,
            'capture ' + entry.id + ' ' + screen.screen
          );
          fileSystem.renameSync(temporary, target);
          captures.set(entry.id + '\0' + screen.screen, target);
        } catch (error) {
          try {
            fileSystem.unlinkSync(temporary);
          } catch (_) {
            /* no partial capture remains */
          }
          throw error;
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  if (dependencies.pruneStale !== false && typeof fileSystem.readdirSync === 'function') {
    const expected = new Set(Array.from(captures.values()).map(file => path.resolve(file)));
    for (const name of fileSystem.readdirSync(captureDir)) {
      const candidate = path.resolve(captureDir, name);
      if (/\.png$/i.test(name) && !expected.has(candidate)) fileSystem.unlinkSync(candidate);
    }
  }
  return captures;
}

function readMatrix(root) {
  const file = path.join(root, 'usecases.json');
  if (!fs.existsSync(file)) throw new ToolError('usecases.json not found at ' + file);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError('could not parse usecases.json: ' + error.message);
  }
}

async function build(options, cwd = process.cwd()) {
  const root = path.resolve(cwd);
  const matrix = validateMatrix(readMatrix(root), root);
  let source = matrix.usecases;
  if (options.only) {
    source = source.filter(usecase => usecase.id === options.only);
    if (!source.length) throw new ToolError('no use case with id "' + options.only + '"');
  }
  const entries = source.map(usecase => normaliseUsecase(usecase, root));
  const markdownOutput = path.resolve(root, options.out);
  const jsonOutput = path.resolve(root, options.json);
  const captures = options.capture
    ? await captureEntries(entries, root, markdownOutput, { pruneStale: !options.only })
    : new Map();
  const panel = {
    generatedAt: new Date().toISOString(),
    states: matrix.states,
    usecases: entries.map(({ screens, ...entry }) => ({
      ...entry,
      screens: screens.map(({ width, height, ...screen }) => screen),
    })),
  };
  writeAtomic(markdownOutput, markdown(matrix, entries, markdownOutput, root, captures, options.capture));
  writeAtomic(jsonOutput, JSON.stringify(panel, null, 2) + '\n');
  return { markdownOutput, jsonOutput, entries, captureCount: captures.size };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(HELP);
      return;
    }
    const result = await build(options);
    console.log(
      'wrote ' +
        result.entries.length +
        ' use cases (' +
        result.captureCount +
        ' captures) → ' +
        result.markdownOutput +
        ', ' +
        result.jsonOutput
    );
  } catch (error) {
    console.error('build-usecases: ' + (error && error.message ? error.message : String(error)));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  ToolError,
  parseArgs,
  validateMatrix,
  queryForState,
  deepLink,
  viewportFor,
  normaliseUsecase,
  markdown,
  captureEntries,
  build,
};
