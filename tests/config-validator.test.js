import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadRaw } from './helpers.js';
import { createBundle } from '../src/core/data-loader.js';
import { validateConfig } from '../src/core/config-validator.js';

const validate = (mutate) => {
  const raw = loadRaw();
  mutate?.(raw);
  return validateConfig(createBundle(raw));
};
const joined = (r) => r.errors.join('\n');

describe('config-validator', () => {
  it('accepts the shipped data files', () => {
    const r = validate();
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });

  it('rejects duplicate ids', () => {
    const r = validate((raw) => raw.payloads.payloads.push({ ...raw.payloads.payloads[0] }));
    assert.equal(r.ok, false);
    assert.match(joined(r), /duplicates id/);
  });

  it('rejects negative numbers', () => {
    const r = validate((raw) => (raw.payloads.payloads[0].massKg = -5));
    assert.match(joined(r), /massKg/);
  });

  it('rejects launchers that reference unknown orbits', () => {
    const r = validate((raw) => raw.launchers.launchers[0].supportedOrbitIds.push('mars'));
    assert.match(joined(r), /unknown orbit id "mars"/);
  });

  it('rejects unknown effect and condition types', () => {
    const r1 = validate((raw) => (raw.events.events[0].effects[0].type = 'magicMultiplier'));
    assert.match(joined(r1), /unknown type "magicMultiplier"/);
    const r2 = validate((raw) => (raw.events.events[0].conditions[0].type = 'moonIsFull'));
    assert.match(joined(r2), /unknown type "moonIsFull"/);
  });

  it('rejects event effects below minEffectMultiplier', () => {
    const r = validate((raw) => (raw.events.events[0].effects[0].value = 0.1));
    assert.match(joined(r), /below minEffectMultiplier/);
  });

  it('rejects condition values that reference unknown ids', () => {
    const r = validate((raw) => (raw.events.events[4].conditions[0].value = 'warp-drive'));
    assert.match(joined(r), /unknown instrument "warp-drive"/);
  });

  it('rejects missing text keys', () => {
    const r = validate((raw) => (raw.payloads.payloads[0].nameKey = 'payload.nope.name'));
    assert.match(joined(r), /not found in content/);
  });

  it('rejects orbit goal maps that miss a goal', () => {
    const r = validate((raw) => delete raw.orbits.orbits[0].observationMultiplierByGoal.airQuality);
    assert.match(joined(r), /observationMultiplierByGoal\.airQuality/);
  });

  it('requires every sound effect the UI plays', () => {
    const r = validate((raw) => (raw.audio.effects = raw.audio.effects.filter((e) => e.id !== 'purchase')));
    assert.match(joined(r), /effect "purchase" is missing/);
  });

  it('rejects sound files outside public/ (absolute paths, external URLs, "..")', () => {
    for (const src of ['https://example.com/a.mp3', '//cdn.example.com/a.mp3', '/audio/a.mp3', '../secret.mp3', 'data:audio/wav;base64,AAAA']) {
      const r = validate((raw) => (raw.audio.effects[0].src = src));
      assert.match(joined(r), /relative path inside public/, src);
    }
  });

  it('rejects sound volumes outside 0 to 1', () => {
    const r = validate((raw) => (raw.audio.music[0].volume = 1.5));
    assert.match(joined(r), /"volume" must be between 0 and 1/);
  });

  it('rejects music mapped to an unknown track or screen, but accepts silence (null)', () => {
    const r1 = validate((raw) => (raw.audio.musicByScreen.orbit = 'disco'));
    assert.match(joined(r1), /musicByScreen\.orbit" must be a music id or null/);
    const r2 = validate((raw) => (raw.audio.musicByScreen.hangar = 'menu'));
    assert.match(joined(r2), /unknown screen "hangar"/);
    const r3 = validate((raw) => delete raw.audio.musicByScreen.debrief);
    assert.match(joined(r3), /musicByScreen\.debrief/);
    assert.equal(validate((raw) => (raw.audio.musicByScreen.review = null)).ok, true);
  });

  it('requires credits with title, author, license and url', () => {
    const r = validate((raw) => delete raw.audio.credits[0].license);
    assert.match(joined(r), /"credits" must be a list/);
  });

  it('does not throw on a completely broken bundle', () => {
    assert.doesNotThrow(() => validateConfig(null));
    assert.doesNotThrow(() => validateConfig(createBundle({})));
    assert.equal(validateConfig(createBundle({})).ok, false);
  });
});
