#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenNames = [
  'dashboard',
  'reservations',
  'reservation-detail',
  'availability',
  'offer',
  'rate-edit',
  'billing',
  'more',
];

function assertFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error('Missing prototype screen: ' + path.relative(root, file));
  }
}

function captureJobs() {
  return screenNames.map(name => ({
    page: 'm-' + name + '.html',
    output: 'preview-m-' + name + '.png',
    width: 390,
  }));
}

async function pageHeight(page) {
  return page.evaluate(() => {
    const body = document.body;
    const doc = document.documentElement;
    return Math.ceil(
      Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        doc ? doc.clientHeight : 0,
        doc ? doc.scrollHeight : 0,
        doc ? doc.offsetHeight : 0
      )
    );
  });
}

async function capture(browser, job) {
  const input = path.join(root, job.page);
  const output = path.join(root, job.output);
  const temporary = output + '.tmp-' + process.pid;
  assertFile(input);

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: job.width, height: 1200, deviceScaleFactor: 1 });
    const url = new URL(pathToFileURL(input).href);
    url.searchParams.set('nopanel', '1');
    await page.goto(url.href, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    const height = await pageHeight(page);
    if (!Number.isFinite(height) || height < 1 || height > 20000) {
      throw new Error(job.page + ' produced an invalid full-page height: ' + height);
    }
    await page.setViewport({ width: job.width, height, deviceScaleFactor: 1 });
    await page.screenshot({ path: temporary, type: 'png', fullPage: false });
    fs.renameSync(temporary, output);
    process.stdout.write('captured ' + job.output + ' (' + job.width + ' × ' + height + ')\n');
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    await page.close();
  }
}

async function main() {
  const jobs = captureJobs();
  jobs.forEach(job => assertFile(path.join(root, job.page)));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    for (const job of jobs) await capture(browser, job);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write('capture-previews: ' + error.message + '\n');
  process.exitCode = 1;
});
