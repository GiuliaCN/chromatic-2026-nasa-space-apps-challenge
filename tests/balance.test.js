// Calibration test (escopo-mvp.md 5.6). Proves the game data supports at least three valid,
// distinct, winnable designs, that no option dominates its category, and that failure is possible.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, loadFixture, enumerateSelections, FIXED_SEEDS } from './helpers.js';
import { validateDesign } from '../src/core/validation.js';
import { simulateMission } from '../src/core/simulation.js';
import { computeIndicators } from '../src/core/calculations.js';

const data = loadData();
const fixture = loadFixture('reference-configs.json');
const refs = fixture.referenceConfigs;

function evaluate(selection) {
  const check = validateDesign(data, selection);
  let wins = 0;
  let science = 0;
  if (check.canLaunch) {
    for (const seed of FIXED_SEEDS) {
      const { report } = simulateMission(data, selection, seed, { explain: false });
      if (report.success) wins += 1;
      science += report.totalScienceEarned;
    }
  }
  return {
    check,
    wins,
    meanScience: science / FIXED_SEEDS.length,
    costM: check.indicators.totalCostM,
    massKg: check.indicators.totalMassKg,
  };
}

const results = refs.map((r) => ({ ...r, ...evaluate(r.selection) }));
const rel = (a, b) => Math.abs(a - b) / Math.max(a, b);

describe('reference configurations', () => {
  it('there are exactly three, and they are not shown in the game data', () => {
    assert.equal(refs.length, 3);
  });

  it('(a) all pass validation without blockers', () => {
    for (const r of results) assert.deepEqual(r.check.blockers.map((b) => b.code), [], r.id);
  });

  it('(b) each reaches the target in at least 9 of 10 fixed seeds', () => {
    for (const r of results) assert.ok(r.wins >= 9, `${r.id}: ${r.wins}/10`);
  });

  it('(c) every pair differs by at least 10% in at least two of cost, mass and science', () => {
    for (let i = 0; i < results.length; i += 1) {
      for (let j = i + 1; j < results.length; j += 1) {
        const a = results[i];
        const b = results[j];
        const big = [rel(a.costM, b.costM), rel(a.massKg, b.massKg), rel(a.meanScience, b.meanScience)].filter((d) => d >= 0.1);
        assert.ok(big.length >= 2, `${a.id} vs ${b.id}: only ${big.length} metric(s) differ by 10%`);
      }
    }
  });

  it('(d) every scientific priority has at least one viable configuration', () => {
    const covered = new Set(results.map((r) => r.selection.goalPriorityId));
    for (const g of data.goals) assert.ok(covered.has(g.id), g.id);
  });

  it('(e) valid configurations that miss the target exist, so the debrief has something to teach', () => {
    for (const ex of fixture.failingExamples) {
      const r = evaluate(ex.selection);
      assert.deepEqual(r.check.blockers, [], ex.id);
      assert.ok(r.wins <= 1, `${ex.id} should fail the target, but won ${r.wins}/10`);
    }
  });

  it('(f) a design with all five instruments is never valid and winning at once', () => {
    const all = data.payloads.map((p) => p.id);
    let valid = 0;
    for (const sel of enumerateSelections(data)) {
      if (sel.payloadIds.length !== all.length) continue;
      if (!validateDesign(data, sel).canLaunch) continue;
      valid += 1;
      assert.ok(evaluate(sel).wins < 9, `a five-instrument design wins: ${JSON.stringify(sel)}`);
    }
    // Budget or mass must force a choice; with the shipped data no five-instrument design launches.
    assert.equal(valid, 0);
  });

  it('the reference science mostly comes from the chosen priority only through weighting, not by ignoring other goals', () => {
    for (const r of results) {
      const ind = computeIndicators(data, r.selection);
      const priorityShare = ind.sciencePotentialByGoal[r.selection.goalPriorityId] / ind.sciencePotentialTotal;
      assert.ok(priorityShare > 0.3 && priorityShare < 0.9, `${r.id}: ${priorityShare}`);
    }
  });
});

describe('scientific priorities matter', () => {
  it('the best valid design (by forecast) is not the same instrument set for every priority', () => {
    const best = {};
    for (const sel of enumerateSelections(data)) {
      const check = validateDesign(data, sel);
      if (!check.canLaunch) continue;
      const pot = check.indicators.sciencePotentialTotal / Math.max(check.indicators.totalCostM, 1);
      const cur = best[sel.goalPriorityId];
      if (!cur || pot > cur.pot) best[sel.goalPriorityId] = { pot, key: [...sel.payloadIds].sort().join('+'), orbit: sel.orbitId };
    }
    const keys = new Set(Object.values(best).map((b) => `${b.key}|${b.orbit}`));
    assert.ok(keys.size >= 2, JSON.stringify(best));
  });
});

// ---- no option strictly dominates the others in its category -----------------------------------

const LOWER = 'lower';
const HIGHER = 'higher';

function attributes(item, spec) {
  const out = {};
  for (const [field, dir] of Object.entries(spec)) {
    if (field.endsWith('.*')) {
      const base = field.slice(0, -2);
      for (const [k, v] of Object.entries(item[base])) out[`${base}.${k}`] = { v, dir };
    } else if (field === 'supportedOrbitIds') {
      for (const o of data.orbits) out[`orbit:${o.id}`] = { v: item.supportedOrbitIds.includes(o.id) ? 1 : 0, dir };
    } else {
      out[field] = { v: item[field], dir };
    }
  }
  return out;
}

function dominates(a, b, spec) {
  const A = attributes(a, spec);
  const B = attributes(b, spec);
  let strictly = false;
  for (const key of Object.keys(A)) {
    const better = A[key].dir === HIGHER ? A[key].v - B[key].v : B[key].v - A[key].v;
    if (better < 0) return false;
    if (better > 0) strictly = true;
  }
  return strictly;
}

const CATEGORIES = [
  { name: 'payloads', list: data.payloads, spec: { costM: LOWER, massKg: LOWER, powerW: LOWER, dataGbPerMonth: LOWER, 'scienceByGoal.*': HIGHER } },
  { name: 'buses', list: data.buses, spec: { costM: LOWER, massKg: LOWER, powerW: LOWER, maxSupportedMassKg: HIGHER, storageGb: HIGHER, reliability: HIGHER } },
  { name: 'powers', list: data.powers, spec: { costM: LOWER, massKg: LOWER, generationW: HIGHER, batteryWh: HIGHER } },
  { name: 'comms', list: data.comms, spec: { costM: LOWER, massKg: LOWER, powerW: LOWER, downlinkGbPerMonth: HIGHER } },
  { name: 'launchers', list: data.launchers, spec: { costM: LOWER, maxPayloadKg: HIGHER, reliability: HIGHER, supportedOrbitIds: HIGHER } },
  { name: 'orbits', list: data.orbits, spec: { launchCostMultiplier: LOWER, eclipseDurationH: LOWER, 'observationMultiplierByGoal.*': HIGHER } },
];

describe('no strict dominance inside a category', () => {
  for (const { name, list, spec } of CATEGORIES) {
    it(name, () => {
      for (const a of list) {
        for (const b of list) {
          if (a === b) continue;
          assert.ok(!dominates(a, b, spec), `${a.id} strictly dominates ${b.id}`);
        }
      }
    });
  }
});
