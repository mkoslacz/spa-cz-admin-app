#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const { previewFrameIds } = require('./artifact-integrity.js');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const manifestPath = path.join(root, 'prototype.json');

function assertFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error('Missing prototype screen: ' + path.relative(root, file));
  }
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(label + ' must be a positive integer');
  return number;
}

function captureJobs(manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))) {
  const frames = (manifest.rows || []).flatMap(row => row.frames || []);
  const byId = new Map(frames.map(frame => [frame.id, frame]));
  return previewFrameIds(manifest).map(id => {
    const frame = byId.get(id);
    if (!frame) throw new Error('Missing declared preview frame: ' + id);
    const page = String(frame.page || '').split('?')[0];
    return {
      page,
      output: 'preview-' + id + '.png',
      ...dimensionsForPage(page, frames, manifest),
    };
  });
}

function dimensionsForPage(page, frames, manifest) {
  const frame = frames.find(candidate => String(candidate.page || '').split('?')[0] === page) || {};
  return {
    width: positiveInteger(frame.width ?? manifest.width, page + ' viewport width'),
    height: positiveInteger(frame.height ?? manifest.height, page + ' viewport height'),
  };
}

async function restoreInteractiveLayout(page) {
  await page.evaluate(() => {
    delete document.body.dataset.export;
  });
  await page.evaluate(
    () => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))
  );
}

async function capture(browser, job) {
  const input = path.join(root, job.page);
  const output = path.join(root, job.output);
  const temporary = output + '.tmp-' + process.pid;
  assertFile(input);

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: 1 });
    const url = new URL(pathToFileURL(input).href);
    url.searchParams.set('nopanel', '1');
    await page.goto(url.href, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await restoreInteractiveLayout(page);
    await page.screenshot({ path: temporary, type: 'png', fullPage: false, captureBeyondViewport: false });
    fs.renameSync(temporary, output);
    process.stdout.write('captured ' + job.output + ' (' + job.width + ' × ' + job.height + ')\n');
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

if (require.main === module) {
  main().catch(error => {
    process.stderr.write('capture-previews: ' + error.message + '\n');
    process.exitCode = 1;
  });
}

module.exports = {
  capture,
  captureJobs,
  dimensionsForPage,
  positiveInteger,
  restoreInteractiveLayout,
};
