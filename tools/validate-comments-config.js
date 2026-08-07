#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { validateCommentsConfig } = require('./comments.js');

const root = path.resolve(__dirname, '..');
const configPath = path.resolve(root, process.argv[2] || 'comments.config.json');
const schemaPath = path.join(root, 'comments.config.schema.json');

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

try {
  validateCommentsConfig(readJson(configPath, 'comments config'), readJson(schemaPath, 'comments config schema'));
  process.stdout.write(`comments config valid: ${path.basename(configPath)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
