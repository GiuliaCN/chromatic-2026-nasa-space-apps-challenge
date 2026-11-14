import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, loadModifiedData, SAMPLE_SELECTION, FIXED_SEEDS } from './helpers.js';
import { simulateMission } from '../src/core/simulation.js';
import { computeIndicators } from '../src/core/calculations.js';

const data = loadData();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

/** Same data, but with no random events and a custom comm / bus so flows are easy to predict. */
const quiet = (mutate) =>
  loadModifiedData((raw) => {
    raw.game.eventChancePerMonth = 0;
    mutate?.(raw);
  });
const setComm = (raw, downlinkGbPerMonth) => (raw.spacecraft.comms.find((c) => c.id === 'x-band').downlinkGbPerMonth = downlinkGbPerMonth);
const setStorage = (raw, gb) => (raw.spacecraft.buses.find((b) => b.id === 'standard-bus').storageGb = gb);

describe('timeline shape and determinism', () => {
  it('produces exactly 24 monthly records', () => {
    const { timeline } = simulateMission(data, SAMPLE_SELECTION, 42);
    assert.equal(timeline.length, 24);
    assert.deepEqual(timeline.map((m) => m.month), Array.from({ length: 24 }, (_, i) => i + 1));
    for (const m of timeline) {
      for (const key of ['activeEventIds', 'powerMarginW', 'dataGeneratedGb', 'dataTransmittedGb', 'dataLostGb', 'scienceCreditedByGoal', 'cumulativeScience', 'notes']) {
        assert.ok(key in m, key);
      }
    }
  });

  it('same snapshot + same seed gives an identical result', () => {
    const a = simulateMission(data, SAMPLE_SELECTION, 987654);
    const b = simulateMission(data, SAMPLE_SELECTION, 987654);
    assert.deepEqual(a, b);
  });

  it('different seeds can give different results', () => {
    const totals = new Set(FIXED_SEEDS.map((s) => simulateMission(data, SAMPLE_SELECTION, s, { explain: false }).report.totalScienceEarned.toFixed(6)));
    assert.ok(totals.size > 1);
  });

  it('refuses to simulate a design with launch blockers', () => {
    assert.throws(() => simulateMission(data, { ...SAMPLE_SELECTION, payloadIds: [] }, 1), /blockers/);
  });

  it('success means total science >= target', () => {
    for (const seed of FIXED_SEEDS) {
      const { report } = simulateMission(data, SAMPLE_SELECTION, seed);
      assert.equal(report.success, report.totalScienceEarned >= data.game.targetSciencePoints);
    }
  });
});

describe('data flow, buffer and science credit', () => {
  it('credits all science in the same month when the downlink keeps up', () => {
    const d = quiet();
    const { timeline, report } = simulateMission(d, SAMPLE_SELECTION, 1);
    for (const m of timeline) {
      near(m.dataTransmittedGb, m.dataGeneratedGb);
      near(m.scienceCredited, m.scienceObserved);
      assert.equal(m.dataLostGb, 0);
    }
    near(report.totalScienceEarned, computeIndicators(d, SAMPLE_SELECTION).sciencePotentialTotal);
  });

  it('credits science only in the month data is transmitted, in proportion to what was sent', () => {
    const d = quiet((raw) => setComm(raw, 110)); // data is 330/month, downlink 110/month
    const { timeline } = simulateMission(d, SAMPLE_SELECTION, 1);
    const m1 = timeline[0];
    near(m1.dataTransmittedGb, 110);
    near(m1.scienceCredited, m1.scienceObserved * (110 / 330));
    assert.ok(m1.bufferGb > 0); // the rest waits in the buffer, uncredited
    const m2 = timeline[1];
    // Month 2 credits 110/550 of everything in the buffer (month 1 leftovers + month 2 production).
    near(m2.scienceCredited, (m1.scienceObserved * (220 / 330) + m2.scienceObserved) * (110 / 550));
  });

  it('science is conserved: earned + lost + unsent equals observed', () => {
    const d = quiet((raw) => {
      setComm(raw, 150);
      setStorage(raw, 600);
    });
    const { timeline, report } = simulateMission(d, SAMPLE_SELECTION, 1);
    const observed = timeline.reduce((s, m) => s + m.scienceObserved, 0);
    near(report.totalScienceEarned + report.scienceLost + report.scienceUnsent, observed);
    assert.ok(report.scienceLost > 0 && report.scienceUnsent > 0);
  });

  it('loses data to overflow, and lost data never produces science', () => {
    const d = quiet((raw) => {
      setComm(raw, 100);
      setStorage(raw, 200);
    });
    const { timeline, report } = simulateMission(d, SAMPLE_SELECTION, 1);
    const m1 = timeline[0];
    near(m1.dataLostGb, 330 - 100 - 200); // 30 GB do not fit in the 200 GB buffer
    assert.ok(report.dataLostGb > 0);
    assert.ok(report.scienceLost > 0);
    for (const m of timeline) assert.ok(m.bufferGb <= 200 + 1e-9);
    // Everything generated is transmitted, lost or still unsent.
    near(report.dataTransmittedGb + report.dataLostGb + report.dataUnsentGb, report.dataGeneratedGb);
  });

  it('data left in the buffer after month 24 is not credited', () => {
    const d = quiet((raw) => setComm(raw, 0));
    const { report } = simulateMission(d, SAMPLE_SELECTION, 1);
    assert.equal(report.totalScienceEarned, 0);
    assert.equal(report.dataTransmittedGb, 0);
    assert.equal(report.success, false);
  });

  it('a power shortfall under events lowers the operating fraction, never below zero', () => {
    const d = loadModifiedData((raw) => {
      raw.game.eventChancePerMonth = 1;
      raw.events.events = raw.events.events.filter((e) => e.id === 'solar-storm');
      raw.spacecraft.powers.find((p) => p.id === 'compact-array').generationW = 330;
    });
    const sel = { ...SAMPLE_SELECTION, powerId: 'compact-array', payloadIds: ['multispectral-camera', 'thermal-sensor'] };
    const { timeline } = simulateMission(d, sel, 5);
    assert.ok(timeline.some((m) => m.operatingFraction < 1));
    assert.ok(timeline.every((m) => m.operatingFraction >= 0 && m.operatingFraction <= 1));
  });

  it('an under-sized battery reduces observing time every month', () => {
    const full = simulateMission(quiet(), SAMPLE_SELECTION, 1).report.totalScienceEarned;
    const weak = simulateMission(quiet(), { ...SAMPLE_SELECTION, powerId: 'compact-array', orbitId: 'equatorial' }, 1).report.totalScienceEarned;
    assert.ok(weak < full);
  });
});

