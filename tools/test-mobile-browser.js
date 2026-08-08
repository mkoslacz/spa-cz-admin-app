#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screens = [
  'm-dashboard.html',
  'm-dashboard-en.html',
  'm-reservations.html',
  'm-reservations-en.html',
  'm-reservation-detail.html',
  'm-reservation-detail-en.html',
  'm-availability.html',
  'm-availability-en.html',
  'm-offer.html',
  'm-offer-en.html',
  'm-rate-edit.html',
  'm-rate-edit-en.html',
  'm-billing.html',
  'm-billing-en.html',
  'm-more.html',
  'm-more-en.html',
];
const defaults = {
  auth: 'in',
  access: 'full',
  connection: 'manual',
  density: 'dense',
  inv: 'many',
  hotel: 'active',
  reservation: 'RSV-10482',
  offer: 'cajkovskij-stay',
  queue: 'all',
  reservationFilter: 'all',
  offerFilter: 'all',
  billingFilter: 'pending',
};

function contentType(file) {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    }[path.extname(file)] || 'application/octet-stream'
  );
}

function startServer() {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/m-dashboard.html' : requestUrl.pathname);
    if (pathname === '/favicon.ico' || pathname === '/comments.config.json') {
      response.writeHead(204).end();
      return;
    }
    const absolute = path.resolve(root, '.' + pathname);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    try {
      const body = fs.readFileSync(absolute);
      response.writeHead(200, { 'Content-Type': contentType(absolute), 'Cache-Control': 'no-store' });
      response.end(body);
    } catch (error) {
      response.writeHead(404).end('Not found');
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function open(page, origin, screen, overrides = {}) {
  const target = new URL('/' + screen, origin);
  Object.entries({ ...defaults, ...overrides }).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') target.searchParams.set(key, value);
  });
  await page.goto(target.href, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function clickRoute(page, selector) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.$eval(selector, node => node.click()),
  ]);
}

async function currentRoute(page) {
  return page.evaluate(() => ({
    page: globalThis.location.pathname.split('/').pop(),
    query: Object.fromEntries(new URLSearchParams(globalThis.location.search)),
  }));
}

async function prototypeDomainState(page) {
  return page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('spa-cz-admin-prototype') || '{}'));
}

async function rejectLocalStorageWrites(page) {
  await page.evaluate(() => {
    globalThis.__prototypeOriginalSetItem = globalThis.Storage.prototype.setItem;
    globalThis.Storage.prototype.setItem = function rejectPrototypeWrite() {
      throw new globalThis.DOMException('Storage disabled by browser test', 'QuotaExceededError');
    };
  });
}

async function restoreLocalStorageWrites(page) {
  await page.evaluate(() => {
    globalThis.Storage.prototype.setItem = globalThis.__prototypeOriginalSetItem;
    delete globalThis.__prototypeOriginalSetItem;
  });
}

async function assertPackageDraftFlow(page, origin, languageCode) {
  const suffix = languageCode === 'en' ? '-en' : '';
  const oppositeSuffix = languageCode === 'en' ? '' : '-en';
  const oppositeLanguage = languageCode === 'en' ? 'cs' : 'en';
  const screen = `m-offer${suffix}.html`;
  const title = `Autumn reset ${languageCode.toUpperCase()}`;
  const legacyId = 'local-package-1';

  await open(page, origin, screen);
  await page.evaluate(() => globalThis.localStorage.clear());
  await page.evaluate(() => {
    globalThis.localStorage.setItem(
      'spa-cz-admin-prototype',
      JSON.stringify({
        availabilityMutations: {},
        packageDrafts: { 'local-package-1': { title: 'Legacy package', nights: 4 } },
      })
    );
  });
  await open(page, origin, `m-dashboard${suffix}.html`);
  await page.reload({ waitUntil: 'networkidle0' });
  let migratedState = await prototypeDomainState(page);
  assert(migratedState.packageDrafts[legacyId], `${languageCode}: non-package reload preserves legacy draft identity`);
  assert.deepStrictEqual(
    migratedState.availabilityMutations || {},
    {},
    `${languageCode}: legacy draft migration does not mutate availability`
  );
  await open(page, origin, `m-rate-edit${suffix}.html`, { offer: legacyId, section: 'package' });
  migratedState = await prototypeDomainState(page);
  const migratedLegacy = migratedState.packageDrafts[legacyId];
  assert.strictEqual(migratedLegacy.title, 'Legacy package', `${languageCode}: legacy draft title migrates`);
  assert.strictEqual(migratedLegacy.nights, 4, `${languageCode}: legacy draft nights migrate`);
  assert(migratedLegacy.description, `${languageCode}: legacy draft receives package content defaults`);
  assert(migratedLegacy.galleryImageIds.length, `${languageCode}: legacy draft receives gallery defaults`);
  assert(migratedLegacy.inclusions.length, `${languageCode}: legacy draft receives inclusion defaults`);
  assert(migratedLegacy.procedures.length, `${languageCode}: legacy draft receives procedure defaults`);
  assert.deepStrictEqual(
    Object.keys(migratedLegacy.settings).sort(),
    ['flexible-cancellation', 'late-arrival'],
    `${languageCode}: legacy draft receives safe setting defaults`
  );
  assert.strictEqual(migratedLegacy.roomPrices.length, 1, `${languageCode}: legacy draft receives room prices`);
  assert.strictEqual(
    Object.keys(migratedLegacy.roomPrices[0].prices).length,
    7,
    `${languageCode}: legacy draft receives seven canonical date prices`
  );
  assert.deepStrictEqual(
    await page.evaluate(() => ({
      id: document.querySelector('[data-offer-field="id"]').textContent.trim(),
      title: document.querySelector('[data-package-field="title"]').value,
      nights: document.querySelector('[data-package-field="nights"]').value,
    })),
    { id: legacyId, title: 'Legacy package', nights: '4' },
    `${languageCode}: migrated legacy draft returns to its own complete editor`
  );
  assert.deepStrictEqual(migratedState.availabilityMutations || {}, {});
  await page.evaluate(() => globalThis.localStorage.clear());
  await open(page, origin, screen);
  const availabilityBefore = (await prototypeDomainState(page)).availabilityMutations || {};
  assert.strictEqual(
    await page.$eval('[data-open-sheet="new-package-sheet"]', node => node.textContent.trim()),
    languageCode === 'en' ? 'Add package' : 'Přidat balíček',
    `${languageCode}: package creation has a visible label`
  );

  await page.click('[data-open-sheet="new-package-sheet"]');
  await page.click('[form="new-package-sheet-form"]');
  assert.strictEqual(
    await page.$eval('[data-package-create-form]', form => form.checkValidity()),
    false,
    `${languageCode}: an empty required name is invalid`
  );
  assert.deepStrictEqual(
    (await prototypeDomainState(page)).packageDrafts || {},
    {},
    `${languageCode}: invalid creation cannot persist a partial draft`
  );
  await page.$eval(
    '[data-package-create-title]',
    (input, value) => {
      input.value = value;
      input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
    },
    title
  );
  await page.$eval('[data-package-create-nights]', input => {
    input.value = '3';
    input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
  });
  assert.strictEqual(
    await page.$eval('[data-package-create-title]', input => input.value),
    title,
    `${languageCode}: complete package name is entered before submit`
  );
  await rejectLocalStorageWrites(page);
  await page.click('[form="new-package-sheet-form"]');
  assert.deepStrictEqual(
    await page.evaluate(() => ({
      page: globalThis.location.pathname.split('/').pop(),
      sheetOpen: document.querySelector('#new-package-sheet').classList.contains('open'),
      title: document.querySelector('[data-package-create-title]').value,
      nights: document.querySelector('[data-package-create-nights]').value,
      error: document.querySelector('[data-package-create-error]').textContent.trim(),
      toast: document.querySelector('.toast').classList.contains('show'),
    })),
    {
      page: screen,
      sheetOpen: true,
      title,
      nights: '3',
      error:
        languageCode === 'en'
          ? 'The draft could not be stored. The form remains open; try again.'
          : 'Koncept se nepodařilo trvale uložit. Formulář zůstává otevřený; zkuste to znovu.',
      toast: false,
    },
    `${languageCode}: failed draft persistence rolls back without navigation or false success`
  );
  assert.deepStrictEqual((await prototypeDomainState(page)).packageDrafts || {}, {});
  await restoreLocalStorageWrites(page);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
    page.click('[form="new-package-sheet-form"]'),
  ]);

  const createdRoute = await currentRoute(page);
  assert.strictEqual(createdRoute.page, `m-rate-edit${suffix}.html`, `${languageCode}: draft editor route`);
  assert.strictEqual(createdRoute.query.section, 'package', `${languageCode}: distinct package editor section`);
  assert.match(createdRoute.query.offer, /^local-package-[1-9]\d*$/, `${languageCode}: stable local identity`);
  const offerId = createdRoute.query.offer;
  assert.deepStrictEqual(
    await page.evaluate(() => ({
      identity: document.body.dataset.identityStatus,
      editorHidden: document.querySelector('[data-package-editor-surface]').hidden,
      ratesHidden: document.querySelector('[data-package-rates-surface]').hidden,
      id: document.querySelector('[data-offer-field="id"]').textContent.trim(),
      title: document.querySelector('[data-offer-field="title"]').textContent.trim(),
      status: document.querySelector('[data-offer-field="publication"]').textContent.trim(),
    })),
    {
      identity: 'found',
      editorHidden: false,
      ratesHidden: true,
      id: offerId,
      title,
      status: languageCode === 'en' ? 'Draft' : 'Koncept',
    },
    `${languageCode}: created record resolves in its own editor without fixture fallback`
  );

  let stored = await prototypeDomainState(page);
  assert.deepStrictEqual(Object.keys(stored.packageDrafts), [offerId], `${languageCode}: one normalized draft`);
  assert.strictEqual(stored.packageDrafts[offerId].title, title, `${languageCode}: normalized draft title`);
  assert.strictEqual(stored.packageDrafts[offerId].nights, 3, `${languageCode}: normalized draft nights`);
  assert(stored.packageDrafts[offerId].description, `${languageCode}: complete draft content`);
  assert.strictEqual(stored.packageDrafts[offerId].roomPrices.length, 1, `${languageCode}: draft room coverage`);
  assert.deepStrictEqual(
    stored.availabilityMutations || {},
    availabilityBefore,
    `${languageCode}: package creation does not mutate room availability`
  );

  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await page.evaluate(() => ({
      identity: document.body.dataset.identityStatus,
      id: document.querySelector('[data-offer-field="id"]').textContent.trim(),
      title: document.querySelector('[data-offer-field="title"]').textContent.trim(),
      editorHidden: document.querySelector('[data-package-editor-surface]').hidden,
    })),
    { identity: 'found', id: offerId, title, editorHidden: false },
    `${languageCode}: draft identity survives reload`
  );

  await clickRoute(page, `.langswitch a[data-lang="${oppositeLanguage}"]`);
  const translatedRoute = await currentRoute(page);
  assert.strictEqual(translatedRoute.page, `m-rate-edit${oppositeSuffix}.html`, `${languageCode}: language route`);
  assert.strictEqual(translatedRoute.query.offer, offerId, `${languageCode}: identity survives language switch`);
  assert.strictEqual(translatedRoute.query.section, 'package', `${languageCode}: editor survives language switch`);
  assert.strictEqual(
    await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()),
    title,
    `${languageCode}: neutral draft title survives language switch`
  );
  assert.strictEqual(
    await page.$eval('[data-offer-field="id"]', node => node.textContent.trim()),
    offerId,
    `${languageCode}: selected ID survives language switch`
  );

  await clickRoute(page, 'a.back-link');
  assert.strictEqual(
    (await currentRoute(page)).page,
    `m-offer${oppositeSuffix}.html`,
    `${languageCode}: return to list`
  );
  assert.strictEqual(
    await page.$eval(`[data-offer-id="${offerId}"] h2`, node => node.textContent.trim()),
    title,
    `${languageCode}: created card survives return to list`
  );
  assert.strictEqual(
    await page.$eval('[data-offer-filter-count="all"]', node => node.textContent.trim()),
    '5',
    `${languageCode}: list count includes created draft`
  );
  assert.strictEqual(
    await page.$eval('[data-offer-filter-count="missing"]', node => node.textContent.trim()),
    '2',
    `${languageCode}: draft remains visible in missing-rates filter`
  );
  await clickRoute(page, `[data-offer-id="${offerId}"] [data-created-offer-edit]`);
  assert.strictEqual((await currentRoute(page)).query.offer, offerId, `${languageCode}: card reopens exact draft`);
  assert.strictEqual(
    await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()),
    title,
    `${languageCode}: reopened editor never falls back to first fixture`
  );

  stored = await prototypeDomainState(page);
  assert.deepStrictEqual(stored.availabilityMutations || {}, availabilityBefore);
}

