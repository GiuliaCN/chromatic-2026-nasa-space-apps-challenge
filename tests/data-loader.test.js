import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadBundle, createBundle } from '../src/core/data-loader.js';
import { validateConfig } from '../src/core/config-validator.js';

const urlOf = (f) => `mem://${f}`;
const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

describe('data-loader failure handling', () => {
  it('turns a network failure into a friendly error instead of crashing', async () => {
    const failing = async () => { throw new Error('offline'); };
    await assert.rejects(loadBundle(failing, urlOf), /Could not download game\.json \(offline\)/);
  });

  it('reports HTTP errors', async () => {
    const notFound = async () => ({ ok: false, status: 404, json: async () => ({}) });
    await assert.rejects(loadBundle(notFound, urlOf), /HTTP 404/);
  });

  it('reports invalid JSON', async () => {
    const bad = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } });
    await assert.rejects(loadBundle(bad, urlOf), /not valid JSON/);
  });

  it('an empty or wrong document yields validation errors, not exceptions', async () => {
    const bundle = await loadBundle(async () => okResponse({}), urlOf);
    const result = validateConfig(bundle);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
    assert.doesNotThrow(() => createBundle({ goals: 5, orbits: null }));
  });
});
