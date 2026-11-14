import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, SAMPLE_SELECTION } from './helpers.js';
import { validateDesign } from '../src/core/validation.js';

const data = loadData();
const codes = (list) => list.map((x) => x.code);
const check = (patch) => validateDesign(data, { ...SAMPLE_SELECTION, ...patch });

describe('validation', () => {
  it('a sound design has no blockers and can launch', () => {
    const v = check({});
    assert.deepEqual(codes(v.blockers), []);
    assert.equal(v.canLaunch, true);
  });

  it('blocks when no instrument is selected', () => {
    assert.ok(codes(check({ payloadIds: [] }).blockers).includes('noPayload'));
  });

  it('blocks when a mandatory subsystem or the priority is missing', () => {
    const v = check({ busId: null, powerId: null, communicationId: null, launcherId: null, orbitId: null, goalPriorityId: null });
    for (const code of ['missingBus', 'missingPower', 'missingComm', 'missingLauncher', 'missingOrbit', 'missingPriority']) {
      assert.ok(codes(v.blockers).includes(code), code);
    }
    assert.equal(v.canLaunch, false);
  });

  it('blocks when the budget is exceeded', () => {
    const v = check({
      payloadIds: ['multispectral-camera', 'thermal-sensor', 'atmospheric-spectrometer', 'synthetic-aperture-radar', 'lidar'],
      busId: 'heavy-bus',
      powerId: 'large-array',
      communicationId: 'ka-band',
      launcherId: 'titan-x',
    });
    assert.ok(codes(v.blockers).includes('budgetExceeded'));
  });

  it('blocks when the total mass exceeds the launcher capacity', () => {
    assert.ok(codes(check({ launcherId: 'sparrow-1' }).blockers).includes('launcherTooSmall'));
  });

  it('blocks when payload + power + comm exceed the bus capacity', () => {
    const v = check({ busId: 'light-bus' });
    assert.ok(codes(v.blockers).includes('busOverloaded'));
    assert.equal(v.blockers.find((b) => b.code === 'busOverloaded').step, 'spacecraft');
  });

  it('blocks when generation is below the nominal demand, even with a large battery', () => {
    const v = check({ powerId: 'compact-array', payloadIds: ['multispectral-camera', 'thermal-sensor', 'synthetic-aperture-radar'], busId: 'standard-bus' });
    assert.ok(codes(v.blockers).includes('powerDeficit'));
  });

  it('blocks a launcher that cannot reach the orbit', () => {
    const v = check({ launcherId: 'sparrow-1', orbitId: 'sun-synchronous', payloadIds: ['lidar'], busId: 'light-bus', powerId: 'compact-array' });
    assert.ok(codes(v.blockers).includes('orbitIncompatible'));
    assert.equal(v.blockers.find((b) => b.code === 'orbitIncompatible').step, 'launch');
  });

  it('warnings never block the launch', () => {
    const v = check({ communicationId: 'uhf-link' });
    assert.deepEqual(codes(v.blockers), []);
    assert.ok(codes(v.warnings).includes('downlinkShort'));
    assert.equal(v.canLaunch, true);
  });

  it('warns about low reliability, short battery and low science', () => {
    const v = check({ launcherId: 'sparrow-1', busId: 'light-bus', powerId: 'compact-array', payloadIds: ['lidar'] });
    assert.deepEqual(codes(v.blockers), []);
    assert.ok(codes(v.warnings).includes('lowReliability'));
    assert.ok(codes(v.warnings).includes('scienceBelowTarget'));
    const batt = check({ powerId: 'compact-array' });
    assert.ok(codes(batt.warnings).includes('batteryShort'));
  });

  it('every message carries a localized text, an action and the step to fix it', () => {
    const v = check({ payloadIds: [], launcherId: 'sparrow-1' });
    for (const item of [...v.blockers, ...v.warnings]) {
      assert.ok(item.message && !item.message.startsWith('['), item.code);
      assert.ok(item.action && !item.action.startsWith('['), item.code);
      assert.ok(item.step, item.code);
    }
  });
});
