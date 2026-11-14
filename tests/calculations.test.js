import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, loadModifiedData, SAMPLE_SELECTION } from './helpers.js';
import { computeIndicators } from '../src/core/calculations.js';

const data = loadData();
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const item = (list, id) => list.find((x) => x.id === id);

describe('cost and mass', () => {
  const ind = computeIndicators(data, SAMPLE_SELECTION);
  const orbit = item(data.orbits, 'equatorial');

  it('sums cost exactly once, scaling only the launcher by the orbit multiplier', () => {
    const payloadCost = ['multispectral-camera', 'thermal-sensor', 'atmospheric-spectrometer']
      .map((id) => item(data.payloads, id).costM)
      .reduce((a, b) => a + b, 0);
    const expected =
      item(data.buses, 'standard-bus').costM +
      payloadCost +
      item(data.powers, 'standard-array').costM +
      item(data.comms, 'x-band').costM +
      item(data.launchers, 'condor-m').costM * orbit.launchCostMultiplier +
      data.game.operationsCostM;
    near(ind.totalCostM, expected);
    near(ind.budgetRemainingM, data.game.budgetM - expected);
  });

  it('changing the orbit changes only the launch cost portion', () => {
    const sso = computeIndicators(data, { ...SAMPLE_SELECTION, orbitId: 'sun-synchronous' });
    const launcher = item(data.launchers, 'condor-m');
    const ssoOrbit = item(data.orbits, 'sun-synchronous');
    near(sso.totalCostM - ind.totalCostM, launcher.costM * (ssoOrbit.launchCostMultiplier - orbit.launchCostMultiplier));
  });

  it('total mass includes the bus; supported load does not', () => {
    const payloadMass = ['multispectral-camera', 'thermal-sensor', 'atmospheric-spectrometer']
      .map((id) => item(data.payloads, id).massKg)
      .reduce((a, b) => a + b, 0);
    const power = item(data.powers, 'standard-array').massKg;
    const comm = item(data.comms, 'x-band').massKg;
    const bus = item(data.buses, 'standard-bus').massKg;
    near(ind.supportedLoadKg, payloadMass + power + comm);
    near(ind.totalMassKg, payloadMass + power + comm + bus);
  });

  it('treats missing picks as zero without throwing', () => {
    const empty = computeIndicators(data, {});
    near(empty.totalMassKg, 0);
    near(empty.totalCostM, data.game.operationsCostM);
  });
});

describe('power and battery', () => {
  it('computes demand and margin from payload, comm and bus', () => {
    const ind = computeIndicators(data, SAMPLE_SELECTION);
    const demand = 70 + 60 + 55 + item(data.comms, 'x-band').powerW + item(data.buses, 'standard-bus').powerW;
    near(ind.totalPowerDemandW, demand);
    near(ind.powerMarginW, item(data.powers, 'standard-array').generationW - demand);
  });

  it('the battery covers eclipse only and never compensates a generation deficit', () => {
    // Huge battery, tiny generation: coverage is full yet the margin stays negative.
    const modified = loadModifiedData((raw) => {
      const p = raw.spacecraft.powers.find((x) => x.id === 'compact-array');
      p.generationW = 100;
      p.batteryWh = 100000;
    });
    const ind = computeIndicators(modified, { ...SAMPLE_SELECTION, powerId: 'compact-array' });
    assert.equal(ind.batteryCoverage, 1);
    assert.ok(ind.powerMarginW < 0);
  });

  it('computes battery coverage against the eclipse energy need', () => {
    const sel = { ...SAMPLE_SELECTION, powerId: 'compact-array' };
    const ind = computeIndicators(data, sel);
    const need = ind.totalPowerDemandW * item(data.orbits, 'equatorial').eclipseDurationH;
    near(ind.eclipseEnergyNeedWh, need);
    near(ind.batteryCoverage, Math.min(1, 150 / need));
    assert.ok(ind.batteryCoverage < 1);
  });
});

describe('data', () => {
  it('computes production and downlink margin; the orbit does not change data volume', () => {
    const a = computeIndicators(data, SAMPLE_SELECTION);
    const b = computeIndicators(data, { ...SAMPLE_SELECTION, orbitId: 'leo' });
    near(a.payloadDataGbPerMonth, 150 + 120 + 60);
    near(a.downlinkMarginGbPerMonth, 400 - 330);
    near(a.payloadDataGbPerMonth, b.payloadDataGbPerMonth);
    near(a.storageGb, item(data.buses, 'standard-bus').storageGb);
  });
});

describe('science potential', () => {
  const sel = SAMPLE_SELECTION;
  it('weights the priority goal and applies the orbit multiplier', () => {
    const ind = computeIndicators(data, sel);
    const goal = item(data.goals, 'wildfires');
    const orbit = item(data.orbits, 'equatorial');
    near(ind.sciencePotentialByGoal.wildfires, (8 + 11 + 3) * orbit.observationMultiplierByGoal.wildfires * goal.priorityMultiplier);
    near(ind.sciencePotentialByGoal.deforestation, (10 + 2 + 0) * orbit.observationMultiplierByGoal.deforestation);
    near(ind.sciencePotentialByGoal.airQuality, (2 + 2 + 12) * orbit.observationMultiplierByGoal.airQuality);
  });

  it('changing the orbit changes the science forecast', () => {
    const a = computeIndicators(data, sel).sciencePotentialTotal;
    const b = computeIndicators(data, { ...sel, orbitId: 'sun-synchronous' }).sciencePotentialTotal;
    assert.notEqual(a, b);
  });

  it('adding an instrument raises the forecast; removing one lowers it', () => {
    const base = computeIndicators(data, sel).sciencePotentialTotal;
    const more = computeIndicators(data, { ...sel, payloadIds: [...sel.payloadIds, 'lidar'] }).sciencePotentialTotal;
    const fewer = computeIndicators(data, { ...sel, payloadIds: sel.payloadIds.slice(1) }).sciencePotentialTotal;
    assert.ok(more > base && fewer < base);
  });

  it('changing the scientific priority changes the weights and the forecast', () => {
    const fire = computeIndicators(data, sel);
    const air = computeIndicators(data, { ...sel, goalPriorityId: 'airQuality' });
    assert.notEqual(fire.sciencePotentialTotal, air.sciencePotentialTotal);
    assert.ok(fire.sciencePotentialByGoal.wildfires > air.sciencePotentialByGoal.wildfires);
    assert.ok(air.sciencePotentialByGoal.airQuality > fire.sciencePotentialByGoal.airQuality);
  });

  it('mission reliability is launcher times bus reliability', () => {
    const ind = computeIndicators(data, sel);
    near(ind.missionReliability, item(data.launchers, 'condor-m').reliability * item(data.buses, 'standard-bus').reliability);
  });
});