async function assertPackageEditorFlow(page, origin, languageCode) {
  const suffix = languageCode === 'en' ? '-en' : '';
  const oppositeSuffix = languageCode === 'en' ? '' : '-en';
  const oppositeLanguage = languageCode === 'en' ? 'cs' : 'en';
  const listScreen = `m-offer${suffix}.html`;
  const editorScreen = `m-rate-edit${suffix}.html`;
  const packageId = 'spa-week';
  const firstPackageId = 'cajkovskij-stay';
  const edited = {
    title: `Restored spa week ${languageCode.toUpperCase()}`,
    description: `Selected package description ${languageCode.toUpperCase()}`,
    inclusions: [`Full board ${languageCode.toUpperCase()}`, `Daily pool ${languageCode.toUpperCase()}`],
    nights: 8,
    meal: `Full board ${languageCode.toUpperCase()}`,
    procedures: [`Mineral bath ${languageCode.toUpperCase()}`, `Massage ${languageCode.toUpperCase()}`],
  };
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
  const expectedPrices = {
    double: Object.fromEntries(dates.map((date, index) => [date, 21000 + index * 100])),
    suite: Object.fromEntries(dates.map((date, index) => [date, 23000 + index * 100])),
  };

  await open(page, origin, listScreen);
  await page.evaluate(() => globalThis.localStorage.clear());
  await open(page, origin, listScreen);
  const firstBefore = await page.$eval(`[data-offer-id="${firstPackageId}"]`, card => ({
    title: card.querySelector('[data-offer-card-title]').textContent.trim(),
    meal: card.querySelector('[data-offer-card-meal]').textContent.trim(),
    publication: card.querySelector('[data-offer-card-publication]').textContent.trim(),
  }));
  const availabilityBefore = (await prototypeDomainState(page)).availabilityMutations || {};
  const packageActions = await page.$eval(`[data-offer-id="${packageId}"]`, card => ({
    edit: card.querySelector('[data-offer-card-edit]').textContent.trim(),
    rates: card.querySelector('[data-offer-card-rates]').textContent.trim(),
    distinct: card.querySelector('[data-offer-card-edit]') !== card.querySelector('[data-offer-card-rates]'),
    editHref: card.querySelector('[data-offer-card-edit]').href,
    ratesHref: card.querySelector('[data-offer-card-rates]').href,
  }));
  assert.deepStrictEqual(
    { edit: packageActions.edit, rates: packageActions.rates, distinct: packageActions.distinct },
    {
      edit: languageCode === 'en' ? 'Edit package' : 'Upravit balíček',
      rates: languageCode === 'en' ? 'Rates' : 'Ceny',
      distinct: true,
    },
    `${languageCode}: fixture card has separate named actions`
  );
  assert.strictEqual(new URL(packageActions.editHref).searchParams.get('offer'), packageId);
  assert.strictEqual(new URL(packageActions.editHref).searchParams.get('section'), 'package');
  assert.strictEqual(new URL(packageActions.ratesHref).searchParams.get('offer'), packageId);
  assert.strictEqual(new URL(packageActions.ratesHref).searchParams.get('section'), 'rates');

  await clickRoute(page, `[data-offer-id="${packageId}"] [data-offer-card-edit]`);
  const selectedRoute = await currentRoute(page);
  assert.strictEqual(selectedRoute.page, editorScreen, `${languageCode}: edit screen`);
  assert.strictEqual(selectedRoute.query.offer, packageId, `${languageCode}: edit route selected ID`);
  assert.strictEqual(selectedRoute.query.section, 'package', `${languageCode}: editor section`);
  assert.strictEqual(await page.$eval('[data-offer-field="id"]', node => node.textContent.trim()), packageId);
  assert.strictEqual(
    await page.$eval('[data-package-field="title"]', input => input.value),
    languageCode === 'en' ? 'Spa week' : 'Lázeňský týden',
    `${languageCode}: editor hydrates the selected fixture rather than the first fixture`
  );
  const mediaContract = await page.$eval('[data-package-editor-surface]', editor => ({
    fileInputs: editor.querySelectorAll('input[type="file"]').length,
    copy: editor.textContent,
  }));
  assert.strictEqual(mediaContract.fileInputs, 0, `${languageCode}: no simulated upload control`);
  assert.doesNotMatch(mediaContract.copy, /upload|nahrát/i, `${languageCode}: existing-gallery selection only`);

  const beforeInvalid = (await prototypeDomainState(page)).packageMutations || {};
  await page.$eval('[data-package-field="title"]', input => {
    input.value = '';
  });
  await page.$eval('[data-package-room-price][data-room-type-id="double"][data-rate-date-id="2026-10-12"]', input => {
    input.value = '';
  });
  assert.strictEqual(
    await page.$eval('[data-package-editor-form]', form => form.checkValidity()),
    false,
    `${languageCode}: native form validation rejects incomplete package data`
  );
  await page.click('[data-package-save]');
  assert.deepStrictEqual(
    (await prototypeDomainState(page)).packageMutations || {},
    beforeInvalid,
    `${languageCode}: native validation prevents an invalid click save`
  );
  await page.$eval('[data-package-editor-form]', form =>
    form.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }))
  );
  await page.waitForFunction(() => document.querySelector('[data-package-editor-error]').hidden === false);
  assert.deepStrictEqual(
    (await prototypeDomainState(page)).packageMutations || {},
    beforeInvalid,
    `${languageCode}: invalid save is atomic in storage`
  );
  assert.strictEqual(
    await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()),
    languageCode === 'en' ? 'Spa week' : 'Lázeňský týden',
    `${languageCode}: invalid save does not change rendered package`
  );

  await page.evaluate(
    ({ next, prices }) => {
      const form = document.querySelector('[data-package-editor-form]');
      form.querySelector('[data-package-field="title"]').value = next.title;
      form.querySelector('[data-package-field="description"]').value = next.description;
      form.querySelector('[data-package-field="inclusions"]').value = next.inclusions.join('\n');
      form.querySelector('[data-package-field="nights"]').value = String(next.nights);
      form.querySelector('[data-package-field="meal"]').value = next.meal;
      form.querySelector('[data-package-field="publication"]').value = 'draft';
      form.querySelector('[data-package-field="procedures"]').value = next.procedures.join('\n');
      form.querySelectorAll('[data-package-gallery-id]').forEach(control => {
        control.checked = ['spa-pool', 'treatment-room'].includes(control.dataset.packageGalleryId);
      });
      form.querySelectorAll('[data-package-setting-id]').forEach(control => {
        control.checked = control.dataset.packageSettingId === 'flexible-cancellation';
      });
      form.querySelectorAll('[data-package-room-coverage]').forEach(control => {
        control.checked = ['double', 'suite'].includes(control.dataset.packageRoomCoverage);
      });
      form.querySelectorAll('[data-package-room-price]').forEach(input => {
        const roomPrices = prices[input.dataset.roomTypeId];
        input.value = roomPrices ? String(roomPrices[input.dataset.rateDateId]) : '';
      });
    },
    { next: edited, prices: expectedPrices }
  );
  const validForm = await page.$eval('[data-package-editor-form]', form => ({
    valid: form.checkValidity(),
    invalid: [...form.elements]
      .filter(control => typeof control.checkValidity === 'function' && !control.checkValidity())
      .map(control => ({
        field: control.dataset.packageField || control.dataset.roomTypeId || control.dataset.packageGalleryId,
        date: control.dataset.rateDateId || '',
        message: control.validationMessage,
        value: control.value,
      })),
  }));
  assert.deepStrictEqual(validForm, { valid: true, invalid: [] }, `${languageCode}: complete editor is natively valid`);
  const saveTarget = await page.$eval('[data-package-save]', button => {
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      hit: Boolean(top?.closest('[data-package-save]')),
    };
  });
  assert(saveTarget.hit, `${languageCode}: package save has a visible clickable point`);
  await page.mouse.click(saveTarget.x, saveTarget.y);
  const postSave = await page.evaluate(() => {
    const state = JSON.parse(globalThis.localStorage.getItem('spa-cz-admin-prototype') || '{}');
    const error = document.querySelector('[data-package-editor-error]');
    return {
      title: state.packageMutations?.['spa-week']?.title || '',
      errorHidden: error.hidden,
      error: error.textContent.trim(),
      access: document.body.dataset.access,
      connection: document.body.dataset.connection,
    };
  });
  assert.strictEqual(
    postSave.title,
    edited.title,
    `${languageCode}: real click save failed: ${JSON.stringify(postSave)}`
  );

  let stored = await prototypeDomainState(page);
  const mutation = stored.packageMutations[packageId];
  assert.deepStrictEqual(
    {
      title: mutation.title,
      description: mutation.description,
      galleryImageIds: mutation.galleryImageIds,
      inclusions: mutation.inclusions,
      nights: mutation.nights,
      meal: mutation.meal,
      active: mutation.active,
      procedures: mutation.procedures,
      settings: mutation.settings,
    },
    {
      ...edited,
      galleryImageIds: ['spa-pool', 'treatment-room'],
      active: false,
      settings: { 'flexible-cancellation': true, 'late-arrival': false },
    },
    `${languageCode}: selected fixture persists all content and settings`
  );
  assert.deepStrictEqual(
    mutation.roomPrices,
    [
      { roomTypeId: 'double', eligible: true, prices: expectedPrices.double },
      { roomTypeId: 'suite', eligible: true, prices: expectedPrices.suite },
    ],
    `${languageCode}: coverage rebuild removes orphan prices and keeps exact date keys`
  );
  assert.strictEqual(stored.packageMutations[firstPackageId], undefined, `${languageCode}: first fixture unchanged`);
  assert.deepStrictEqual(
    stored.availabilityMutations || {},
    availabilityBefore,
    `${languageCode}: package save cannot mutate availability`
  );
  assert.strictEqual(await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()), edited.title);

  await page.waitForFunction(() => !document.querySelector('.toast').classList.contains('show'));
  const failedTitle = `UNSTORED ${languageCode.toUpperCase()}`;
  await page.$eval(
    '[data-package-field="title"]',
    (input, value) => {
      input.value = value;
    },
    failedTitle
  );
  await rejectLocalStorageWrites(page);
  const failedSaveTarget = await page.$eval('[data-package-save]', button => {
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return { x, y, hit: Boolean(document.elementFromPoint(x, y)?.closest('[data-package-save]')) };
  });
  assert(failedSaveTarget.hit, `${languageCode}: failed-save test uses a visible package action`);
  await page.mouse.click(failedSaveTarget.x, failedSaveTarget.y);
  assert.deepStrictEqual(
    await page.evaluate(() => {
      const state = JSON.parse(globalThis.localStorage.getItem('spa-cz-admin-prototype') || '{}');
      return {
        storedTitle: state.packageMutations['spa-week'].title,
        renderedTitle: document.querySelector('[data-offer-field="title"]').textContent.trim(),
        formTitle: document.querySelector('[data-package-field="title"]').value,
        error: document.querySelector('[data-package-editor-error]').textContent.trim(),
        toast: document.querySelector('.toast').classList.contains('show'),
      };
    }),
    {
      storedTitle: edited.title,
      renderedTitle: edited.title,
      formTitle: failedTitle,
      error:
        languageCode === 'en'
          ? 'Changes could not be stored. The form remains open; try again.'
          : 'Změny se nepodařilo trvale uložit. Formulář zůstává otevřený; zkuste to znovu.',
      toast: false,
    },
    `${languageCode}: package persistence failure rolls back without false success`
  );
  await restoreLocalStorageWrites(page);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.strictEqual((await prototypeDomainState(page)).packageMutations[packageId].title, edited.title);
  assert.strictEqual(
    await page.$eval('[data-package-field="title"]', input => input.value),
    edited.title,
    `${languageCode}: reload restores the last durable package value after failed save`
  );

  await clickRoute(page, '[data-offer-route="rates"]');
  assert.strictEqual((await currentRoute(page)).query.offer, packageId, `${languageCode}: own rates route`);
  assert.deepStrictEqual(
    await page.$$eval('.rate-matrix tbody tr', rows => ({
      roomTypeIds: rows.filter(row => !row.hidden).map(row => row.dataset.roomTypeId),
      firstPrices: Object.fromEntries(
        rows
          .filter(row => !row.hidden)
          .map(row => [row.dataset.roomTypeId, row.querySelector('[data-rate-date-id="2026-10-12"]').value])
      ),
      readOnly: rows
        .filter(row => !row.hidden)
        .every(row => [...row.querySelectorAll('input')].every(input => input.readOnly)),
    })),
    { roomTypeIds: ['double', 'suite'], firstPrices: { double: '21000', suite: '23000' }, readOnly: true },
    `${languageCode}: selected package rates render its saved coverage and prices`
  );
  assert.strictEqual(await page.$('[data-save-rates]'), null, `${languageCode}: rates expose no fake save action`);
  assert.strictEqual(
    await page.$eval('[data-rate-edit-link]', link => new URL(link.href).searchParams.get('offer')),
    packageId,
    `${languageCode}: read-only rates link to the selected package editor`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  assert.strictEqual(await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()), edited.title);
  await clickRoute(page, '[data-rate-edit-link]');
  assert.strictEqual((await currentRoute(page)).query.offer, packageId);
  assert.strictEqual((await currentRoute(page)).query.section, 'package');

  await open(page, origin, `m-dashboard${suffix}.html`);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.strictEqual(
    (await prototypeDomainState(page)).packageMutations[packageId].title,
    edited.title,
    `${languageCode}: unrelated screen and reload preserve package overlays`
  );
  await open(page, origin, editorScreen, { offer: packageId, section: 'rates' });
  assert.strictEqual(await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()), edited.title);
  await clickRoute(page, 'a.back-link');
  assert.deepStrictEqual(
    await page.$eval(`[data-offer-id="${packageId}"]`, card => ({
      title: card.querySelector('[data-offer-card-title]').textContent.trim(),
      meal: card.querySelector('[data-offer-card-meal]').textContent.trim(),
      publication: card.querySelector('[data-offer-card-publication]').textContent.trim(),
    })),
    { title: edited.title, meal: edited.meal, publication: languageCode === 'en' ? 'Draft' : 'Koncept' },
    `${languageCode}: own card renders saved package values`
  );
  assert.deepStrictEqual(
    await page.$eval(`[data-offer-id="${firstPackageId}"]`, card => ({
      title: card.querySelector('[data-offer-card-title]').textContent.trim(),
      meal: card.querySelector('[data-offer-card-meal]').textContent.trim(),
      publication: card.querySelector('[data-offer-card-publication]').textContent.trim(),
    })),
    firstBefore,
    `${languageCode}: first package card remains byte-for-byte unchanged`
  );
  assert.strictEqual(await page.$eval('[data-offer-filter-count="active"]', node => node.textContent.trim()), '2');

  await clickRoute(page, `[data-offer-id="${packageId}"] [data-offer-card-edit]`);
  await clickRoute(page, `.langswitch a[data-lang="${oppositeLanguage}"]`);
  const translated = await currentRoute(page);
  assert.strictEqual(translated.page, `m-rate-edit${oppositeSuffix}.html`);
  assert.strictEqual(translated.query.offer, packageId);
  assert.strictEqual(translated.query.section, 'package');
  assert.strictEqual(await page.$eval('[data-package-field="title"]', input => input.value), edited.title);

  const mutationBeforeRestrictions = (await prototypeDomainState(page)).packageMutations[packageId];
  for (const restricted of [
    { access: 'read', connection: 'manual', label: 'read only' },
    { access: 'full', connection: 'chm', label: 'Channel Manager' },
  ]) {
    await open(page, origin, `m-rate-edit${oppositeSuffix}.html`, {
      offer: packageId,
      section: 'package',
      access: restricted.access,
      connection: restricted.connection,
    });
    assert.strictEqual(await page.$eval('[data-package-save]', button => button.disabled), true);
    assert.strictEqual(await page.$eval('[data-package-field="title"]', input => input.disabled), true);
    await page.evaluate(() => {
      const form = document.querySelector('[data-package-editor-form]');
      const title = form.querySelector('[data-package-field="title"]');
      title.disabled = false;
      title.value = 'FORBIDDEN PACKAGE WRITE';
      form.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.deepStrictEqual(
      (await prototypeDomainState(page)).packageMutations[packageId],
      mutationBeforeRestrictions,
      `${languageCode}: ${restricted.label} runtime rejects package writes`
    );
  }
  stored = await prototypeDomainState(page);
  assert.deepStrictEqual(stored.availabilityMutations || {}, availabilityBefore);

  const corruptedState = JSON.parse(JSON.stringify(stored));
  corruptedState.access = 'full';
  corruptedState.connection = 'manual';
  corruptedState.packageMutations[packageId] = {
    ...mutationBeforeRestrictions,
    galleryImageIds: ['spa-pool', 'spa-pool'],
    roomPrices: [
      {
        roomTypeId: 'unknown-room',
        eligible: true,
        prices: Object.fromEntries(dates.map(date => [date, -1])),
      },
    ],
  };
  await page.evaluate(nextState => {
    globalThis.localStorage.setItem('spa-cz-admin-prototype', JSON.stringify(nextState));
  }, corruptedState);
  await open(page, origin, `m-rate-edit${oppositeSuffix}.html`, {
    offer: packageId,
    section: 'package',
    access: 'full',
    connection: 'manual',
  });
  assert.strictEqual(
    (await prototypeDomainState(page)).packageMutations[packageId],
    undefined,
    `${languageCode}: duplicate gallery IDs, unknown room refs and negative prices are rejected`
  );
  assert.strictEqual(
    await page.$eval('[data-package-field="title"]', input => input.value),
    oppositeLanguage === 'en' ? 'Spa week' : 'Lázeňský týden',
    `${languageCode}: rejected overlay restores the exact fixture instead of another record`
  );
  assert.deepStrictEqual((await prototypeDomainState(page)).availabilityMutations || {}, availabilityBefore);
}

async function waitForCount(page, selector, count) {
  await page.waitForFunction(
    (target, expected) => document.querySelector(target)?.textContent.trim() === String(expected),
    {},
    selector,
    count
  );
}

async function availabilitySnapshot(page, availabilityId) {
  return page.$eval(`.availability-cell[data-availability-id="${availabilityId}"]`, cell => ({
    text: cell.querySelector('[data-availability-control]').textContent.trim(),
    stopped: cell.classList.contains('stop'),
  }));
}

async function openAvailabilityEditor(page, availabilityId) {
  await page.click(`.availability-cell[data-availability-id="${availabilityId}"] [data-availability-control]`);
  await page.waitForSelector('#availability-cell-sheet.open');
}

async function setAvailabilityUnits(page, availabilityId, value) {
  await openAvailabilityEditor(page, availabilityId);
  await page.select('[data-availability-cell-action]', 'units');
  await page.$eval(
    '[data-availability-cell-units]',
    (input, nextValue) => {
      input.value = nextValue;
      input.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
    },
    String(value)
  );
  await page.click('[form="availability-cell-form"]');
}

async function availabilityMutationState(page) {
  return page.evaluate(() => {
    const stored = JSON.parse(globalThis.localStorage.getItem('spa-cz-admin-prototype') || '{}');
    return stored.availabilityMutations || {};
  });
}

async function availabilitySnapshots(page, availabilityIds) {
  return Object.fromEntries(
    await Promise.all(
      availabilityIds.map(async availabilityId => [availabilityId, await availabilitySnapshot(page, availabilityId)])
    )
  );
}

async function setBulkDate(page, selector, value) {
  await page.$eval(
    selector,
    (input, nextValue) => {
      input.value = nextValue;
      input.dispatchEvent(new globalThis.Event('change', { bubbles: true }));
    },
    value
  );
}

async function openAvailabilityBulkEditor(page) {
  const before = await page.$eval('[data-availability-bulk-open]', control => ({
    disabled: control.disabled,
    access: document.body.dataset.access,
    connection: document.body.dataset.connection,
  }));
  assert.deepStrictEqual(before, { disabled: false, access: 'full', connection: 'manual' });
  const box = await page.$eval('[data-availability-bulk-open]', control => {
    control.scrollIntoView({ block: 'center' });
    const rect = control.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      panels: [...document.querySelectorAll('.proto-tools, aside.proto-comments-tools')].map(panel => {
        const panelRect = panel.getBoundingClientRect();
        return { left: panelRect.left, right: panelRect.right, top: panelRect.top, bottom: panelRect.bottom };
      }),
    };
  });
  const clickPoint = { x: box.x + 24, y: box.y + box.height / 2 };
  assert(clickPoint.x >= box.x && clickPoint.x <= box.x + box.width, 'bulk click x is inside the control');
  assert(clickPoint.y >= box.y && clickPoint.y <= box.y + box.height, 'bulk click y is inside the control');
  box.panels.forEach(panel => {
    assert(
      !(
        clickPoint.x >= panel.left &&
        clickPoint.x <= panel.right &&
        clickPoint.y >= panel.top &&
        clickPoint.y <= panel.bottom
      ),
      'bulk click point remains visible outside review and comments panels'
    );
  });
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await page.waitForFunction(() => document.querySelector('#availability-sheet').classList.contains('open'), {
    timeout: 5000,
  });
}

