// Every text key the code asks for must exist in content.en.json, so the UI never shows "[key]".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from './helpers.js';
import { lookup } from '../src/core/i18n.js';
import { SCREENS } from '../src/core/rules.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const data = loadData();

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (p.endsWith('.js')) yield p;
  }
}

describe('content keys', () => {
  it('every literal t(...) key used in the source exists in content.en.json', () => {
    const missing = [];
    const re = /\bt(?:\.list|\.has|\.raw)?\(\s*['`]([A-Za-z0-9_.]+)['`]/g;
    for (const file of files(root)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(re)) {
        if (lookup(data.content, m[1]) === undefined) missing.push(`${file.slice(root.length + 1)}: ${m[1]}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  it('every screen has a title, subtitle and footer; the planning screens have a "pick first" hint', () => {
    for (const id of SCREENS) {
      for (const k of ['title', 'subtitle', 'footer']) {
        assert.equal(typeof lookup(data.content, `screen.${id}.${k}`), 'string', `screen.${id}.${k}`);
      }
    }
    for (const id of ['briefing', 'orbit', 'payload', 'spacecraft', 'launch']) {
      assert.equal(typeof lookup(data.content, `screen.${id}.pickFirst`), 'string', id);
    }
  });

  it('dynamic key families exist: validation messages, insights, effects, review checks', () => {
    const codes = ['missingPriority', 'missingOrbit', 'noPayload', 'missingBus', 'missingPower', 'missingComm', 'missingLauncher', 'budgetExceeded', 'launcherTooSmall', 'busOverloaded', 'powerDeficit', 'orbitIncompatible', 'lowPowerMargin', 'batteryShort', 'downlinkShort', 'overflowRisk', 'scienceBelowTarget', 'lowReliability'];
    for (const c of codes) {
      assert.equal(typeof lookup(data.content, `validation.${c}.message`), 'string', c);
      assert.equal(typeof lookup(data.content, `validation.${c}.action`), 'string', c);
    }
    for (const type of ['powerGenerationMultiplier', 'instrumentAvailabilityMultiplier', 'downlinkMultiplier', 'scienceOpportunityMultiplier']) {
      assert.equal(typeof lookup(data.content, `screen.simulation.effect.${type}`), 'string', type);
    }
    for (const c of ['choices', 'budget', 'mass', 'orbit', 'power', 'data', 'science', 'reliability']) {
      assert.equal(typeof lookup(data.content, `screen.review.check.${c}`), 'string', c);
    }
    for (const c of ['priority', 'orbitHelped', 'orbitHurt', 'dataLost', 'dataUnsent', 'dataClean', 'backlogMonths', 'powerLimited', 'powerClean', 'batteryShort', 'batteryOk', 'eventNegative', 'eventPositive', 'eventNone', 'budget', 'reliabilityRisk']) {
      assert.equal(typeof lookup(data.content, `insight.${c}`), 'string', c);
    }
    for (const c of ['nominal', 'lowPower', 'backlog', 'overflow', 'eventStart', 'batteryLimit']) {
      assert.equal(typeof lookup(data.content, `screen.simulation.note.${c}`), 'string', c);
    }
  });
});
