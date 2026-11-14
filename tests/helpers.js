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

/** Load the data, let the caller mutate the raw JSON, and rebuild the bundle. */
export function loadModifiedData(mutate) {
  const raw = loadRaw();
  mutate(raw);
  return createBundle(raw);
}

export function loadFixture(name) {
  return JSON.parse(readFileSync(join(root, 'tests', 'fixtures', name), 'utf8'));
}

export const FIXED_SEEDS = [11, 222, 3333, 44444, 555555, 6666666, 77, 888, 9999, 123456];

/** Every combination of choices (instrument subsets x orbit x priority x subsystems x launcher). */
export function* enumerateSelections(data) {
  const ids = (list) => list.map((x) => x.id);
  const payloadIds = ids(data.payloads);
  for (let mask = 1; mask < 1 << payloadIds.length; mask += 1) {
    const chosen = payloadIds.filter((_, i) => mask & (1 << i));
    for (const goalPriorityId of ids(data.goals))
      for (const orbitId of ids(data.orbits))
        for (const busId of ids(data.buses))
          for (const powerId of ids(data.powers))
            for (const communicationId of ids(data.comms))
              for (const launcherId of ids(data.launchers))
                yield { goalPriorityId, orbitId, payloadIds: chosen, busId, powerId, communicationId, launcherId };
  }
}

/** A small, readable valid selection used by unit tests. */
export const SAMPLE_SELECTION = {
  goalPriorityId: 'wildfires',
  orbitId: 'equatorial',
  payloadIds: ['multispectral-camera', 'thermal-sensor', 'atmospheric-spectrometer'],
  busId: 'standard-bus',
  powerId: 'standard-array',
  communicationId: 'x-band',
  launcherId: 'condor-m',
};