async function assertRestrictedAvailability(page, origin, screen, overrides, label) {
  const availabilityId = 'double:2026-10-13';
  await open(page, origin, screen, overrides);
  const bypass = await page.evaluate(key => {
    const cell = document.querySelector(`.availability-cell[data-availability-id="${key}"]`);
    const control = cell.querySelector('[data-availability-control]');
    const disabled = control.disabled;
    control.disabled = false;
    control.click();
    const form = document.querySelector('[data-availability-cell-form]');
    form.dataset.availabilityId = key;
    form.querySelector('[data-availability-cell-action]').value = 'units';
    form.querySelector('[data-availability-cell-units]').value = '2';
    form.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    const bulkControl = document.querySelector('[data-availability-bulk-open]');
    const bulkDisabled = bulkControl.disabled;
    bulkControl.disabled = false;
    bulkControl.click();
    const bulkForm = document.querySelector('[data-availability-bulk-form]');
    bulkForm.querySelector('[data-availability-bulk-action]').value = 'units';
    bulkForm.querySelector('[data-availability-bulk-room]').value = 'double';
    bulkForm.querySelector('[data-availability-bulk-from]').value = '2026-10-16';
    bulkForm.querySelector('[data-availability-bulk-to]').value = '2026-10-17';
    bulkForm.querySelector('[data-availability-bulk-units]').value = '3';
    bulkForm.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    return {
      disabled,
      sheetOpen: document.querySelector('#availability-cell-sheet').classList.contains('open'),
      bulkDisabled,
      bulkSheetOpen: document.querySelector('#availability-sheet').classList.contains('open'),
    };
  }, availabilityId);
  assert.strictEqual(bypass.disabled, true, `${label}: cell control disabled`);
  assert.strictEqual(bypass.sheetOpen, false, `${label}: runtime handler refuses editor`);
  assert.strictEqual(bypass.bulkDisabled, true, `${label}: bulk control disabled`);
  assert.strictEqual(bypass.bulkSheetOpen, false, `${label}: runtime handler refuses bulk editor`);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '4', stopped: false },
    `${label}: forced runtime submit does not persist`
  );
  assert.deepStrictEqual(await availabilityMutationState(page), {}, `${label}: no forced bulk mutation persists`);
}

