#!/usr/bin/env node
'use strict';

// Receipt and contract for every artifact that represents the mobile product.
// The receipt deliberately records content hashes rather than timestamps: Chrome
// captures and .fig archives are not byte-stable across independent renders, but
// a completed refresh can attest to the exact inputs and outputs it promoted.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { changelogSourceDigest } = require('./build-changelog.js');

const ROOT = path.resolve(__dirname, '..');
const RECEIPT_VERSION = 1;
const FORBIDDEN_PRODUCT_MARKERS = /demo|ukázk|DEMO-/iu;

class ArtifactIntegrityError extends Error {}

function posix(relative) {
  return relative.split(path.sep).join('/');
}

function relativeFile(value, label) {
  if (typeof value !== 'string' || !value) {
    throw new ArtifactIntegrityError(`${label} must be a non-empty relative file path`);
  }
  const normalized = path.posix.normalize(value.split(path.sep).join('/'));
  if (normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new ArtifactIntegrityError(`${label} must stay inside the prototype root`);
  }
  return normalized;
}

function readJson(root, relative, label) {
  const file = path.join(root, relative);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ArtifactIntegrityError(`could not read ${label}: ${error.message}`);
  }
}

function frameEntries(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new ArtifactIntegrityError('prototype.json must contain an object');
  }
  const frames = (manifest.rows || []).flatMap(row => (Array.isArray(row && row.frames) ? row.frames : []));
  if (!frames.length) throw new ArtifactIntegrityError('prototype.json must declare at least one frame');
  const ids = new Set();
  return frames.map((frame, index) => {
    const id = String(frame && frame.id ? frame.id : '');
    const page = String(frame && frame.page ? frame.page : '');
    if (!/^[a-z0-9-]+$/i.test(id)) throw new ArtifactIntegrityError(`frame ${index + 1} has an invalid id`);
    if (ids.has(id)) throw new ArtifactIntegrityError(`prototype.json repeats frame id ${id}`);
    ids.add(id);
    return { id, page };
  });
}

function pageFile(page, label) {
  const file = String(page || '').split('?')[0];
  if (!/^m-[a-z0-9-]+\.html$/i.test(file)) {
    throw new ArtifactIntegrityError(`${label} must reference a mobile screen`);
  }
  return file;
}

function previewFrameIds(manifest) {
  const ids = manifest && manifest.artifacts && manifest.artifacts.previewFrameIds;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id)) {
    throw new ArtifactIntegrityError('prototype.json artifacts.previewFrameIds must be a non-empty string array');
  }
  if (new Set(ids).size !== ids.length) throw new ArtifactIntegrityError('prototype.json repeats a preview frame id');
  const known = new Set(frameEntries(manifest).map(frame => frame.id));
  for (const id of ids) {
    if (!known.has(id)) throw new ArtifactIntegrityError(`preview frame ${id} is not declared in prototype.json`);
  }
  return [...ids];
}

function receiptPath(manifest) {
  return relativeFile(
    (manifest && manifest.artifacts && manifest.artifacts.integrityReceipt) || 'tools/artifact-integrity.json',
    'prototype.json artifacts.integrityReceipt'
  );
}

function usecaseCapturePaths(usecases) {
  const entries = Array.isArray(usecases && usecases.usecases) ? usecases.usecases : [];
  if (!entries.length) throw new ArtifactIntegrityError('usecases.json must declare at least one use case');
  const ids = new Set();
  return entries.map((usecase, index) => {
    const id = String(usecase && usecase.id ? usecase.id : '');
    const screen = Array.isArray(usecase && usecase.screens) ? usecase.screens[0] : null;
    const screenFile = pageFile(screen, `use case ${id || index + 1} first screen`);
    if (!/^[A-Z0-9-]+$/i.test(id)) throw new ArtifactIntegrityError(`use case ${index + 1} has an invalid id`);
    if (ids.has(id)) throw new ArtifactIntegrityError(`usecases.json repeats ${id}`);
    ids.add(id);
    return `docs/usecases/${id}-${path.posix.basename(screenFile, '.html')}.png`;
  });
}

