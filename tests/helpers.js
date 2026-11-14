import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DATA_FILES, createBundle } from '../src/core/data-loader.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Parsed JSON documents straight from public/data. Fresh copy on each call (safe to mutate). */
export function loadRaw() {
  const raw = {};
  for (const [key, file] of Object.entries(DATA_FILES)) {
    raw[key] = JSON.parse(readFileSync(join(root, 'public', 'data', file), 'utf8'));
  }
  return raw;
}

export function loadData() {
  return createBundle(loadRaw());
}

export function loadFixture(name) {
  return JSON.parse(readFileSync(join(root, 'tests', 'fixtures', name), 'utf8'));
}
