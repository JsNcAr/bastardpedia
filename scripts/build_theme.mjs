#!/usr/bin/env node
/**
 * Build the theme CSS from design-tokens.json into src/styles/theme-tokens.css.
 *
 * One style, two themes (light and dark). The dark block is emitted both under
 * [data-theme="dark"] and under prefers-color-scheme, guarded so an explicit
 * light choice wins over the operating system (scripts/build_tokens.mjs).
 *
 * Usage: node scripts/build_theme.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
process.chdir(ROOT);
mkdirSync('src/styles', { recursive: true });
execFileSync(
  'node',
  [
    'scripts/build_tokens.mjs',
    '--in',
    'design-tokens.json',
    '--out',
    'src/styles/theme-tokens.css',
  ],
  {
    stdio: 'inherit',
  },
);
