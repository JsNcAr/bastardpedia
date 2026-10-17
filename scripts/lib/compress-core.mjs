/**
 * Precompression for the static build: which files get sidecars, and the
 * sidecars themselves. Caddy serves them with `file_server { precompressed }`,
 * so no response is compressed at request time (docs/DEPLOYMENT.md).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync, zstdCompressSync } from 'node:zlib';

/** Text formats worth compressing. Fonts and images are already compressed. */
export const COMPRESSIBLE = new Set([
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.webmanifest',
  '.txt',
  '.xml',
  '.ico',
]);

/** Below this size a sidecar saves too little to be worth a file. */
export const MIN_BYTES = 1024;

/** A sidecar must be at least this much smaller than the original to be kept. */
export const MIN_SAVING = 0.05;

const SIDECAR = /\.(br|zst|gz)$/;

export function shouldCompress(path, size) {
  if (SIDECAR.test(path) || size < MIN_BYTES) return false;
  const dot = path.lastIndexOf('.');
  return dot >= 0 && COMPRESSIBLE.has(path.slice(dot).toLowerCase());
}

/** Returns the sidecars worth writing: [{ ext, data }]. */
export function sidecars(buf) {
  const variants = [
    {
      ext: '.br',
      data: brotliCompressSync(buf, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
        },
      }),
    },
    {
      ext: '.zst',
      data: zstdCompressSync(buf, { params: { [constants.ZSTD_c_compressionLevel]: 19 } }),
    },
    { ext: '.gz', data: gzipSync(buf, { level: 9 }) },
  ];
  return variants.filter((v) => v.data.length <= buf.length * (1 - MIN_SAVING));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Writes sidecars for every eligible file under dir. Returns totals for logging. */
export function compressDir(dir) {
  let files = 0;
  let before = 0;
  let after = 0;
  for (const path of [...walk(dir)]) {
    const size = statSync(path).size;
    if (!shouldCompress(path, size)) continue;
    const out = sidecars(readFileSync(path));
    for (const { ext, data } of out) writeFileSync(path + ext, data);
    const br = out.find((v) => v.ext === '.br');
    files++;
    before += size;
    after += br ? br.data.length : size;
  }
  return { files, before, after };
}