async function assertBulkAvailabilityFlow(page, origin, lang) {
  const suffix = lang === 'en' ? '-en' : '';
  const screen = `m-availability${suffix}.html`;
  const numericIds = ['double:2026-10-16', 'double:2026-10-17'];
  const numericUnselectedIds = ['double:2026-10-15', 'double:2026-10-18', 'suite:2026-10-16'];
  await open(page, origin, screen);
  await page.evaluate(() => globalThis.localStorage.clear());
  await open(page, origin, screen);
  const numericBefore = await availabilitySnapshots(page, numericIds);
  const numericUnselectedBefore = await availabilitySnapshots(page, numericUnselectedIds);

  await openAvailabilityBulkEditor(page);
  const labels = await page.evaluate(() => ({
    title: document.querySelector('#availability-sheet h2').textContent.trim(),
    actions: [...document.querySelector('[data-availability-bulk-action]').options].map(option =>
      option.textContent.trim()
    ),
    rooms: [...document.querySelector('[data-availability-bulk-room]').options].map(option =>
      option.textContent.trim()
    ),
    count: document.querySelector('[data-availability-bulk-count]').textContent.trim(),
    unitsHidden: document.querySelector('[data-availability-bulk-units-field]').hidden,
  }));
  assert.match(labels.title, lang === 'en' ? /Bulk availability/ : /Hromadná změna dostupnosti/);
  assert.deepStrictEqual(
    labels.actions,
    lang === 'en' ? ['Set available units', 'Stop sell'] : ['Nastavit volné jednotky', 'Nastavit stop prodej'],
    `${lang}: localized bulk actions`
  );
  assert(labels.rooms.includes(lang === 'en' ? 'All room types' : 'Všechny typy pokojů'));
  assert(labels.rooms.includes(lang === 'en' ? 'Double' : 'Dvoulůžkový'));
  assert.strictEqual(labels.count, '2', `${lang}: default Double inclusive count`);
  assert.strictEqual(labels.unitsHidden, false, `${lang}: numeric action shows numeric input`);

  await setBulkDate(page, '[data-availability-bulk-from]', '2026-10-18');
  await setBulkDate(page, '[data-availability-bulk-to]', '2026-10-17');
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-count]', node => node.textContent.trim()),
    '0',
    `${lang}: reversed range affects zero cells`
  );
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-error]', node => !node.hidden && node.textContent.trim().length > 0),
    true,
    `${lang}: reversed range shows an error`
  );
  await page.click('[form="availability-form"]');
  assert.deepStrictEqual(await availabilityMutationState(page), {}, `${lang}: reversed range cannot mutate state`);

  await setBulkDate(page, '[data-availability-bulk-from]', '2026-10-16');
  await setBulkDate(page, '[data-availability-bulk-to]', '2026-10-17');
  await page.$eval('[data-availability-bulk-units]', input => {
    input.value = '256';
  });
  await page.click('[form="availability-form"]');
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-error]', node => !node.hidden && node.textContent.trim().length > 0),
    true,
    `${lang}: bulk units enforce 0–255`
  );
  assert.deepStrictEqual(await availabilityMutationState(page), {}, `${lang}: invalid units preserve state`);

  await page.$eval('[data-availability-bulk-units]', input => {
    input.value = '3';
  });
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-count]', node => node.textContent.trim()),
    '2',
    `${lang}: Double 16–17 preview count`
  );
  await rejectLocalStorageWrites(page);
  await page.click('[form="availability-form"]');
  assert.strictEqual(
    await page.$eval('#availability-sheet', sheet => sheet.classList.contains('open')),
    true,
    `${lang}: failed bulk persistence keeps the editor open`
  );
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-error]', node => !node.hidden && node.textContent.trim().length > 0),
    true,
    `${lang}: failed bulk persistence shows a concrete error`
  );
  assert.strictEqual(await page.$eval('.toast', node => node.classList.contains('show')), false);
  assert.deepStrictEqual(
    await availabilityMutationState(page),
    {},
    `${lang}: failed bulk persistence rolls back state`
  );
  assert.deepStrictEqual(
    await availabilitySnapshots(page, numericIds),
    numericBefore,
    `${lang}: failed bulk persistence does not change rendered cells`
  );
  await restoreLocalStorageWrites(page);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilityMutationState(page),
    {},
    `${lang}: failed bulk write stays absent after reload`
  );
  assert.deepStrictEqual(await availabilitySnapshots(page, numericIds), numericBefore);
  await openAvailabilityBulkEditor(page);
  await page.select('[data-availability-bulk-action]', 'units');
  await page.select('[data-availability-bulk-room]', 'double');
  await setBulkDate(page, '[data-availability-bulk-from]', '2026-10-16');
  await setBulkDate(page, '[data-availability-bulk-to]', '2026-10-17');
  await page.$eval('[data-availability-bulk-units]', input => {
    input.value = '3';
  });
  await page.click('[form="availability-form"]');
  await page.waitForFunction(
    () => document.querySelector('#availability-sheet').getAttribute('aria-hidden') === 'true'
  );
  for (const availabilityId of numericIds) {
    assert.deepStrictEqual(
      await availabilitySnapshot(page, availabilityId),
      { text: '3', stopped: false },
      `${lang}: numeric bulk changes ${availabilityId}`
    );
  }
  assert.deepStrictEqual(
    await availabilitySnapshots(page, numericUnselectedIds),
    numericUnselectedBefore,
    `${lang}: numeric bulk leaves neighboring and unselected cells unchanged`
  );
  assert.deepStrictEqual(
    Object.keys(await availabilityMutationState(page)).sort(),
    numericIds.slice().sort(),
    `${lang}: numeric bulk writes exactly two keys`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshots(page, numericUnselectedIds),
    numericUnselectedBefore,
    `${lang}: numeric unselected cells stay unchanged after reload`
  );
  for (const availabilityId of numericIds) {
    assert.deepStrictEqual(
      await availabilitySnapshot(page, availabilityId),
      { text: '3', stopped: false },
      `${lang}: numeric bulk survives reload for ${availabilityId}`
    );
  }

  await page.evaluate(() => globalThis.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  const allRoomIds = await page.$$eval('.availability-cell', cells =>
    cells
      .filter(cell => ['2026-10-17', '2026-10-18'].includes(cell.dataset.dateId))
      .map(cell => cell.dataset.availabilityId)
  );
  const stopSellUnselectedIds = ['double:2026-10-16', 'double:2026-10-19', 'family:2026-10-16'];
  const stopSellUnselectedBefore = await availabilitySnapshots(page, stopSellUnselectedIds);
  await openAvailabilityBulkEditor(page);
  await page.select('[data-availability-bulk-action]', 'stopSell');
  await page.select('[data-availability-bulk-room]', 'all');
  await setBulkDate(page, '[data-availability-bulk-from]', '2026-10-17');
  await setBulkDate(page, '[data-availability-bulk-to]', '2026-10-18');
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-units-field]', node => node.hidden),
    true,
    `${lang}: stop sell hides numeric input`
  );
  assert.strictEqual(
    await page.$eval('[data-availability-bulk-count]', node => node.textContent.trim()),
    '10',
    `${lang}: all rooms over two dates previews ten cells`
  );
  await page.click('[form="availability-form"]');
  await page.waitForFunction(
    () => document.querySelector('#availability-sheet').getAttribute('aria-hidden') === 'true'
  );
  assert.strictEqual(allRoomIds.length, 10, `${lang}: five rooms over two dates`);
  for (const availabilityId of allRoomIds) {
    assert.deepStrictEqual(
      await availabilitySnapshot(page, availabilityId),
      { text: '×', stopped: true },
      `${lang}: all-room stop sell changes ${availabilityId}`
    );
  }
  assert.deepStrictEqual(
    Object.keys(await availabilityMutationState(page)).sort(),
    allRoomIds.slice().sort(),
    `${lang}: all-room stop sell writes exactly ten selected keys`
  );
  assert.deepStrictEqual(
    await availabilitySnapshots(page, stopSellUnselectedIds),
    stopSellUnselectedBefore,
    `${lang}: all-room stop sell leaves dates outside the range unchanged`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  for (const availabilityId of allRoomIds) {
    assert.deepStrictEqual(
      await availabilitySnapshot(page, availabilityId),
      { text: '×', stopped: true },
      `${lang}: all-room stop sell survives reload for ${availabilityId}`
    );
  }
  assert.deepStrictEqual(
    await availabilitySnapshots(page, stopSellUnselectedIds),
    stopSellUnselectedBefore,
    `${lang}: unselected dates stay unchanged after stop-sell reload`
  );

  await page.evaluate(() => globalThis.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await openAvailabilityBulkEditor(page);
  await page.$eval('[data-availability-bulk-units]', input => {
    input.value = '0';
  });
  await page.click('[form="availability-form"]');
  await page.reload({ waitUntil: 'networkidle0' });
  for (const availabilityId of numericIds) {
    assert.deepStrictEqual(
      await availabilitySnapshot(page, availabilityId),
      { text: '0', stopped: false },
      `${lang}: bulk numeric zero remains distinct from stop sell after reload`
    );
  }
  const zeroMutations = await availabilityMutationState(page);
  numericIds.forEach(availabilityId => {
    assert.deepStrictEqual(
      zeroMutations[availabilityId],
      { type: 'units', value: 0 },
      `${lang}: bulk zero uses numeric mutation semantics for ${availabilityId}`
    );
  });
}

async function assertSingleAvailabilityFlow(page, origin, lang) {
  const suffix = lang === 'en' ? '-en' : '';
  const screen = `m-availability${suffix}.html`;
  const availabilityId = 'double:2026-10-12';
  const roomName = lang === 'en' ? 'Double' : 'Dvoulůžkový';
  await open(page, origin, screen);
  await page.evaluate(() => globalThis.localStorage.clear());
  await open(page, origin, screen);
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '4', stopped: false },
    `${lang}: initial numeric state`
  );

  await openAvailabilityEditor(page, availabilityId);
  const context = await page.evaluate(() => ({
    title: document.querySelector('#availability-cell-sheet h2').textContent.trim(),
    room: document.querySelector('[data-availability-cell-room]').textContent.trim(),
    date: document.querySelector('[data-availability-cell-date]').textContent.trim(),
    current: document.querySelector('[data-availability-cell-current]').textContent.trim(),
  }));
  assert.match(context.title, lang === 'en' ? /Set availability/ : /Nastavit dostupnost/);
  assert.strictEqual(context.room, roomName, `${lang}: room context`);
  assert.match(context.date, /12.*2026/, `${lang}: date context`);
  assert.match(context.current, /^4\s/, `${lang}: current state context`);

  await page.$eval('[data-availability-cell-units]', input => {
    input.value = '256';
  });
  await page.click('[form="availability-cell-form"]');
  assert.strictEqual(
    await page.$eval('[data-availability-cell-error]', node => !node.hidden && node.textContent.trim().length > 0),
    true,
    `${lang}: visible 0–255 validation`
  );
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '4', stopped: false },
    `${lang}: invalid value preserves state`
  );

  await page.$eval('[data-availability-cell-units]', input => {
    input.value = '3';
  });
  await rejectLocalStorageWrites(page);
  await page.click('[form="availability-cell-form"]');
  assert.strictEqual(
    await page.$eval('#availability-cell-sheet', sheet => sheet.classList.contains('open')),
    true,
    `${lang}: failed cell persistence keeps the editor open`
  );
  assert.strictEqual(
    await page.$eval('[data-availability-cell-error]', node => !node.hidden && node.textContent.trim().length > 0),
    true,
    `${lang}: failed cell persistence shows a concrete error`
  );
  assert.strictEqual(await page.$eval('.toast', node => node.classList.contains('show')), false);
  assert.deepStrictEqual(
    await availabilityMutationState(page),
    {},
    `${lang}: failed cell persistence rolls back state`
  );
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '4', stopped: false },
    `${lang}: failed cell persistence does not change the matrix`
  );
  await restoreLocalStorageWrites(page);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilityMutationState(page),
    {},
    `${lang}: failed cell write stays absent after reload`
  );
  assert.deepStrictEqual(await availabilitySnapshot(page, availabilityId), { text: '4', stopped: false });
  await openAvailabilityEditor(page, availabilityId);
  await page.$eval('[data-availability-cell-units]', input => {
    input.value = '3';
  });
  await page.click('[form="availability-cell-form"]');
  await page.waitForFunction(
    () => document.querySelector('#availability-cell-sheet').getAttribute('aria-hidden') === 'true'
  );
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '3', stopped: false },
    `${lang}: 4 → 3`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '3', stopped: false },
    `${lang}: numeric value survives reload`
  );

  await clickRoute(page, '.mobile-bottom-nav a[href*="m-dashboard"]');
  await clickRoute(page, '.mobile-bottom-nav a[href*="m-availability"]');
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '3', stopped: false },
    `${lang}: numeric value survives navigation`
  );

  const otherLanguage = lang === 'en' ? 'cs' : 'en';
  await clickRoute(page, `.langswitch a[data-lang="${otherLanguage}"]`);
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '3', stopped: false },
    `${lang}: numeric value survives language switch`
  );
  await clickRoute(page, `.langswitch a[data-lang="${lang}"]`);

  await setAvailabilityUnits(page, availabilityId, 0);
  await page.waitForFunction(
    () => document.querySelector('#availability-cell-sheet').getAttribute('aria-hidden') === 'true'
  );
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '0', stopped: false },
    `${lang}: numeric zero stays distinct`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '0', stopped: false },
    `${lang}: numeric zero survives reload`
  );

  await openAvailabilityEditor(page, availabilityId);
  await page.select('[data-availability-cell-action]', 'stopSell');
  assert.strictEqual(
    await page.$eval('[data-availability-cell-units-field]', node => node.hidden),
    true,
    `${lang}: stop sell is a separate action`
  );
  await page.click('[form="availability-cell-form"]');
  await page.waitForFunction(
    () => document.querySelector('#availability-cell-sheet').getAttribute('aria-hidden') === 'true'
  );
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '×', stopped: true },
    `${lang}: stop sell uses ×`
  );
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '×', stopped: true },
    `${lang}: stop sell survives reload`
  );

  await page.evaluate(() => globalThis.localStorage.clear());
  await assertRestrictedAvailability(page, origin, screen, { access: 'read' }, `${lang} read-only`);
  await page.evaluate(() => globalThis.localStorage.clear());
  await assertRestrictedAvailability(page, origin, screen, { connection: 'chm' }, `${lang} Channel Manager`);
}

