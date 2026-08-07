#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
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

function url(screen, query = '') {
  return pathToFileURL(path.join(root, screen)).href + query;
}

async function open(page, screen, query = '') {
  await page.goto(url(screen, query), { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function main() {
  assert(fs.existsSync(chromePath), `Chrome not found at ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

  try {
    for (const screen of screens) {
      await open(page, screen);
      const result = await page.evaluate(() => {
        const header = document.querySelector('.mobile-header').getBoundingClientRect();
        const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
        const notification = document.querySelector('.mobile-header .header-button').getBoundingClientRect();
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
        };
      });
      assert.strictEqual(result.viewport, 'mobile', `${screen}: viewport contract`);
      assert.strictEqual(result.navItems, 5, `${screen}: bottom-nav destinations`);
      assert.strictEqual(result.activeItems, 1, `${screen}: one active destination`);
      assert(result.bodyWidth <= 390, `${screen}: no document-level horizontal overflow (${result.bodyWidth})`);
      assert.strictEqual(result.headerHeight, 56, `${screen}: app header height`);
      assert.strictEqual(result.navHeight, 64, `${screen}: bottom navigation height`);
      assert(result.notificationRight <= 390, `${screen}: notification remains inside viewport`);
      assert(result.hasPanel, `${screen}: floating debug panel`);
      assert.match(result.panelText, /Use cases/);
      assert.match(result.panelText, /Comments/);
      assert.match(result.panelText, /Changelog/);
      assert.doesNotMatch(result.panelText, /Desktop|View/);
    }

    await open(page, 'm-reservations.html', '?inv=none');
    assert.deepStrictEqual(
      await page.evaluate(() => ({
        count: document.querySelector('[data-result-count]').textContent.trim(),
        empty: getComputedStyle(document.querySelector('.empty-state')).display,
        list: getComputedStyle(document.querySelector('.inventory-content')).display,
      })),
      { count: '0 ukázkových rezervací', empty: 'grid', list: 'none' }
    );

    await open(page, 'm-reservations.html', '?inv=some');
    assert.deepStrictEqual(
      await page.evaluate(() => ({
        count: document.querySelector('[data-result-count]').textContent.trim(),
        visible: [...document.querySelectorAll('.reservation-card')].filter(card => getComputedStyle(card).display !== 'none').length,
      })),
      { count: '3 ukázkové rezervace', visible: 3 }
    );

    await open(page, 'm-more.html', '?auth=out');
    const signedOut = await page.evaluate(() => ({
      wall: getComputedStyle(document.querySelector('.signed-out-wall')).display,
      product: getComputedStyle(document.querySelector('.product-surface')).display,
      heading: document.querySelector('.signed-out-wall h1').textContent.trim(),
    }));
    assert.deepStrictEqual(signedOut, { wall: 'grid', product: 'none', heading: 'Odhlášený ukázkový účet' });

    await open(page, 'm-more.html', '?auth=in&access=none');
    assert.strictEqual(await page.$eval('.access-wall', node => getComputedStyle(node).display), 'grid');

    await open(page, 'm-availability.html', '?auth=in&access=full&connection=chm');
    const chm = await page.evaluate(() => ({
      disabled: document.querySelector('[data-write-action]').disabled,
      badgeRight: Math.round(document.querySelector('.connection-pill').getBoundingClientRect().right),
      notificationRight: Math.round(document.querySelector('.mobile-header .header-button').getBoundingClientRect().right),
    }));
    assert.strictEqual(chm.disabled, true);
    assert(chm.badgeRight < chm.notificationRight, 'CHM badge must not cover the notification action');
    assert(chm.notificationRight <= 390, 'notification must remain inside the mobile viewport');

    await open(page, 'm-rate-edit.html', '?auth=in&access=full&connection=manual');
    await page.evaluate(() => {
      document.body.dataset.access = 'read';
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.deepStrictEqual(
      await page.evaluate(() => ({ access: document.body.dataset.access, disabled: document.querySelector('[data-write-action]').disabled })),
      { access: 'read', disabled: true }
    );

    await open(page, 'm-reservations.html', '?auth=in&access=full&connection=manual&inv=many');
    await page.click('[data-open-sheet="filter-sheet"]');
    assert.strictEqual(await page.$eval('#filter-sheet', node => node.getAttribute('aria-hidden')), 'false');
    await page.click('#filter-sheet [data-close-sheet]');
    assert.strictEqual(await page.$eval('#filter-sheet', node => node.getAttribute('aria-hidden')), 'true');

    assert.deepStrictEqual(pageErrors, [], `browser page errors: ${pageErrors.join(' | ')}`);
    process.stdout.write(`mobile-browser-qa: ${screens.length} screens + state, panel and sheet flows — OK\n`);
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(`mobile-browser-qa: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
