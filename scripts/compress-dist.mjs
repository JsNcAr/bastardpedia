#!/usr/bin/env node
/**
 * Write .br, .zst and .gz sidecars next to every compressible file in a folder.
 * `npm run build` already does this through the Vite plugin in vite.config.ts;
 * this is for compressing an existing build by hand.
 *
 * Usage: node scripts/compress-dist.mjs [dir]   (default: dist)
 */
import { relative, resolve } from 'node:path';
import { compressDir } from './lib/compress-core.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = resolve(ROOT, process.argv[2] ?? 'dist');
const { files, before, after } = compressDir(DIR);
console.log(
  `compress-dist: ${String(files)} files in ${relative(ROOT, DIR)}, ` +
    `${(before / 1024).toFixed(0)} KiB -> ${(after / 1024).toFixed(0)} KiB as brotli`,
);
