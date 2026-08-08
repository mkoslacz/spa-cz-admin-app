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
    return {
      disabled,
      sheetOpen: document.querySelector('#availability-cell-sheet').classList.contains('open'),
    };
  }, availabilityId);
  assert.strictEqual(bypass.disabled, true, `${label}: cell control disabled`);
  assert.strictEqual(bypass.sheetOpen, false, `${label}: runtime handler refuses editor`);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepStrictEqual(
    await availabilitySnapshot(page, availabilityId),
    { text: '4', stopped: false },
    `${label}: forced runtime submit does not persist`
  );
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
      await open(page, origin, `m-rate-edit${lang}.html`, { offer: 'spa-week' });
      assert.strictEqual(
        await page.$eval('.section-head h2', nodes => nodes.textContent.trim()),
        lang ? 'Package prices by room type' : 'Ceny balíčku podle typu pokoje',
        `${lang || 'cs'}: package price heading`
      );
      const rateRelation = await page.$$eval('.rate-matrix tbody tr', rows => ({
        visibleRoomTypeIds: rows.filter(row => !row.hidden).map(row => row.dataset.roomTypeId),
        firstValues: rows.filter(row => !row.hidden).map(row => row.querySelector('input').value),
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

      await open(page, origin, offers);
      await page.click('[data-open-sheet="new-package-sheet"]');
      await page.click('[form="new-package-sheet-form"]');
      await page.waitForFunction(
        () => document.querySelector('#new-package-sheet').getAttribute('aria-hidden') === 'true'
      );
      assert(await page.$eval('.toast', node => node.classList.contains('show') && node.textContent.length > 20));

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