function artifactInventory(root = ROOT) {
  const manifest = readJson(root, 'prototype.json', 'prototype.json');
  const usecases = readJson(root, 'usecases.json', 'usecases.json');
  const frames = frameEntries(manifest);
  const frameById = new Map(frames.map(frame => [frame.id, frame]));
  const screenPaths = [...new Set(frames.map(frame => pageFile(frame.page, `frame ${frame.id}`)))].sort();
  const dumpPaths = frames.map(frame => `tools/dumps/dump-${frame.id}.json`).sort();
  const previewPaths = previewFrameIds(manifest)
    .map(id => {
      pageFile(frameById.get(id).page, `preview frame ${id}`);
      return `preview-${id}.png`;
    })
    .sort();
  const captures = usecaseCapturePaths(usecases).sort();
  const fig = relativeFile(manifest.out || 'prototype.fig', 'prototype.json out');
  const generated = ['changelog.json', 'usecases.built.json', 'docs/usecases.md', fig].sort();
  const outputs = [...new Set([...screenPaths, ...dumpPaths, ...previewPaths, ...captures, ...generated])].sort();
  return {
    captures,
    dumpPaths,
    manifest,
    outputs,
    previewPaths,
    receipt: receiptPath(manifest),
    screenPaths,
  };
}

function walkFiles(root, relative) {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  const stat = fs.statSync(directory);
  if (stat.isFile()) return [posix(relative)];
  const entries = [];
  for (const name of fs.readdirSync(directory).sort()) {
    entries.push(...walkFiles(root, path.join(relative, name)));
  }
  return entries;
}

function canonicalInputPaths(root, inventory = artifactInventory(root)) {
  const rootFiles = fs
    .readdirSync(root)
    .filter(name => /^(?:m-.*\.html|.*\.css|proto.*\.js|index\.html)$/i.test(name))
    .sort();
  const toolFiles = [
    'tools/artifact-integrity.js',
    'tools/atomic-write.js',
    'tools/build-changelog.js',
    'tools/build-screens.js',
    'tools/build-usecases.js',
    'tools/capture-previews.js',
    'tools/converter-policy.js',
    'tools/dump-dom.js',
    'tools/dump-frames.js',
    'tools/generate-fig.js',
    'tools/package.json',
    'tools/package-lock.json',
    'tools/refresh.js',
    'tools/.schema/canvas.fig',
    'prototype.json',
    'usecases-contract.js',
    'usecases.json',
  ];
  const assets = walkFiles(root, 'assets');
  const inputs = [...new Set([...rootFiles, ...toolFiles, ...assets])].sort();
  for (const relative of inputs) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new ArtifactIntegrityError(`canonical input is missing: ${posix(relative)}`);
    }
  }
  if (!inventory.screenPaths.every(screen => inputs.includes(screen))) {
    throw new ArtifactIntegrityError('every generated mobile screen must be a canonical artifact input');
  }
  return inputs;
}

function hashFile(root, relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new ArtifactIntegrityError(`artifact is missing: ${posix(relative)}`);
  }
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function hashFiles(root, paths) {
  return Object.fromEntries([...paths].sort().map(relative => [relative, hashFile(root, relative)]));
}

function assertExactFiles(root, directory, matcher, expectedPaths, label) {
  const expected = expectedPaths.map(relative => path.posix.basename(relative)).sort();
  const location = path.join(root, directory);
  if (!fs.existsSync(location) || !fs.statSync(location).isDirectory()) {
    throw new ArtifactIntegrityError(`${label} directory is missing: ${directory}`);
  }
  const actual = fs
    .readdirSync(location)
    .filter(name => matcher.test(name))
    .sort();
  if (!sameJson(actual, expected)) {
    throw new ArtifactIntegrityError(`${label} inventory differs from its canonical manifest`);
  }
}