async function assertReviewPagesLayout(page, origin, viewport) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await open(page, origin, 'm-dashboard.html');
  await page.keyboard.press('Tab');

  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('.proto-tools');
    if (panel.classList.contains('mini')) panel.querySelector('.pt-min').click();
    const pages = panel.querySelector('.pt-pages');
    pages.scrollIntoView({ block: 'nearest' });
    const links = [...pages.querySelectorAll(':scope > a.pt-b')];
    const ordinarySwitch = panel.querySelector('.pt-sw');
    const ordinaryButtons = [...ordinarySwitch.querySelectorAll(':scope > .pt-b')];
    const panelRect = panel.getBoundingClientRect();
    const pagesRect = pages.getBoundingClientRect();

    return {
      labels: links.map(link => link.textContent.trim()),
      layout: links.map(link => {
        link.focus();
        const rect = link.getBoundingClientRect();
        const style = getComputedStyle(link);
        return {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          clientWidth: link.clientWidth,
          scrollWidth: link.scrollWidth,
          clientHeight: link.clientHeight,
          scrollHeight: link.scrollHeight,
          fullWidth: Math.abs(rect.width - pagesRect.width) <= 1,
          active: document.activeElement === link,
          focusVisible: link.matches(':focus-visible'),
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
        };
      }),
      pagesDisplay: getComputedStyle(pages).display,
      panelInsideViewport: panelRect.left >= 0 && panelRect.right <= window.innerWidth,
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ordinaryDirection: getComputedStyle(ordinarySwitch).flexDirection,
      ordinaryTops: ordinaryButtons.map(button => button.getBoundingClientRect().top),
      ordinaryUsable: ordinaryButtons.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }),
    };
  });

  const label = `${viewport.width}x${viewport.height} review pages`;
  assert.deepStrictEqual(metrics.labels, ['Changelog', 'Use cases', 'Comments'], `${label}: destinations`);
  assert.strictEqual(metrics.layout.length, 3, `${label}: three independent links`);
  metrics.layout.forEach((link, index) => {
    assert(link.width > 0 && link.height >= 44, `${label}: link ${index + 1} readable touch dimensions`);
    assert(link.clientWidth >= link.scrollWidth, `${label}: link ${index + 1} no text overflow`);
    assert(link.clientHeight >= link.scrollHeight, `${label}: link ${index + 1} no vertical text overflow`);
    assert(link.fullWidth, `${label}: link ${index + 1} fills its row`);
    assert(link.active && link.focusVisible, `${label}: link ${index + 1} keyboard focusable`);
    assert(link.outlineStyle !== 'none' && link.outlineWidth >= 2, `${label}: link ${index + 1} visible focus outline`);
    if (index > 0) {
      assert(link.top > metrics.layout[index - 1].top, `${label}: strictly increasing link tops`);
      assert(link.top >= metrics.layout[index - 1].bottom, `${label}: links do not overlap`);
    }
  });
  assert(metrics.panelInsideViewport, `${label}: panel stays inside viewport`);
  assert(metrics.panelOverflow <= 0, `${label}: panel has no horizontal overflow`);
  assert(metrics.documentOverflow <= 0, `${label}: document has no horizontal overflow`);
  assert.strictEqual(metrics.pagesDisplay, 'grid', `${label}: dedicated vertical layout`);
  assert.strictEqual(metrics.ordinaryDirection, 'row', `${label}: ordinary switch stays horizontal`);
  assert(metrics.ordinaryUsable, `${label}: ordinary switch controls remain usable`);
  assert(
    metrics.ordinaryTops.every(top => Math.abs(top - metrics.ordinaryTops[0]) <= 1),
    `${label}: ordinary switch remains one row`
  );
}