describe('events', () => {
  const run = (seed, sel = SAMPLE_SELECTION) => simulateMission(data, sel, seed, { explain: false });

  it('never triggers events whose conditions are not met', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 150; seed += 1) for (const e of run(seed).report.events) seen.add(e.eventId);
    assert.ok(!seen.has('deforestation-surge')); // priority is wildfires
    assert.ok(!seen.has('haze-episode'));
    assert.ok(!seen.has('clear-skies')); // orbit is equatorial
    assert.ok(!seen.has('solar-degradation')); // power margin is wide
    assert.ok(seen.has('major-wildfire')); // thermal sensor is on board
  });

  it('events last their configured duration (clamped to the mission end)', () => {
    const { report } = run(2024);
    for (const e of report.events) {
      const def = data.byId.events.get(e.eventId);
      assert.equal(e.endMonth, Math.min(e.startMonth + def.durationMonths - 1, 24));
    }
  });

  it('lower reliability makes negative events more likely', () => {
    const share = (sel) => {
      let neg = 0;
      let all = 0;
      for (let seed = 1; seed <= 300; seed += 1) {
        for (const e of run(seed, sel).report.events) {
          all += 1;
          if (e.kind === 'negative') neg += 1;
        }
      }
      return neg / all;
    };
    const reliable = share({ ...SAMPLE_SELECTION, launcherId: 'titan-x', busId: 'heavy-bus' });
    const risky = share({ ...SAMPLE_SELECTION, launcherId: 'condor-m', busId: 'standard-bus', payloadIds: ['thermal-sensor', 'lidar'], powerId: 'standard-array' });
    assert.ok(Number.isFinite(reliable) && Number.isFinite(risky));
    assert.ok(reliable < risky);
  });

  it('reports the exact science impact of each event instance', () => {
    const { report } = simulateMission(data, SAMPLE_SELECTION, 4242);
    for (const e of report.events) assert.ok(Number.isFinite(e.scienceImpact));
    for (const e of report.events) {
      if (e.kind === 'positive') assert.ok(e.scienceImpact >= -1e-9);
      if (e.kind === 'negative') assert.ok(e.scienceImpact <= 1e-9);
    }
  });
});

describe('report', () => {
  it('explains at least two concrete impacts of the player choices, with real text', () => {
    const { report } = simulateMission(data, SAMPLE_SELECTION, 31337);
    assert.ok(report.insights.length >= 2);
    for (const i of report.insights) {
      assert.ok(i.text && !i.text.startsWith('['), i.code);
      assert.ok(['helped', 'hurt', 'info'].includes(i.kind));
    }
  });

  it('reports data loss in the insights when storage overflows', () => {
    const d = quiet((raw) => {
      setComm(raw, 100);
      setStorage(raw, 200);
    });
    const { report } = simulateMission(d, SAMPLE_SELECTION, 1);
    assert.ok(report.insights.some((i) => i.code === 'dataLost' && i.kind === 'hurt'));
  });

  it('includes seed, cost and per-goal science', () => {
    const { report } = simulateMission(data, SAMPLE_SELECTION, 77);
    assert.equal(report.seed, 77);
    assert.ok(report.costM > 0 && report.costM <= data.game.budgetM);
    near(Object.values(report.scienceByGoal).reduce((a, b) => a + b, 0), report.totalScienceEarned);
  });
});
