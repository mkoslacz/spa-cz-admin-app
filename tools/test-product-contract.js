#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { outcomeAttributes } = require('./build-screens.js');

const root = path.resolve(__dirname, '..');
const screens = fs
  .readdirSync(root)
  .filter(name => /^m-.*\.html$/.test(name))
  .sort();
const outcomeSignals = [
  'data-open-sheet',
  'data-close-sheet',
  'data-state-key',
  'data-terminal',
  'data-grid-shift',
  'data-reservation-filter',
  'data-offer-filter',
  'data-billing-filter',
  'data-approval',
  'data-save-rates',
];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function attributes(tag) {
  const result = new Map();
  const source = tag.replace(/^<[^\s>]+/, '').replace(/\/?\s*>$/, '');
  for (const match of source.matchAll(/(?:^|\s)([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const name = match[1].toLowerCase();
    assert(!result.has(name), `duplicate attribute ${name} in ${tag.slice(0, 180)}`);
    result.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

assert.throws(() => outcomeAttributes({}), /exactly one outcome/);
assert.throws(() => outcomeAttributes({ route: 'm-offer.html', sheet: 'offer-sheet' }), /exactly one outcome/);
assert.match(outcomeAttributes({ route: 'm-offer.html' }), /data-outcome="route"/);
assert.match(outcomeAttributes({ sheet: 'offer-sheet' }), /data-outcome="sheet"/);
assert.match(
  outcomeAttributes({ terminal: { id: 'download', message: 'Demo document is ready.' } }),
  /data-outcome="terminal"/
);

for (const screen of screens) {
  const html = read(screen);
  assert.doesNotMatch(html, /href\s*=\s*["']#["']/i, `${screen}: exact href=# is forbidden`);
  assert.doesNotMatch(html, /data-toast/i, `${screen}: generic toast hooks are forbidden`);
  assert.doesNotMatch(html, /\bIn prototype\b|\bV prototypu\b/i, `${screen}: placeholder prototype copy is forbidden`);
  assert.doesNotMatch(
    html,
    /Public offer fact|Public fact|publicly verified|Verified pricing|Public baseline|Veřejná nabídka|Veřejný fakt|veřejně ověř|Ověřený cen|Veřejný základ/i,
    `${screen}: demo data must not be described as public or verified`
  );

  const tags = [...html.matchAll(/<[A-Za-z][^<>]*>/g)].map(match => match[0]);
  const sheetIds = new Set([...html.matchAll(/class="modal-backdrop" id="([^"]+)"/g)].map(match => match[1]));
  for (const tag of tags) {
    const attrs = attributes(tag);
    if (/^<a\b/i.test(tag)) {
      assert(attrs.has('href') && attrs.get('href').trim(), `${screen}: every anchor needs a destination`);
      const href = attrs.get('href');
      if (!/^(?:#|https?:|mailto:|tel:|data:)/.test(href)) {
        const local = href.split(/[?#]/)[0];
        assert(fs.existsSync(path.join(root, local)), `${screen}: missing route ${local}`);
      }
    }
    if (/^<button\b/i.test(tag)) {
      const outcomes = outcomeSignals.filter(name => attrs.has(name));
      if (attrs.get('type') === 'submit') outcomes.push('submit');
      assert.strictEqual(outcomes.length, 1, `${screen}: button requires exactly one outcome (${outcomes.join(', ')})`);
    }
    if (attrs.has('data-open-sheet')) {
      assert(sheetIds.has(attrs.get('data-open-sheet')), `${screen}: missing sheet #${attrs.get('data-open-sheet')}`);
    }
  }
}

for (const lang of ['', '-en']) {
  const more = read(`m-more${lang}.html`);
  const tiles = [...more.matchAll(/<(?:a|button) class="more-tile"[^>]*data-more-id="([^"]+)"[^>]*>/g)];
  assert.strictEqual(tiles.length, 14, `m-more${lang}.html: exactly 14 declared tiles`);
  assert.strictEqual(new Set(tiles.map(match => match[1])).size, 14, `m-more${lang}.html: unique tile ids`);
  tiles.forEach(match => {
    const attrs = attributes(match[0]);
    assert(['route', 'sheet'].includes(attrs.get('data-outcome')), `${match[1]}: declared route or sheet outcome`);
  });

  const dashboard = read(`m-dashboard${lang}.html`);
  const actions = [...dashboard.matchAll(/data-dashboard-action="([^"]+)"/g)].map(match => match[1]);
  assert.strictEqual(new Set(actions).size, 8, `m-dashboard${lang}.html: all dashboard actions are unique`);
  [
    'kpi-arrivals',
    'kpi-departures',
    'kpi-rooms',
    'kpi-approvals',
    'task-billing',
    'task-changes',
    'task-availability',
  ].forEach(id => {
    assert(actions.includes(id), `m-dashboard${lang}.html: ${id} is wired`);
  });

  const reservations = read(`m-reservations${lang}.html`);
  assert.strictEqual((reservations.match(/reservation=DEMO-/g) || []).length, 5, 'five exact reservation routes');
  const offers = read(`m-offer${lang}.html`);
  assert.strictEqual((offers.match(/offer=[a-z0-9-]+/g) || []).length, 4, 'four exact offer routes');
}

['tools/build-screens.js', 'proto-m.js'].forEach(relative => {
  const source = read(relative);
  assert.doesNotMatch(source, /data-toast|\bIn prototype\b|\bV prototypu\b/i, `${relative}: no placeholder outcomes`);
});

process.stdout.write(
  `product-contract-qa: ${screens.length} screens, dashboard, identities, filters and 14 More outcomes — OK\n`
);
