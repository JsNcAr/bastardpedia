// @vitest-environment node
import { brotliDecompressSync, gunzipSync, zstdDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { MIN_BYTES, shouldCompress, sidecars } from './compress-core.mjs';

describe('precompression', () => {
  it('picks text files of a useful size and skips fonts, images and sidecars', () => {
    expect(shouldCompress('dist/assets/index-abc.js', 50_000)).toBe(true);
    expect(shouldCompress('dist/data/catalog.json', 1_000_000)).toBe(true);
    expect(shouldCompress('dist/index.html', 2_000)).toBe(true);
    expect(shouldCompress('dist/index.html', MIN_BYTES - 1)).toBe(false);
    expect(shouldCompress('dist/assets/inter.woff2', 50_000)).toBe(false);
    expect(shouldCompress('dist/icon-512.png', 9_000)).toBe(false);
    expect(shouldCompress('dist/assets/index-abc.js.br', 50_000)).toBe(false);
  });

  it('writes sidecars that decompress to the original', () => {
    const text = Buffer.from('Behind the Bastards '.repeat(500));
    const out = Object.fromEntries(sidecars(text).map((v) => [v.ext, v.data]));
    expect(brotliDecompressSync(out['.br'])).toEqual(text);
    expect(zstdDecompressSync(out['.zst'])).toEqual(text);
    expect(gunzipSync(out['.gz'])).toEqual(text);
  });

  it('drops sidecars that save too little', () => {
    const random = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 2654435761) % 251));
    expect(sidecars(random).length).toBeLessThanOrEqual(3);
    for (const v of sidecars(random)) expect(v.data.length).toBeLessThan(random.length);
  });
});