function assertOutputInventory(root, inventory) {
  assertExactFiles(root, 'tools/dumps', /^dump-.*\.json$/i, inventory.dumpPaths, 'DOM dump');
  assertExactFiles(root, '.', /^preview-.*\.png$/i, inventory.previewPaths, 'preview');
  assertExactFiles(root, 'docs/usecases', /\.png$/i, inventory.captures, 'use-case capture');
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function textValues(value, values = []) {
  if (Array.isArray(value)) {
    value.forEach(entry => textValues(entry, values));
    return values;
  }
  if (!value || typeof value !== 'object') return values;
  if (typeof value.text === 'string') values.push(value.text);
  Object.entries(value).forEach(([key, entry]) => {
    if (key !== 'text') textValues(entry, values);
  });
  return values;
}

function forbiddenDumpMarkers(root, inventory = artifactInventory(root)) {
  const matches = [];
  for (const relative of inventory.dumpPaths) {
    const dump = readJson(root, relative, relative);
    for (const text of textValues(dump)) {
      const match = text.match(FORBIDDEN_PRODUCT_MARKERS);
      if (match) matches.push({ marker: match[0], relative, text });
    }
  }
  return matches;
}

function assertNoForbiddenDumpMarkers(root, inventory) {
  const matches = forbiddenDumpMarkers(root, inventory);
  if (matches.length) {
    const sample = matches
      .slice(0, 5)
      .map(match => `${match.relative}: ${match.marker}`)
      .join('; ');
    throw new ArtifactIntegrityError(
      `derived DOM dumps contain forbidden product markers (${matches.length}): ${sample}`
    );
  }
}

function readReceipt(root, inventory) {
  const receipt = readJson(root, inventory.receipt, 'artifact integrity receipt');
  if (
    !receipt ||
    receipt.version !== RECEIPT_VERSION ||
    !/^[a-f0-9]{64}$/i.test(receipt.changelogSourceDigest || '') ||
    !receipt.inputs ||
    !receipt.outputs
  ) {
    throw new ArtifactIntegrityError('artifact integrity receipt has an unsupported shape');
  }
  return receipt;
}

function receiptPayload(root = ROOT) {
  const inventory = artifactInventory(root);
  return {
    version: RECEIPT_VERSION,
    changelogSourceDigest: changelogSourceDigest(root),
    inputs: hashFiles(root, canonicalInputPaths(root, inventory)),
    outputs: hashFiles(root, inventory.outputs),
  };
}

function validateRefreshedArtifacts(root = ROOT) {
  const inventory = artifactInventory(root);
  assertOutputInventory(root, inventory);
  assertNoForbiddenDumpMarkers(root, inventory);
  return inventory;
}

function validateReceipt(root = ROOT) {
  const inventory = validateRefreshedArtifacts(root);
  const receipt = readReceipt(root, inventory);
  const expected = receiptPayload(root);
  if (receipt.changelogSourceDigest !== expected.changelogSourceDigest) {
    throw new ArtifactIntegrityError('artifact integrity receipt changelog source is stale; run the complete refresh');
  }
  if (!sameJson(receipt.inputs, expected.inputs)) {
    throw new ArtifactIntegrityError('artifact integrity receipt inputs are stale; run the complete refresh');
  }
  if (!sameJson(receipt.outputs, expected.outputs)) {
    throw new ArtifactIntegrityError(
      'artifact integrity receipt outputs are stale or incomplete; run the complete refresh'
    );
  }
  assertNoForbiddenDumpMarkers(root, inventory);
  return { inventory, receipt };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || argv[0] !== '--check') {
    throw new ArtifactIntegrityError('usage: node tools/artifact-integrity.js --check');
  }
  const result = validateReceipt(ROOT);
  process.stdout.write(
    `artifact-integrity: ${result.inventory.screenPaths.length} screens, ${result.inventory.dumpPaths.length} dumps, ${result.inventory.previewPaths.length} previews and ${result.inventory.captures.length} use-case captures — OK\n`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`artifact-integrity: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  ArtifactIntegrityError,
  RECEIPT_VERSION,
  artifactInventory,
  canonicalInputPaths,
  forbiddenDumpMarkers,
  previewFrameIds,
  validateReceipt,
  validateRefreshedArtifacts,
};
