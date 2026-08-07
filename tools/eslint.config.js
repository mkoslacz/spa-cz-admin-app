'use strict';

/**
 * This package intentionally stays dependency-light: Node's native test runner
 * supplies the behavioral lane, while this focused rule set catches unsafe
 * JavaScript states without imposing a style migration on copied prototypes.
 */
module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        AbortController: 'readonly',
        Buffer: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        XMLSerializer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        btoa: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        unescape: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
    },
  },
];