async function main() {
  assert(fs.existsSync(chromePath), `Chrome not found at ${chromePath}`);
  const { server, origin } = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

  try {
    for (const viewport of [
      { width: 1280, height: 844 },
      { width: 390, height: 844 },
    ]) {
      await assertReviewPagesLayout(page, origin, viewport);
    }
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

    for (const screen of screens) {
      await open(page, origin, screen);
      const result = await page.evaluate(() => {
        const header = document.querySelector('.mobile-header').getBoundingClientRect();
        const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
        const notification = document.querySelector('[data-open-sheet="notification-sheet"]').getBoundingClientRect();
        return {
          viewport: document.body.dataset.viewport,
          navItems: document.querySelectorAll('.mobile-bottom-nav a').length,
          activeItems: document.querySelectorAll('.mobile-bottom-nav a.active').length,
          bodyWidth: document.body.scrollWidth,
          headerHeight: Math.round(header.height),
          navHeight: Math.round(nav.height),
          notificationRight: Math.round(notification.right),
          hasPanel: Boolean(document.querySelector('.proto-tools')),
          panelText: document.querySelector('.proto-tools')?.textContent || '',
          productCopy: document.documentElement.outerHTML,
        };
      });
      assert.strictEqual(result.viewport, 'mobile', `${screen}: viewport contract`);
      assert.strictEqual(result.navItems, 5, `${screen}: bottom-nav destinations`);
      assert.strictEqual(result.activeItems, 1, `${screen}: one active destination`);
      assert(result.bodyWidth <= 390, `${screen}: no horizontal overflow (${result.bodyWidth})`);
      assert.strictEqual(result.headerHeight, 56, `${screen}: app header height`);
      assert.strictEqual(result.navHeight, 64, `${screen}: bottom navigation height`);
      assert(result.notificationRight <= 390, `${screen}: notification inside viewport`);
      assert(result.hasPanel, `${screen}: floating debug panel`);
      assert.match(result.panelText, /Use cases/);
      assert.match(result.panelText, /Comments/);
      assert.match(result.panelText, /Changelog/);
      assert.doesNotMatch(result.productCopy, /demo|ukáz|DEMO-/i, `${screen}: no prototype-framing markers`);

      await page.click('[data-open-sheet="notification-sheet"]');
      await page.waitForSelector('#notification-sheet.open');
      await page.waitForFunction(() => document.querySelector('#notification-sheet').contains(document.activeElement));
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => document.querySelector('#notification-sheet').getAttribute('aria-hidden') === 'true'
      );
      assert(
        await page.evaluate(() => document.activeElement.matches('[data-open-sheet="notification-sheet"]')),
        `${screen}: notification focus returns to bell`
      );
    }

    await open(page, origin, 'm-dashboard.html', { nopanel: '1' });
    const exportViewport = await page.evaluate(async () => {
      const hadExportLayout = document.body.dataset.export === '1';
      delete document.body.dataset.export;
      await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const navigation = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
      return {
        hadExportLayout,
        hasPanel: Boolean(document.querySelector('.proto-tools')),
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        navigationBottom: Math.round(navigation.bottom),
      };
    });
    assert.deepStrictEqual(
      {
        hadExportLayout: exportViewport.hadExportLayout,
        hasPanel: exportViewport.hasPanel,
        viewportHeight: exportViewport.viewportHeight,
        navigationBottom: exportViewport.navigationBottom,
      },
      { hadExportLayout: true, hasPanel: false, viewportHeight: 844, navigationBottom: 844 }
    );
    assert(exportViewport.scrollHeight > 844, 'capture keeps naturally scrollable content');

    const dashboardRoutes = {
      'kpi-arrivals': ['reservations', 'queue', 'arrivals'],
      'kpi-departures': ['reservations', 'queue', 'departures'],
      'kpi-rooms': ['availability'],
      'kpi-approvals': ['billing', 'billingFilter', 'pending'],
      'task-billing': ['billing', 'billingFilter', 'pending'],
      'task-changes': ['more', 'section', 'changes'],
      'task-availability': ['availability'],
      'offer-package': ['rate-edit', 'offer', 'cajkovskij-stay'],
    };
    for (const lang of ['', '-en']) {
      const dashboard = `m-dashboard${lang}.html`;
      await open(page, origin, dashboard);
      const sizes = await page.$$eval('[data-dashboard-action]', nodes =>
        nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return { id: node.dataset.dashboardAction, width: rect.width, height: rect.height };
        })
      );
      assert.strictEqual(sizes.length, 8, `${dashboard}: complete dashboard action set`);
      sizes.forEach(item => assert(item.width >= 44 && item.height >= 44, `${item.id}: touch target >=44`));

      for (const [id, expected] of Object.entries(dashboardRoutes)) {
        await open(page, origin, dashboard);
        await clickRoute(page, `[data-dashboard-action="${id}"]`);
        const route = await currentRoute(page);
        assert.strictEqual(route.page, `m-${expected[0]}${lang}.html`, `${id}: destination`);
        if (expected[1]) assert.strictEqual(route.query[expected[1]], expected[2], `${id}: state`);
      }

      const reservations = `m-reservations${lang}.html`;
      await open(page, origin, reservations);
      await clickRoute(page, 'a[href*="reservation=RSV-10477"]');
      assert.deepStrictEqual(
        await page.evaluate(() => ({
          id: document.querySelector('[data-reservation-field="id"]').textContent.trim(),
          guest: document.querySelector('[data-reservation-field="guest"]').textContent.trim(),
          missing: document.body.dataset.identityStatus,
        })),
        { id: 'RSV-10477', guest: 'Petr Dvořák', missing: 'found' },
        `${lang || 'cs'} reservation identity`
      );
      await open(page, origin, `m-reservation-detail${lang}.html`, { reservation: 'RSV-DOES-NOT-EXIST' });
      assert.strictEqual(
        await page.$eval('.identity-missing', node => node.hidden),
        false,
        'unknown reservation is explicit'
      );

      await open(page, origin, reservations, { queue: 'arrivals' });
      await waitForCount(page, '[data-reservation-count]', 4);
      await open(page, origin, reservations, { queue: 'departures' });
      await waitForCount(page, '[data-reservation-count]', 3);

      const availability = `m-availability${lang}.html`;
      await open(page, origin, availability);
      const availabilityIdentity = await page.$$eval('.availability-cell', cells => ({
        count: cells.length,
        keys: cells.map(cell => cell.dataset.availabilityId),
        complete: cells.every(cell => cell.dataset.roomTypeId && cell.dataset.dateId),
      }));
      assert.strictEqual(availabilityIdentity.count, 60, `${availability}: complete room/date coverage`);
      assert.strictEqual(new Set(availabilityIdentity.keys).size, 60, `${availability}: unique room/date ids`);
      assert(availabilityIdentity.complete, `${availability}: every cell carries room type and date ids`);
      await assertSingleAvailabilityFlow(page, origin, lang ? 'en' : 'cs');
      await assertBulkAvailabilityFlow(page, origin, lang ? 'en' : 'cs');

      const offers = `m-offer${lang}.html`;
      const offerCounts = { all: 4, active: 3, spa: 2, missing: 1 };
      await open(page, origin, offers);
      for (const [filter, count] of Object.entries(offerCounts)) {
        await page.click(`[data-offer-filter="${filter}"]`);
        await waitForCount(page, '[data-offer-count]', count);
        assert.strictEqual((await currentRoute(page)).query.offerFilter, filter, `${filter}: URL state`);
      }
      for (const offer of ['cajkovskij-stay', 'wellness-weekend', 'spa-week', 'break-for-two']) {
        await open(page, origin, offers);
        const expectedTitle = await page.$eval(`[data-offer-id="${offer}"] h2`, node => node.textContent.trim());
        await clickRoute(page, `[data-offer-id="${offer}"] a[href*="offer="]`);
        const route = await currentRoute(page);
        assert.strictEqual(route.query.offer, offer, `${offer}: exact offer query`);
        assert.strictEqual(
          await page.$eval('[data-offer-field="title"]', node => node.textContent.trim()),
          expectedTitle
        );
      }
      await open(page, origin, `m-rate-edit${lang}.html`, { offer: 'spa-week', section: 'rates' });
      assert.deepStrictEqual(
        await page.evaluate(() => ({
          editorHidden: document.querySelector('[data-package-editor-surface]').hidden,
          ratesHidden: document.querySelector('[data-package-rates-surface]').hidden,
        })),
        { editorHidden: true, ratesHidden: false },
        `${lang || 'cs'}: rates route keeps the package editor surface hidden`
      );
      assert.strictEqual(
        await page.$eval('[data-package-rates-surface] .section-head h2', node => node.textContent.trim()),
        lang ? 'Package prices by room type' : 'Ceny balíčku podle typu pokoje',
        `${lang || 'cs'}: package price heading`
      );
      const rateRelation = await page.$$eval('.rate-matrix tbody tr', rows => ({
        visibleRoomTypeIds: rows.filter(row => !row.hidden).map(row => row.dataset.roomTypeId),
        firstValues: rows.filter(row => !row.hidden).map(row => row.querySelector('input').value),
        readOnly: rows
          .filter(row => !row.hidden)
          .every(row => [...row.querySelectorAll('input')].every(input => input.readOnly)),
      }));
      assert.deepStrictEqual(
        rateRelation.visibleRoomTypeIds,
        ['double', 'deluxe-double', 'suite', 'single', 'family'],
        `${lang || 'cs'}: selected package room-type eligibility`
      );
      assert.deepStrictEqual(
        rateRelation.firstValues,
        ['14200', '14900', '16100', '13600', '17400'],
        `${lang || 'cs'}: selected package prices by room type`
      );
      assert.strictEqual(rateRelation.readOnly, true, `${lang || 'cs'}: package rates are read-only`);
      assert.strictEqual(await page.$('[data-save-rates]'), null, `${lang || 'cs'}: no pretend rate save`);
      assert.strictEqual(
        await page.$eval('[data-rate-edit-link]', link => new URL(link.href).searchParams.get('offer')),
        'spa-week',
        `${lang || 'cs'}: rates route returns to the exact package editor`
      );
      assert.match(
        await page.$eval('[data-package-inventory-note]', node => node.textContent),
        lang
          ? /Package content does not change room inventory.*limits sales/s
          : /Obsah balíčku nemění dostupnost pokojů.*omezuje prodej/s,
        `${lang || 'cs'}: inventory-sale relationship`
      );
      await open(page, origin, `m-rate-edit${lang}.html`, { offer: 'unknown-offer' });
      assert.strictEqual(
        await page.$eval('.identity-missing', node => node.hidden),
        false,
        'unknown offer is explicit'
      );

      await assertPackageDraftFlow(page, origin, lang ? 'en' : 'cs');
      await assertPackageEditorFlow(page, origin, lang ? 'en' : 'cs');

      const billing = `m-billing${lang}.html`;
      const billingCounts = { pending: 3, approved: 1, disputed: 1 };
      await open(page, origin, billing);
      for (const [filter, count] of Object.entries(billingCounts)) {
        await page.click(`[data-billing-filter="${filter}"]`);
        await waitForCount(page, '[data-billing-count]', count);
      }
      await page.click('[data-billing-filter="pending"]');
      await waitForCount(page, '[data-billing-count]', 3);
      await page.click('.billing-card:not([hidden]) [data-approval]');
      await waitForCount(page, '[data-billing-count]', 2);

      const more = `m-more${lang}.html`;
      await open(page, origin, more);
      const visibleTiles = await page.$$eval(
        '[data-more-id]',
        nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length
      );
      assert.strictEqual(visibleTiles, 14, `${more}: full access sees 14 tiles`);
      const sheetTiles = [
        'gallery',
        'profile',
        'price-list',
        'invoices',
        'payment-documents',
        'contract',
        'users',
        'permissions',
        'settings',
        'changes',
        'help',
      ];
      for (const id of sheetTiles) {
        const selector = `[data-more-id="${id}"]`;
        await page.$eval(selector, node => node.click());
        const sheetId = await page.$eval(selector, node => node.dataset.openSheet);
        await page.waitForSelector(`#${sheetId}.open`);
        await page.waitForFunction(
          sheet => document.querySelector('#' + sheet).contains(document.activeElement),
          {},
          sheetId
        );
        await page.keyboard.press('Escape');
        await page.waitForFunction(
          sheet => document.getElementById(sheet).getAttribute('aria-hidden') === 'true',
          {},
          sheetId
        );
        assert.strictEqual(
          await page.evaluate(() => document.activeElement.dataset.moreId),
          id,
          `${id}: focus restored`
        );
      }
      const routeTiles = {
        rooms: [`m-availability${lang}.html`, null, null],
        billing: [`m-billing${lang}.html`, 'billingFilter', 'pending'],
        'channel-manager': [`m-availability${lang}.html`, 'connection', 'chm'],
      };
      for (const [id, expected] of Object.entries(routeTiles)) {
        await open(page, origin, more);
        await clickRoute(page, `[data-more-id="${id}"]`);
        const route = await currentRoute(page);
        assert.strictEqual(route.page, expected[0], `${id}: route outcome`);
        if (expected[1]) assert.strictEqual(route.query[expected[1]], expected[2], `${id}: route state`);
      }

      await open(page, origin, more, { access: 'read' });
      assert.strictEqual(
        await page.$$eval(
          '[data-more-id]',
          nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length
        ),
        12,
        `${more}: read access hides privileged tiles`
      );
      await page.$eval('[data-more-id="settings"]', node => node.click());
      assert.strictEqual(
        await page.$eval('[form="settings-sheet-form"]', node => node.disabled),
        true,
        'read access cannot save settings'
      );
    }

    await open(page, origin, 'm-dashboard.html');
    await page.click('.mobile-brand');
    await page.click('#property-sheet [data-state-value="test"]');
    await page.waitForFunction(() => document.body.dataset.hotel === 'test');
    assert.strictEqual((await currentRoute(page)).query.hotel, 'test', 'property outcome updates URL');
    assert(
      await page.evaluate(() => document.activeElement.classList.contains('mobile-brand')),
      'property focus returns'
    );

    await open(page, origin, 'm-more.html', { auth: 'out' });
    await page.click('.signed-out-wall [data-state-key="auth"]');
    await page.waitForFunction(() => document.body.dataset.auth === 'in');
    assert.strictEqual(
      await page.$eval('.product-surface', node => getComputedStyle(node).display !== 'none'),
      true,
      'auth CTA enters app'
    );

    await open(page, origin, 'm-availability.html', { connection: 'chm' });
    assert.strictEqual(await page.$eval('[data-chm-write]', node => node.disabled), true, 'CHM disables local writes');

    assert.deepStrictEqual(pageErrors, [], `browser page errors: ${pageErrors.join(' | ')}`);
    assert.deepStrictEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join(' | ')}`);
    process.stdout.write(
      `mobile-browser-qa: HTTP, ${screens.length} screens, CZ/EN click matrix, identities, filters, focus and roles — OK\n`
    );
  } finally {
    await page.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  process.stderr.write(`mobile-browser-qa: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
