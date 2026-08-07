#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const source = JSON.parse(fs.readFileSync(path.join(root, 'usecases.json'), 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function manyMatrix(count) {
  const matrix = clone(source);
  matrix.usecases = Array.from({ length: count }, (_, index) => {
    const usecase = clone(source.usecases[index % source.usecases.length]);
    usecase.id = `UC-BROWSER-${String(index + 1).padStart(3, '0')}`;
    usecase.name = `Browser scenario ${index + 1}`;
    return usecase;
  });
  return matrix;
}

function contentType(file) {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
    }[path.extname(file)] || 'application/octet-stream'
  );
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
        return;
      }
      response.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': contentType(file) });
      response.end(data);
    });
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__usecasesWorkshop && window.__usecasesWorkshop.ready);
  await page.evaluate(() => window.__usecasesWorkshop.ready);
  await page.waitForFunction(() => document.querySelectorAll('#ucw-list [data-uc-id]').length > 0);
}

async function setValue(page, selector, value) {
  await page.$eval(
    selector,
    (node, next) => {
      node.value = next;
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
      node.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    value
  );
}

async function countDrafts(page) {
  return page.$$eval('#ucw-list [data-uc-id]', nodes => nodes.length);
}

async function run() {
  assert(fs.existsSync(chrome), `Chrome not found at ${chrome}`);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-usecases-workshop-'));
  const importFile = path.join(temporary, 'usecases-100.json');
  fs.writeFileSync(importFile, JSON.stringify(manyMatrix(100)));
  const server = await startServer();
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/usecases.html`;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: 'new',
      args: ['--force-device-scale-factor=1'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await waitReady(page);

    assert.strictEqual(
      await page.$$eval('[data-c^="uc-"]', nodes => nodes.length),
      source.usecases.length,
      'every canonical source scenario must keep one stable comment anchor'
    );
    assert.strictEqual(await countDrafts(page), source.usecases.length);
    assert.strictEqual(
      await page.$$eval('#ucw-list [data-c]', nodes => nodes.length),
      0,
      'drafts must never be comment anchors'
    );

    await page.click('#ucw-create');
    await page.waitForSelector('#ucw-editor:not([hidden])');
    const createdId = await page.$eval('#ucw-id', node => node.value);
    assert.match(createdId, /^UC-DRAFT-\d+$/);
    await setValue(page, '#ucw-name', '<b>Created safely</b>');
    await setValue(page, '#ucw-story', 'A locally persisted scenario.');
    await setValue(page, '#ucw-rules', 'First rule\nSecond rule');
    await page.click('#ucw-form button[type="submit"]');
    await page.waitForSelector('#ucw-editor[hidden]');
    assert.strictEqual(await countDrafts(page), source.usecases.length + 1);

    await page.reload({ waitUntil: 'networkidle0' });
    await waitReady(page);
    assert.strictEqual(await countDrafts(page), source.usecases.length + 1, 'created draft must survive reload');
    assert.strictEqual(
      await page.$eval(`[data-uc-id="${createdId}"] h3`, node => node.textContent),
      '<b>Created safely</b>',
      'imported or authored markup must remain text'
    );
    assert.strictEqual(await page.$$eval(`[data-uc-id="${createdId}"] b`, nodes => nodes.length), 0);

    await page.click(`[data-uc-id="${createdId}"] button[data-action="edit"]`);
    await setValue(page, '#ucw-name', 'Edited scenario');
    assert.strictEqual(
      await page.$eval('#ucw-id', node => node.readOnly),
      true,
      'IDs must stay immutable in the editor'
    );
    await page.click('#ucw-form button[type="submit"]');
    await page.waitForSelector('#ucw-editor[hidden]');
    assert.strictEqual(await page.$eval(`[data-uc-id="${createdId}"] h3`, node => node.textContent), 'Edited scenario');

    await page.click(`[data-uc-id="${createdId}"] button[data-action="duplicate"]`);
    assert.strictEqual(await countDrafts(page), source.usecases.length + 2);
    const duplicateId = await page.$$eval(
      '#ucw-list [data-uc-id]',
      (cards, original) => {
        const copy = cards.find(card => card.querySelector('h3').textContent === 'Edited scenario (copy)');
        return copy && copy.getAttribute('data-uc-id') !== original ? copy.getAttribute('data-uc-id') : '';
      },
      createdId
    );
    assert.match(duplicateId, /^UC-DRAFT-\d+$/);
    page.once('dialog', dialog => {
      assert.match(dialog.message(), /Published cards and comments stay unchanged/);
      dialog.accept();
    });
    await page.click(`[data-uc-id="${duplicateId}"] button[data-action="delete"]`);
    await page.waitForFunction(id => !document.querySelector(`[data-uc-id="${id}"]`), {}, duplicateId);
    assert.strictEqual(await countDrafts(page), source.usecases.length + 1);

    page.once('dialog', dialog => dialog.accept());
    const fileInput = await page.$('#ucw-import-file');
    await fileInput.uploadFile(importFile);
    await page.waitForFunction(() => document.querySelectorAll('#ucw-list [data-uc-id]').length === 100);
    assert.strictEqual((await page.evaluate(() => window.__usecasesWorkshop.getSnapshot())).usecases.length, 100);
    const exported = await page.evaluate(() => window.__usecasesWorkshop.exportText());
    assert.strictEqual(JSON.parse(exported).usecases.length, 100, '100 scenarios must export as normalized JSON');
    const roundTrip = await page.evaluate(text => {
      const imported = window.__usecasesWorkshop.importText(text, { confirm: false });
      return { imported, identical: text === window.__usecasesWorkshop.exportText() };
    }, exported);
    assert.strictEqual(roundTrip.imported.imported, true);
    assert.strictEqual(roundTrip.identical, true, 'normalized export must round-trip byte-for-byte');

    await setValue(page, '#ucw-search', 'Browser scenario 77');
    await page.waitForFunction(() => document.querySelectorAll('#ucw-list [data-uc-id]').length === 1);
    assert.strictEqual(
      await page.$eval('#ucw-list [data-uc-id]', node => node.getAttribute('data-uc-id')),
      'UC-BROWSER-077'
    );
    await setValue(page, '#ucw-search', '');
    await page.waitForFunction(() => document.querySelectorAll('#ucw-list [data-uc-id]').length === 100);

    await page.reload({ waitUntil: 'networkidle0' });
    await waitReady(page);
    assert.strictEqual(await countDrafts(page), 100, '100 imported scenarios must survive reload');

    const atomic = await page.evaluate(() => {
      const api = window.__usecasesWorkshop;
      const beforeEnvelope = api.getEnvelopeJSON();
      const beforeStorage = window.localStorage.getItem(api.storageKey);
      const invalid = api.getSnapshot();
      invalid.usecases[1].id = invalid.usecases[0].id;
      const result = api.importText(JSON.stringify(invalid), { confirm: false });
      return {
        result,
        envelopeUnchanged: beforeEnvelope === api.getEnvelopeJSON(),
        storageUnchanged: beforeStorage === window.localStorage.getItem(api.storageKey),
      };
    });
    assert.strictEqual(atomic.result.imported, false);
    assert.strictEqual(atomic.envelopeUnchanged, true, 'failed import must leave in-memory draft byte-identical');
    assert.strictEqual(atomic.storageUnchanged, true, 'failed import must leave persisted draft byte-identical');

    const oversized = await page.evaluate(() => {
      const api = window.__usecasesWorkshop;
      const before = api.getEnvelopeJSON();
      const result = api.importText(' '.repeat(1024 * 1024 + 1), { confirm: false });
      return { imported: result.imported, unchanged: before === api.getEnvelopeJSON() };
    });
    assert.deepStrictEqual(oversized, { imported: false, unchanged: true });

    const xssMatrix = manyMatrix(100);
    xssMatrix.usecases[0].name = '<img src=x onerror="window.__ucwXss=1">';
    xssMatrix.usecases[0].story = '<script>window.__ucwXss=2</script>';
    const xssResult = await page.evaluate(matrix => {
      window.__ucwXss = 0;
      return window.__usecasesWorkshop.importText(JSON.stringify(matrix), { confirm: false });
    }, xssMatrix);
    assert.strictEqual(xssResult.imported, true);
    assert.strictEqual(
      await page.$eval('[data-uc-id="UC-BROWSER-001"] h3', node => node.textContent),
      xssMatrix.usecases[0].name
    );
    assert.strictEqual(
      await page.$$eval('#ucw-list img, #ucw-list script, #ucw-list [data-c]', nodes => nodes.length),
      0
    );
    assert.strictEqual(await page.evaluate(() => window.__ucwXss), 0, 'draft text must never execute');
    assert.strictEqual(
      await page.$$eval('#ucw-list a', links => links.every(link => !new URL(link.href).searchParams.has('nopanel'))),
      true,
      'all preview links must remain interactive'
    );

    await page.evaluate(() => {
      const api = window.__usecasesWorkshop;
      const stored = JSON.parse(window.localStorage.getItem(api.storageKey));
      stored.baseFingerprint = 'uc-v1-stale';
      window.localStorage.setItem(api.storageKey, JSON.stringify(stored));
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await waitReady(page);
    assert.strictEqual(
      await page.$eval('#ucw-conflict', node => !node.hidden),
      true,
      'source fingerprint conflict must be explicit'
    );
    assert.strictEqual((await page.evaluate(() => window.__usecasesWorkshop.getSnapshot())).usecases.length, 100);
    await page.click('#ucw-keep-local');
    await page.waitForFunction(() => document.getElementById('ucw-conflict').hidden);
    assert.strictEqual((await page.evaluate(() => window.__usecasesWorkshop.getSnapshot())).usecases.length, 100);

    page.once('dialog', dialog => dialog.accept());
    await page.click('#ucw-reset');
    await page.waitForFunction(
      expected => document.querySelectorAll('#ucw-list [data-uc-id]').length === expected,
      {},
      source.usecases.length
    );
    assert.strictEqual(await countDrafts(page), source.usecases.length, 'reset must restore the published source');

    await page.evaluate(() => {
      const api = window.__usecasesWorkshop;
      const empty = JSON.parse(api.getEnvelopeJSON());
      empty.matrix.usecases = [];
      window.localStorage.setItem(api.storageKey, JSON.stringify(empty));
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__usecasesWorkshop && window.__usecasesWorkshop.ready);
    await page.evaluate(() => window.__usecasesWorkshop.ready);
    assert.strictEqual(await countDrafts(page), 0, 'an empty in-progress draft must survive reload');
    assert.match(await page.$eval('#ucw-status', node => node.textContent), /export blocked/);
    await page.evaluate(() => window.__usecasesWorkshop.reset(false));

    const memoryPage = await browser.newPage();
    await memoryPage.evaluateOnNewDocument(() => {
      window.Storage.prototype.setItem = function () {
        throw new Error('storage unavailable');
      };
      window.Storage.prototype.getItem = function () {
        throw new Error('storage unavailable');
      };
      window.Storage.prototype.removeItem = function () {
        throw new Error('storage unavailable');
      };
    });
    await memoryPage.goto(url, { waitUntil: 'networkidle0' });
    await waitReady(memoryPage);
    assert.strictEqual(await memoryPage.$eval('#ucw-status', node => node.dataset.mode), 'memory');
    assert.match(
      await memoryPage.$eval('#ucw-status', node => node.textContent),
      /in-memory only; reload will lose changes/
    );
    await memoryPage.close();

    process.stdout.write(
      `usecases-workshop-browser-qa: ${source.usecases.length} canonical anchors, local CRUD, 100-case round-trip, conflict and safe fallback — OK\n`
    );
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
