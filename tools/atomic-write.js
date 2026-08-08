'use strict';

const fs = require('fs');
const path = require('path');

function writeAtomically(file, contents, fileSystem = fs) {
  fileSystem.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fileSystem.writeFileSync(temporary, contents, 'utf8');
    fileSystem.renameSync(temporary, file);
  } finally {
    if (fileSystem.existsSync(temporary)) fileSystem.unlinkSync(temporary);
  }
}

module.exports = { writeAtomically };
