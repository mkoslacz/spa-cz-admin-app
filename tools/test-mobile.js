#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

const actualScreens = fs.readdirSync(root).filter(name => /^m-.*\.html$/.test(name)).sort();
assert.deepStrictEqual(actualScreens, expectedScreens, 'the product layer must contain exactly 16 mobile screens');
assert.strictEqual(
  fs.readdirSync(root).filter(name => /^(d-|desktop-).*\.html$/i.test(name)).length,
  0,
  'desktop product screens are outside this prototype scope'
);

for (const screen of actualScreens) {
  const html = read(screen);
  assert.match(html, /<meta name="viewport" content="width=390,/);
  assert.match(html, /data-viewport="mobile"/);
  assert.match(html, /class="mobile-bottom-nav"/);
  assert.strictEqual((html.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/) || [''])[0].match(/<a /g)?.length, 5);
  assert.match(html, /proto-tools\.js/);
  assert.match(html, /proto-comments\.js/);
  assert.match(html, /proto-m\.js/);
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
assert(frames.every(frame => frame.width === 390 && /^m-/.test(frame.page)), 'every Figma frame must be a 390 px mobile screen');

const usecases = JSON.parse(read('usecases.json'));
assert.strictEqual(usecases.usecases.length, 8, 'the reviewer handoff must contain eight use cases');
assert(
  usecases.usecases.every(usecase => usecase.viewport.width === 390 && usecase.screens.every(screen => /^m-/.test(screen))),
  'every use case must remain mobile-only'
);

assert(exists('comments.config.example.json'));
assert(exists('comments.config.schema.json'));
assert(exists('comments.rules'));
assert(!exists('comments.config.json'), 'live Firebase comments config must not exist before an explicit project is configured');

const runtime = read('proto-m.js');
assert.doesNotMatch(runtime, /commissionRate|Provize 15|Commission 15/);
assert.match(runtime, /partyTotal: base \* 2/);
assert.match(read('tokens-m.css'), /--brand-500: #1174bb/);
assert.match(read('tokens-m.css'), /--accent-500: #89c02c/);
assert.match(read('tokens-m.css'), /--space-compression: 0\.7/);

process.stdout.write(`mobile-static-qa: ${actualScreens.length} screens, ${frames.length} Figma frames, ${usecases.usecases.length} use cases — OK\n`);
